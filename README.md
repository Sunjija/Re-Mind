# Re:Mind

마음과 마음 사이, 대화가 다시 이어지도록.

Re:Mind는 관계 속에서 생긴 감정과 상황을 한 질문씩 살펴보고, 사용자가 자기 말을 찾도록 돕는 관계 커뮤니케이션 프로젝트입니다. 누가 옳은지 판단하거나 화해를 강요하지 않습니다.

현재 버전은 상담 효과를 주장하는 서비스가 아니라 질문 구조, 말투, 완료 가능성, 사용자 통제감을 검증하는 공개 MVP입니다.

## 바로 보기

- [상담형 마음 정리 테스트](https://sunjija.github.io/Re-Mind/counseling-test/)
- [기획 발표자료 — 자동 화면 선택](https://sunjija.github.io/Re-Mind/)
- [PC 발표자료](https://sunjija.github.io/Re-Mind/remind_product_plan_v0.1.html)
- [모바일 발표자료](https://sunjija.github.io/Re-Mind/remind_product_plan_mobile_v0.1.html)
- [대화 세션 미리보기](https://sunjija.github.io/Re-Mind/remind_conversation_session_mobile_v0.1.html)
- [초기 사용성 검증용 화면](https://sunjija.github.io/Re-Mind/counseling-test/?research=1)

## 현재 프로토타입

`outputs/counseling-test/index.html`은 모바일 우선 상담형 마음 정리 세션입니다.

- 한 번에 한 질문씩 진행
- 사건·장면·감정·의미·중요했던 마음 구분
- 감정이 큰 경우 선택적 멈춤
- 동의 후 답에 맞춰 달라지는 Claude 질문
- 사용자의 원문만으로 만든 마음 지도와 직접 수정
- 사용자가 고르는 다음 행동
- 위험 상황 안전 안내
- 기본 질문 모드는 외부 전송 없이 브라우저에서만 동작
- AI 연결 실패 시 입력을 유지하고 기본 질문으로 자동 전환

## 구조

```text
outputs/counseling-test/
├── index.html       화면 구조
├── styles.css       반응형 디자인과 접근성 스타일
├── app.js           세션 흐름과 AI 폴백
├── research.js      비식별 사용성 기록
└── config.js        공개 Worker 주소

worker/
├── src/index.js              API, 검증, 요청 제한
├── src/reflection-policy.js  질문 생성 경계
└── tests/worker.test.mjs     Worker 계약 테스트
```

프런트엔드는 GitHub Pages, 선택형 AI 질문은 Cloudflare Worker와 Anthropic Messages API를 사용합니다. API 키는 Worker Secret에만 저장됩니다.

## 문서

- [제품 원칙과 범위](PRODUCT.md)
- [디자인 시스템](DESIGN.md)
- [작업 인계서](HANDOFF.md)
- [상담심리 근거 검증](outputs/remind_counseling_psychology_validation_v0.1.md)
- [Claude 연동 설계](docs/CLAUDE_INTEGRATION.md)
- [초기 사용성 검증 계획](docs/USER_RESEARCH_PLAN.md)
- [2026-08-10 구현 기록](docs/WORKLOG_2026-08-10.md)

## 로컬 실행

```powershell
python -m http.server 4173 --directory outputs
```

브라우저에서 `http://127.0.0.1:4173/counseling-test/`를 엽니다.

전체 계약 검증:

```powershell
node scripts/verify.mjs
```

검증은 프런트엔드 자산·JavaScript 문법·비밀키 패턴과 Worker 계약을 함께 확인합니다.

## 배포

`main` 브랜치에 push하면 GitHub Actions가 `outputs` 폴더를 GitHub Pages에 배포합니다.

API 비밀키는 정적 HTML이나 Git 저장소에 넣지 않습니다. `worker/`의 Cloudflare Worker가 비밀키를 Secret 환경변수로 보관하고 Anthropic API를 대신 호출합니다.

AI 모드를 공개하려면 Worker를 배포한 뒤 반환된 주소를 `outputs/counseling-test/config.js`의 `aiApiBase`에 넣어야 합니다. 주소가 비어 있으면 공개 화면에서는 기본 질문 모드만 활성화됩니다.

Worker는 브라우저 메모리에만 존재하는 무작위 세션 ID로 분당 요청 수를 제한합니다. IP 주소나 사용자의 자유 서술을 제한 키로 저장하지 않습니다. 전체 요청 보호와 오류 관측도 활성화되어 있습니다.

```powershell
cd worker
pnpm install
pnpm exec wrangler login
pnpm exec wrangler secret put ANTHROPIC_API_KEY
pnpm exec wrangler deploy
```

키를 명령줄 인자로 붙이지 말고 `wrangler secret put`의 숨김 입력창에 직접 입력합니다.

## 초기 사용자 검증

`?research=1`을 붙인 화면은 완료 후 비식별 사용성 JSON 저장 버튼을 보여줍니다. 기록에는 자유 서술, 감정 단어, 관계 정보, 한 줄 의견이 들어가지 않으며 서버로 자동 전송되지 않습니다.

5~8명 테스트의 모집 조건, 진행 안내, 인터뷰 질문과 1차 판단 기준은 [초기 사용성 검증 계획](docs/USER_RESEARCH_PLAN.md)을 따릅니다.

## 프로젝트 경계

- 진단, 치료, 위기 판단을 제공하지 않습니다.
- 상대의 의도·성격·애착 유형을 추측하지 않습니다.
- 화해, 관계 유지, 이별, 연락을 권하지 않습니다.
- 자해·타해·폭력·협박 신호가 있으면 일반 흐름을 중단하고 사람과 공식 기관의 도움을 안내합니다.

## 기여와 보안

- 기여 전 [기여 안내](CONTRIBUTING.md)를 확인해 주세요.
- 취약점과 개인정보 문제는 공개 이슈 대신 [비공개 보안 제보 절차](SECURITY.md)를 이용해 주세요.
- 코드 재사용 조건을 정하는 라이선스는 아직 선택되지 않았습니다.
