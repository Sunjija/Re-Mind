# Claude 연동 설계안

## 먼저 지켜야 할 원칙

- Anthropic API 키를 HTML, JavaScript, Git 저장소, GitHub Pages에 넣지 않는다.
- 키는 서버리스 플랫폼의 Secret 환경변수 `ANTHROPIC_API_KEY`에만 저장한다.
- 실제 키는 문서, 이슈, 채팅, 로그에 복사하지 않는다.
- 이미 외부에 노출된 키는 폐기하고 새 키를 발급한다.
- 사용자의 감정 원문을 외부 API로 보내기 전 명시적인 동의를 받는다.

## 권장 구조

```text
GitHub Pages 모바일 화면
        │ 사용자가 동의한 최소 답변만 HTTPS 전송
        ▼
서버리스 API
  - Origin 제한
  - 요청 크기 제한
  - 속도 제한
  - 로그에서 원문 제외
  - Anthropic 키 보관
        │
        ▼
Claude API
  - 다음 질문 후보 선택
  - 사용자 문장만 사용한 구조화
        │
        ▼
검증된 JSON 응답 → 화면 렌더링
```

GitHub Pages는 정적 호스팅이므로 비밀키를 안전하게 보관할 수 없다. 프런트엔드는 그대로 유지하되 Cloudflare Worker, Vercel Function, Netlify Function 같은 별도 서버리스 계층이 필요하다.

## Claude가 해도 되는 일

1. 현재 단계와 사용자가 직접 적은 답을 보고 승인된 질문 목록에서 다음 질문을 고른다.
2. 선택지에 없는 감정·가치 표현을 사용자의 문장에서 그대로 추출한다.
3. 사건, 장면, 감정, 받아들인 의미, 중요했던 마음을 구분해 JSON으로 돌려준다.
4. 요약에 사용한 각 문구가 어떤 사용자 입력에서 왔는지 `sourceField`로 표시한다.

## Claude가 하면 안 되는 일

- 진단, 치료 권고, 자해·폭력 위험의 자동 판정
- 누가 잘못했는지 판단
- 상대의 숨은 의도 추측
- 사용자가 말하지 않은 감정·사실 추가
- 화해, 관계 유지, 이별 중 하나를 정답으로 추천
- 상대에게 보낼 메시지를 자동 발송

## API 계약 초안

### `POST /v1/reflection/next`

요청:

```json
{
  "sessionVersion": "counseling-test-v0.1",
  "currentStep": "meaning",
  "consent": true,
  "answers": {
    "moment": "사용자가 직접 적은 문장",
    "emotions": ["사용자가 고른 감정"]
  }
}
```

응답:

```json
{
  "nextStep": "needs",
  "question": "그 마음 안에서, 내가 지키고 싶었던 것은 무엇이었을까요?",
  "reasonCode": "meaning_to_need",
  "safety": {
    "showCheckIn": false
  }
}
```

### `POST /v1/reflection/map`

응답은 자유 문장이 아니라 다음 스키마로 제한한다.

```json
{
  "event": { "text": "사용자 원문", "sourceField": "story" },
  "moment": { "text": "사용자 원문", "sourceField": "moment" },
  "emotions": [{ "text": "사용자 선택", "sourceField": "emotions" }],
  "meaning": { "text": "사용자 원문", "sourceField": "meaning" },
  "needs": [{ "text": "사용자 선택", "sourceField": "needs" }],
  "disclaimer": "이 정리는 정답이나 진단이 아니며 직접 수정할 수 있습니다."
}
```

## 프롬프트 경계

- system prompt에 제품 경계와 출력 JSON 스키마를 고정한다.
- 모델에는 전체 대화 기록이 아니라 현재 단계에 필요한 필드만 보낸다.
- “공감하는 상담사처럼”이 아니라 “사용자의 말을 구분하는 진행 도구”로 역할을 정의한다.
- 응답은 서버에서 JSON Schema로 검증하고 실패하면 기존 정적 질문으로 되돌아간다.

## 개인정보와 운영

- 기본값은 외부 전송 꺼짐이다.
- 동의 화면에 전송되는 필드, 목적, 보관 여부, 제공자(Anthropic)를 적는다.
- 서버 로그에는 감정 원문과 모델 응답 본문을 남기지 않는다.
- 세션 식별자는 개인 식별 정보와 분리하고 짧게 만료한다.
- 비용·남용 방지를 위해 IP/세션 단위 속도 제한과 최대 입력 길이를 둔다.
- 위기 문구는 모델 결과만 믿지 않고 현재 정적 안전 버튼을 항상 유지한다.

## 구현 순서

1. 현재 정적 흐름으로 사용성 기준선을 수집한다.
2. 서버리스 플랫폼을 선택하고 새 API 키를 Secret으로 등록한다.
3. `next` 엔드포인트만 붙여 정적 질문 대비 완료율과 통제감을 비교한다.
4. 구조화 정확도가 확인된 뒤 `map` 엔드포인트를 붙인다.
5. 편지 생성·상대 전달은 별도 동의와 별도 실험으로 분리한다.
