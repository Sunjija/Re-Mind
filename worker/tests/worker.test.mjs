import assert from 'node:assert/strict';
import worker from '../src/index.js';

const originalFetch = globalThis.fetch;
const allowedOrigin = 'https://sunjija.github.io';
const sessionId = '00000000-0000-4000-8000-000000000001';
const sessionRateLimiter = createRateLimiter();
const globalRateLimiter = createRateLimiter();
const env = {
  ANTHROPIC_API_KEY: 'test-key-not-a-real-secret',
  ANTHROPIC_MODEL: 'claude-haiku-4-5',
  ALLOWED_ORIGINS: `${allowedOrigin},http://127.0.0.1:4173`,
  SESSION_RATE_LIMITER: sessionRateLimiter,
  GLOBAL_RATE_LIMITER: globalRateLimiter
};

let upstreamPayload = null;
let upstreamCalls = 0;
let upstreamResultOverride = null;

globalThis.fetch = async (_url, init) => {
  upstreamCalls += 1;
  upstreamPayload = JSON.parse(init.body);
  const promptData = JSON.parse(upstreamPayload.messages[0].content.trim().split('\n').at(-1));
  const phase = promptData.phase;
  const isUnderstanding = Boolean(upstreamPayload.output_config.format.schema.properties.emotionWord);
  const result = upstreamResultOverride || (isUnderstanding
    ? {
        momentQuote: '답이 없던 순간',
        meaningQuote: '중요하지 않은 것처럼 느껴졌어요',
        emotionWord: '서운함'
      }
    : phase === 'after_story'
    ? {
        route: 'ask_moment',
        moduleId: 'concrete_moment',
        question: '어떤 순간이 가장 오래 남았나요?',
        lead: '사건 전체보다 마음이 멈춰 있던 장면 하나를 골라봐요.',
        label: '오래 남은 순간',
        placeholder: '예: 기다리고 있다고 말했는데도 답이 없던 순간',
        extractedMoment: ''
      }
    : phase === 'after_need'
      ? {
          route: 'ask_deeper',
          moduleId: 'unspoken_message',
          question: '그 순간 차마 하지 못한 말이 있나요?',
          lead: '내 안에 남은 말 하나만 적어봐요.',
          label: '하지 못한 말',
          placeholder: '예: 내 상황도 먼저 물어봐 주길 바랐어',
          extractedMoment: ''
        }
    : phase === 'after_intensity'
      ? {
          route: 'ask_meaning',
          moduleId: 'felt_meaning',
          question: '그 서운함은 어떤 뜻으로 남았나요?',
          lead: '상대의 의도가 아니라 내게 남은 뜻을 살펴봐요.',
          label: '내게 남은 뜻',
          placeholder: '예: 내 시간은 중요하지 않은 느낌이었어요',
          extractedMoment: ''
        }
    : {
        eventQuote: '연락을 기다렸어요',
        momentQuote: '답이 없던 순간',
        emotionWords: ['서운함'],
        meaningQuote: '중요하지 않은 것처럼 느껴졌어요',
        needWords: ['약속'],
        deepQuote: '말해 주길 바랐어요'
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
  assert.match(upstreamPayload.system, /질문 정책 evidence-v0\.3/);
  assert.match(upstreamPayload.system, /사실로 확인하거나 편들지 않는다/);
  assert.equal(sessionRateLimiter.calls[0], `/v1/reflection/next:${sessionId}`);
  assert.equal(globalRateLimiter.calls[0], '/v1/reflection/next');

  const preflight = await worker.fetch(new Request('https://worker.example/v1/reflection/next', {
    method: 'OPTIONS',
    headers: { Origin: allowedOrigin }
  }), env);
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers.get('access-control-allow-headers'), /X-ReMind-Session/i);
  assert.equal(preflight.headers.get('cache-control'), 'no-store');

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

  const deepResponse = await call('/v1/reflection/next', {
    consent: true,
    phase: 'after_need',
    answers: {
      story: '연락을 기다렸어요',
      moment: '답이 없던 순간',
      emotions: ['서운함'],
      meaning: '중요하지 않은 것처럼 느껴졌어요',
      needs: ['약속']
    }
  });
  const deep = await deepResponse.json();
  assert.equal(deep.prompt.route, 'ask_deeper');
  assert.equal(deep.prompt.moduleId, 'unspoken_message');
  assert.ok(Array.from(deep.prompt.question).length <= 38);

  const understandingResponse = await call('/v1/reflection/understanding', {
    consent: true,
    answers: {
      story: '어제 연락을 기다렸어요',
      moment: '답이 없던 순간',
      emotions: ['서운함', '외로움'],
      meaning: '내가 중요하지 않은 것처럼 느껴졌어요',
      needs: []
    }
  });
  assert.equal(understandingResponse.status, 200);
  const understanding = await understandingResponse.json();
  assert.equal(understanding.reflection.moment, '답이 없던 순간');
  assert.equal(understanding.reflection.emotion, '서운함');

  const mapResponse = await call('/v1/reflection/map', {
    consent: true,
    answers: {
      story: '어제 연락을 기다렸어요',
      moment: '답이 없던 순간',
      emotions: ['서운함', '외로움'],
      meaning: '내가 중요하지 않은 것처럼 느껴졌어요',
      needs: ['약속', '신뢰'],
      deepAnswer: '말해 주길 바랐어요'
    }
  });
  assert.equal(mapResponse.status, 200);
  const map = await mapResponse.json();
  assert.equal(map.map.event, '연락을 기다렸어요');
  assert.deepEqual(map.map.emotions, ['서운함']);
  assert.equal(map.map.meaning, '중요하지 않은 것처럼 느껴졌어요');
  assert.equal(map.map.deeper, '말해 주길 바랐어요');

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

  const missingSession = await worker.fetch(new Request('https://worker.example/v1/reflection/next', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Origin: allowedOrigin },
    body: JSON.stringify({ consent: true, phase: 'after_story', answers: { story: 'test' } })
  }), env);
  assert.equal(missingSession.status, 400);
  assert.equal((await missingSession.json()).error.code, 'SESSION_ID_REQUIRED');

  const callsBeforeRateLimit = upstreamCalls;
  sessionRateLimiter.allow = false;
  const rateLimited = await call('/v1/reflection/next', {
    consent: true,
    phase: 'after_story',
    answers: { story: '연락을 기다렸어요' }
  });
  assert.equal(rateLimited.status, 429);
  assert.equal(rateLimited.headers.get('retry-after'), '60');
  assert.equal((await rateLimited.json()).error.code, 'RATE_LIMITED');
  assert.equal(upstreamCalls, callsBeforeRateLimit);
  sessionRateLimiter.allow = true;

  globalRateLimiter.allow = false;
  const globallyRateLimited = await call('/v1/reflection/map', {
    consent: true,
    answers: { story: '연락을 기다렸어요' }
  });
  assert.equal(globallyRateLimited.status, 429);
  assert.equal((await globallyRateLimited.json()).error.code, 'RATE_LIMITED');
  assert.equal(upstreamCalls, callsBeforeRateLimit);
  globalRateLimiter.allow = true;

  const oversized = await worker.fetch(new Request('https://worker.example/v1/reflection/next', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Origin: allowedOrigin, 'x-remind-session': sessionId },
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
    headers: { 'content-type': 'application/json', Origin: allowedOrigin, 'x-remind-session': sessionId },
    body: JSON.stringify(body)
  }), env);
}

function createRateLimiter() {
  return {
    allow: true,
    calls: [],
    async limit({ key }) {
      this.calls.push(key);
      return { success: this.allow };
    }
  };
}
