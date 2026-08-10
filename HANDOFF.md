# Re:Mind 작업 인계서

## 현재 상태

- 모바일 우선 상담형 마음 정리 세션과 선택형 Claude 질문 흐름이 구현되어 있다.
- GitHub Pages 공개 경로는 `https://sunjija.github.io/Re-Mind/counseling-test/`이다.
- 기본 질문 모드는 서버·API·계정 없이 동작한다. AI 모드는 Cloudflare Worker 배포와 Secret 설정이 필요하다.
- Cloudflare Worker가 `https://re-mind-reflection-api.remind-sunjija.workers.dev`에 배포되어 공개 페이지의 AI 선택지가 활성화되어 있다.
- 이 프로토타입의 목적은 상담 효과를 주장하는 것이 아니라, 질문 구조·말투·완료율·사용자 통제감을 검증하는 것이다.

## 가장 먼저 읽을 파일

1. `PRODUCT.md` — 제품 목적, 경계, 사용자, 검증 가설
2. `DESIGN.md` — 실제 구현에서 추출한 디자인 규칙
3. `outputs/counseling-test/index.html` — 배포되는 전체 프로토타입
4. `worker/src/index.js` — Anthropic 비밀키를 숨기는 Cloudflare Worker
5. `outputs/remind_counseling_psychology_validation_v0.1.md` — 상담심리 근거 조사
6. `docs/WORKLOG_2026-08-10.md` — 이번 구현과 QA 기록
7. `docs/CLAUDE_INTEGRATION.md` — 비밀키를 노출하지 않는 동적 질문 연동·배포 안내

## 세션 흐름

1. 시작 및 로컬 저장 안내
2. 이번 시간의 목표 선택
3. 시작 전 마음 명료도
4. 있었던 일 꺼내기
5. 가장 오래 남은 장면 찾기
6. 감정 선택
7. 현재 감정 강도
8. 강도가 8점 이상이면 20초 멈춤 제안
9. 사건이 나에게 닿은 의미 구분
10. 지키고 싶었던 가치·필요 선택
11. 사용자의 말만으로 만든 마음 지도 확인·수정
12. 다음 행동을 사용자가 직접 선택
13. 세션 후 명료도 및 익명형 피드백
14. 개인 원문을 제외한 테스트 결과 복사

진행 숫자는 조건부 멈춤 화면의 포함 여부에 따라 12단계 또는 13단계로 보인다.

## 구현 구조

- 프런트엔드: HTML, CSS, JavaScript가 `outputs/counseling-test/index.html`에 함께 있다.
- 설정: `outputs/counseling-test/config.js`가 공개 Worker 주소만 제공하며 비밀값은 포함하지 않는다.
- AI 프록시: `worker/src/index.js`가 Origin·동의·입력 크기·안전 신호를 확인하고 Anthropic의 구조화 응답을 검증한다.
- 상태: `state` 객체에 현재 단계와 답변이 저장되며 새로고침 시 초기화된다.
- 렌더링: 단계별 `render*` 함수가 화면을 만들고 `goNext`, `goBack`이 이동을 담당한다.
- 뒤로가기: `history.pushState`와 `popstate`로 브라우저 뒤로가기를 지원한다.
- 반응형: 960px 미만은 단일 열, 960px 이상은 300px 맥락 레일과 종이 작업대다.
- 접근성: 실제 label, button, radio, range, dialog 요소와 focus-visible, reduced-motion 대응을 사용한다.
- 장애 대응: 13초 타임아웃, API 오류, 잘못된 구조화 응답은 모두 현재 정적 질문으로 되돌린다.

## 제품 경계

- 이 화면은 진단, 치료, 위기 판단, 잘잘못 판정, 화해 권유를 하지 않는다.
- 결과는 사용자의 입력을 분류해 다시 보여줄 뿐 새로운 감정이나 상대의 의도를 만들어내지 않는다.
- “마음 지도”는 정답이 아니며 사용자가 직접 수정할 수 있다.
- 폭력·협박·자해 등 위험 단어는 정확한 판정이 아니라 안전 확인 질문을 띄우는 신호로만 사용한다.
- 긴급 안내는 대한민국 112, 119, 보건복지상담센터 129와 공식 사이트로 연결한다.

## 로컬 실행

PowerShell에서 저장소 루트 기준:

```powershell
python -m http.server 4173 --directory outputs
```

브라우저에서 `http://127.0.0.1:4173/counseling-test/`를 연다.

## 다음 검증 우선순위

1. 5~8명의 사용성 인터뷰에서 질문이 상담사처럼 느껴지는 순간을 표시한다.
2. 세션 시작률, 단계별 이탈, 완료 시간, 시작 전·후 명료도 차이를 기록한다.
3. 마음 지도가 사용자의 말을 과하게 해석한다고 느끼는지 5점 척도로 확인한다.
4. 상담형 세션 단독 가치가 확인된 뒤에만 편지·상대 답장 흐름과의 결합을 실험한다.
5. 서버 저장이 필요해질 때 동의, 삭제, 암호화, 위기 대응 운영 정책을 먼저 설계한다.
6. Claude Worker를 배포한 뒤 5~8명의 테스트에서 AI 질문과 기본 질문의 완료율·통제감·과잉 해석 점수를 비교한다.

## 디자인 스킬 기록

- `TASTE`: 설치 완료. 이 세션에서는 필수 브라우저 MCP 연결이 활성화되지 않아 자동 Design DNA 추출은 실행하지 않았다. 다음 Codex 세션을 재시작하면 사용 가능 여부를 다시 확인한다.
- `ui-ux-pro-max`: 모바일 우선, 44px 터치 영역, 100dvh, 명시적 label, 960px 반응형 전환, 브라우저 뒤로가기 규칙에 반영했다.
- `Impeccable`: PRODUCT.md, 구조 콘셉트 시드 `718bd570`, “접힌 마음 지도”, 최종 스크린샷, DESIGN.md와 sidecar 기록에 반영했다.

## 배포

`.github/workflows/deploy-pages.yml`가 `main` 브랜치에 push될 때 `outputs` 폴더를 GitHub Pages에 배포한다. 새 페이지는 반드시 `outputs` 아래에 두어야 한다.

AI 공개 순서:

1. `worker/`에서 의존성을 설치하고 Cloudflare에 로그인한다.
2. `pnpm exec wrangler secret put ANTHROPIC_API_KEY`로 키를 Secret에 입력한다.
3. `pnpm exec wrangler deploy`가 반환한 `https://…workers.dev` 주소를 `outputs/counseling-test/config.js`에 넣는다.
4. Worker의 `/health`에서 `aiConfigured: true`를 확인한 뒤 프런트엔드를 push한다.
