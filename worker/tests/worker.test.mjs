import assert from 'node:assert/strict';
import worker from '../src/index.js';

const originalFetch = globalThis.fetch;
const allowedOrigin = 'https://sunjija.github.io';
const env = {
  ANTHROPIC_API_KEY: 'test-key-not-a-real-secret',
  ANTHROPIC_MODEL: 'claude-haiku-4-5',
  ALLOWED_ORIGINS: `${allowedOrigin},http://127.0.0.1:4173`
};

let upstreamPayload = null;
let upstreamCalls = 0;
let upstreamResultOverride = null;

globalThis.fetch = async (_url, init) => {
  upstreamCalls += 1;
  upstreamPayload = JSON.parse(init.body);
  const phase = JSON.parse(upstreamPayload.messages[0].content.trim().split('\n').at(-1)).phase;
  const result = upstreamResultOverride || (phase === 'after_story'
    ? {
        route: 'ask_moment',
        moduleId: 'concrete_moment',
        question: '어떤 순간이 가장 오래 남았나요?',
        lead: '사건 전체보다 마음이 멈춰 있던 장면 하나를 골라봐요.',
        label: '오래 남은 순간',
        placeholder: '예: 기다리고 있다고 말했는데도 답이 없던 순간',
        extractedMoment: ''
      }
    : {
        eventQuote: '연락을 기다렸어요',
        momentQuote: '답이 없던 순간',
        emotionWords: ['서운함'],
        meaningQuote: '중요하지 않은 것처럼 느껴졌어요',
        needWords: ['약속']
      });
  return new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(result) }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
};

try {
  const health = await worker.fetch(new Request('https://worker.example/health'), env);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).aiConfigured, true);

  const nextResponse = await call('/v1/reflection/next', {
    consent: true,
    phase: 'after_story',
    answers: { goal: '정리하기', story: '연락을 기다렸어요' }
  });
  assert.equal(nextResponse.status, 200);
  const next = await nextResponse.json();
  assert.equal(next.mode, 'ai');
  assert.equal(next.prompt.route, 'ask_moment');
  assert.equal(next.prompt.moduleId, 'concrete_moment');
  assert.ok(Array.from(next.prompt.question).length <= 38);
  assert.equal(upstreamPayload.output_config.format.type, 'json_schema');
  assert.equal(upstreamPayload.model, 'claude-haiku-4-5');
  assert.match(upstreamPayload.system, /질문 정책 evidence-v0\.2/);
  assert.match(upstreamPayload.system, /사실로 확인하거나 편들지 않는다/);

  upstreamResultOverride = {
    route: 'ask_moment',
    moduleId: 'concrete_moment',
    question: '사용자가 적은 사건을 길게 반복하면서 구체적인 모든 상황을 다시 한번 설명해 줄 수 있는지 묻는 지나치게 긴 질문인가요?',
    lead: '너무 긴 질문이 들어오면 모바일 화면을 보호하기 위해 기본 질문으로 전환해야 합니다.',
    label: '지나치게 긴 필드 이름',
    placeholder: '지나치게 긴 예시 문장입니다.',
    extractedMoment: ''
  };
  const longCopyResponse = await call('/v1/reflection/next', {
    consent: true,
    phase: 'after_story',
    answers: { story: '대화가 끊겨서 마음이 복잡했어요.' }
  });
  const longCopy = await longCopyResponse.json();
  assert.equal(longCopy.prompt.question, '그중에서 자꾸 돌아오는 장면이 있나요?');
  assert.equal(longCopy.prompt.moduleId, 'concrete_moment');
  upstreamResultOverride = null;

  const mapResponse = await call('/v1/reflection/map', {
    consent: true,
    answers: {
      story: '어제 연락을 기다렸어요',
      moment: '답이 없던 순간',
      emotions: ['서운함', '외로움'],
      meaning: '내가 중요하지 않은 것처럼 느껴졌어요',
      needs: ['약속', '신뢰']
    }
  });
  assert.equal(mapResponse.status, 200);
  const map = await mapResponse.json();
  assert.equal(map.map.event, '연락을 기다렸어요');
  assert.deepEqual(map.map.emotions, ['서운함']);
  assert.equal(map.map.meaning, '중요하지 않은 것처럼 느껴졌어요');

  const callsBeforeSafety = upstreamCalls;
  const safetyResponse = await call('/v1/reflection/next', {
    consent: true,
    phase: 'after_story',
    answers: { story: '협박을 받아 안전하지 않아요' }
  });
  assert.equal(safetyResponse.status, 409);
  assert.equal((await safetyResponse.json()).error.code, 'SAFETY_CHECK_REQUIRED');
  assert.equal(upstreamCalls, callsBeforeSafety);

  const forbidden = await worker.fetch(new Request('https://worker.example/v1/reflection/next', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Origin: 'https://evil.example' },
    body: JSON.stringify({ consent: true, phase: 'after_story', answers: { story: 'test' } })
  }), env);
  assert.equal(forbidden.status, 403);

  const noConsent = await call('/v1/reflection/next', { phase: 'after_story', answers: { story: 'test' } });
  assert.equal(noConsent.status, 400);
  assert.equal((await noConsent.json()).error.code, 'CONSENT_REQUIRED');

  const oversized = await worker.fetch(new Request('https://worker.example/v1/reflection/next', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Origin: allowedOrigin },
    body: JSON.stringify({ consent: true, phase: 'after_story', answers: { story: '가'.repeat(7000) } })
  }), env);
  assert.equal(oversized.status, 413);
  assert.equal((await oversized.json()).error.code, 'REQUEST_TOO_LARGE');

  console.log('Worker contract tests passed');
} finally {
  globalThis.fetch = originalFetch;
}

function call(path, body) {
  return worker.fetch(new Request(`https://worker.example${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Origin: allowedOrigin },
    body: JSON.stringify(body)
  }), env);
}
