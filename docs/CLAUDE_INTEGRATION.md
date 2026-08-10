# Claude 연동 구현·배포 안내

## 현재 구현 상태

- 프런트엔드의 AI 선택, 외부 전송 동의, 로딩, 오류 시 기본 질문 전환이 구현되어 있다.
- Cloudflare Worker의 `/v1/reflection/next`, `/v1/reflection/understanding`, `/v1/reflection/map`, `/health`가 구현되어 있다.
- Worker 계약 테스트와 로컬 모의 API를 이용한 모바일 흐름 검증이 완료되었다.
- 공개 Worker 주소와 Secret이 설정되어 GitHub Pages에서 AI 질문 모드와 기본 질문 모드를 모두 사용할 수 있다.
- 질문 생성에는 `evidence-v0.3` 정책과 단계별 허용 모듈이 항상 시스템 지침으로 포함된다.

## 구조

```text
GitHub Pages 모바일 화면
        │ 사용자가 동의한 답변만 HTTPS 전송
        ▼
Cloudflare Worker
  - 정확한 Origin 허용 목록
  - 동의·요청 크기·입력 형식 확인
  - 안전 신호는 Claude를 호출하지 않고 409 반환
  - Anthropic 키는 Secret으로만 보관
        │
        ▼
Anthropic Messages API
  - 다음 질문 하나 선택
  - 사용자 원문 안에서 지도 구절 선택
        │
        ▼
Worker가 검증한 JSON → 화면 렌더링
```

## AI가 개입하는 다섯 지점

1. 사건 서술 뒤: 이미 구체적인 장면이 있으면 중복 질문을 건너뛰고, 없으면 상황에 맞는 장면 질문 하나를 만든다.
2. 감정·강도 뒤: 상대의 의도를 묻지 않고 “그 일이 나에게 어떤 뜻으로 느껴졌는지” 묻는 질문 하나를 만든다.
3. 의미 답변 뒤: 사용자의 원문 구절과 고른 감정만 가져와 이해 확인 화면을 만들고, 사용자가 맞음·수정·모르겠음을 결정한다.
4. 사용자가 원할 때만: 중요했던 마음 뒤에 심화 질문 하나를 고른다.
5. 마음 지도 직전: 사용자가 적은 원문의 연속 구절과 사용자가 고른 감정·필요 단어만 골라 항목별로 놓는다.

Claude는 진단, 잘잘못 판정, 상대 의도 추측, 화해·이별 권유, 자동 메시지 작성, 위기 판단을 하지 않는다.

## 파일

- `outputs/counseling-test/index.html`: AI/기본 질문 선택, 동의, API 호출, 실패 시 정적 폴백
- `outputs/counseling-test/config.js`: 공개 Worker 주소만 설정
- `worker/src/index.js`: CORS, 검증, Anthropic 호출, 구조화 출력 검증
- `worker/src/reflection-policy.js`: 82개 근거를 압축한 실행 정책과 단계별 질문 모듈
- `docs/AI_QUESTION_POLICY.md`: 사람이 검토할 수 있는 질문 정책 문서
- `worker/wrangler.jsonc`: Worker 이름, 모델, Origin 설정
- `worker/tests/worker.test.mjs`: Worker 계약 테스트
- `worker/tests/mock-server.mjs`: 실제 키 없이 모바일 UI 흐름을 확인하는 로컬 API

## 비밀키 원칙

- API 키를 HTML, JavaScript, `config.js`, 문서, Git, URL, 명령줄 인자에 넣지 않는다.
- 키는 `wrangler secret put ANTHROPIC_API_KEY`의 숨김 입력창을 통해서만 등록한다.
- 채팅이나 다른 외부 채널에 한 번이라도 노출된 키는 폐기하고 새 키로 교체하는 것이 안전하다.
- Worker는 사용자의 자유 서술이나 Anthropic 응답 본문을 로그로 남기지 않는다.

## 배포

PowerShell에서 저장소 루트 기준:

```powershell
cd worker
pnpm install
pnpm exec wrangler login
pnpm exec wrangler secret put ANTHROPIC_API_KEY
pnpm exec wrangler deploy
```

배포가 반환한 주소가 `https://re-mind-reflection-api.…workers.dev`라면 다음처럼 공개 주소만 설정한다.

```js
window.REMIND_CONFIG = Object.freeze({
  aiApiBase: 'https://re-mind-reflection-api.…workers.dev'
});
```

이후 확인:

```powershell
Invoke-RestMethod https://re-mind-reflection-api.…workers.dev/health
```

`aiConfigured`가 `true`인 것을 확인한 뒤 `config.js`를 commit·push한다.

## 로컬 검증

Worker 계약 테스트:

```powershell
cd worker
pnpm test
```

실제 키 없이 프런트엔드 AI 흐름 확인:

```powershell
# 저장소 루트에서 각각 실행
python -m http.server 4173 --directory outputs
node worker/tests/mock-server.mjs
```

`http://127.0.0.1:4173/counseling-test/?api=http://127.0.0.1:8788`을 모바일 브라우저로 연다. `api` 쿼리 덮어쓰기는 localhost에서만 허용된다.

## 실패와 안전 처리

- 브라우저 요청 제한: 13초. 실패해도 입력은 유지되고 기본 질문으로 진행한다.
- Worker의 Anthropic 요청 제한: 15초.
- 429, 타임아웃, 잘못된 JSON, 잘못된 구절 추출은 사용자에게 내부 오류를 노출하지 않고 폴백한다.
- 질문이 38자, 설명이 72자를 넘거나 현재 단계에서 허용되지 않은 모듈이면 짧은 기본 질문으로 폴백한다.
- 위험 키워드는 브라우저와 Worker 양쪽에서 확인한다. Worker는 안전 신호가 있으면 Anthropic API를 호출하지 않는다.
- 위험 확인은 임상적 평가가 아니며 112·119·129 안내와 항상 함께 제공한다.
