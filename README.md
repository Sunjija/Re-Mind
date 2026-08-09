# Re:Mind

마음과 마음 사이, 대화가 다시 이어지도록.

Re:Mind는 관계 속에서 생긴 감정과 상황을 한 질문씩 살펴보고, 사용자가 자기 말을 찾도록 돕는 관계 커뮤니케이션 프로젝트입니다. 누가 옳은지 판단하거나 화해를 강요하지 않습니다.

## 바로 보기

- [상담형 마음 정리 테스트](https://sunjija.github.io/Re-Mind/counseling-test/)
- [기획 발표자료 — 자동 화면 선택](https://sunjija.github.io/Re-Mind/)
- [PC 발표자료](https://sunjija.github.io/Re-Mind/remind_product_plan_v0.1.html)
- [모바일 발표자료](https://sunjija.github.io/Re-Mind/remind_product_plan_mobile_v0.1.html)
- [대화 세션 미리보기](https://sunjija.github.io/Re-Mind/remind_conversation_session_mobile_v0.1.html)

## 현재 프로토타입

`outputs/counseling-test/index.html`은 모바일 우선 상담형 마음 정리 세션입니다.

- 한 번에 한 질문씩 진행
- 사건·장면·감정·의미·중요했던 마음 구분
- 감정이 큰 경우 선택적 멈춤
- 사용자의 원문만으로 만든 마음 지도와 직접 수정
- 사용자가 고르는 다음 행동
- 위험 상황 안전 안내
- 서버 저장 없이 브라우저에서만 동작

## 문서

- [제품 원칙과 범위](PRODUCT.md)
- [디자인 시스템](DESIGN.md)
- [작업 인계서](HANDOFF.md)
- [상담심리 근거 검증](outputs/remind_counseling_psychology_validation_v0.1.md)
- [Claude 연동 설계](docs/CLAUDE_INTEGRATION.md)
- [2026-08-10 구현 기록](docs/WORKLOG_2026-08-10.md)

## 로컬 실행

```powershell
python -m http.server 4173 --directory outputs
```

브라우저에서 `http://127.0.0.1:4173/counseling-test/`를 엽니다.

## 배포

`main` 브랜치에 push하면 GitHub Actions가 `outputs` 폴더를 GitHub Pages에 배포합니다.

API 비밀키는 정적 HTML이나 Git 저장소에 넣지 않습니다. 동적 AI 연동은 별도 서버리스 API와 Secret 환경변수를 사용해야 합니다.
