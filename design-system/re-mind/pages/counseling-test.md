# Counseling Test Override

이 파일은 `MASTER.md`의 자동 추천보다 우선한다. 자동 추천의 청록색 웰니스 팔레트, Lora/Raleway 조합, FAQ 랜딩 구조는 기존 Re:Mind의 브랜드와 실제 과업에 맞지 않아 사용하지 않는다.

## Surface

- Mode: Operate
- Primary task: 사용자가 한 질문씩 따라가며 자기 경험을 정리한다.
- Duration: 약 5~8분
- Stack: 정적 HTML/CSS/JavaScript
- Route: `/counseling-test/`

## Direction

**접힌 마음 지도.** 처음에는 한 질문만 보이고, 답할 때마다 얇은 구획 하나가 마음 지도에 더해진다. 마지막에는 사용자가 적은 말이 한 장의 정리로 펼쳐진다. 채팅 말풍선과 상담사 아바타는 사용하지 않는다.

## Existing Brand Authority

- Paper: `#F6F3EA`
- Paper deep: `#EDE8DC`
- Surface: `#FFFDF8`
- Ink: `#1C2420`
- Muted: `#6D6F69`
- Line: `#D8D2C5`
- Deep green: `#173D33`
- Green mid: `#2E5A4D`
- Green soft: `#DCE6DF`
- Coral action: `#E96346`
- Coral soft: `#F5DED5`

## Typography

- Korean display/reflective copy: `Gowun Batang`
- Controls, labels, body: `Noto Sans KR`
- Body: minimum 16px, line-height 1.65
- Large prompts: 30–48px depending on viewport
- Do not use tiny tracked all-caps labels for core guidance.

## Layout

- Mobile: one continuous paper surface, `100dvh`, safe-area aware.
- Desktop: deep-green context rail + paper work area. The task remains one question at a time.
- No nested cards. Choice rows are full-width bordered controls on the base surface.
- Bottom action area may become sticky on mobile but must not cover content.

## Interaction

- Minimum touch target: 44×44px.
- One primary action per step.
- Browser back returns to the prior question without discarding the current session.
- Text fields have visible labels, helper text, character guidance, and focus state.
- Selected states use border, fill, and a check mark; never color alone.
- Motion: 180–240ms opacity/translate only; disabled with `prefers-reduced-motion`.
- Use `100dvh`, `touch-action: manipulation`, and prevent accidental horizontal overflow.

## Voice

- Ask, do not diagnose.
- One thought per sentence.
- Avoid “분석”, “솔루션”, “치유”, “진짜 감정”, “정답”.
- Use permission language naturally: “건너뛰어도 괜찮아요”, “다르면 고쳐주세요”.
- Avoid repetitive reassurance after every question; reserve it for transitions where burden increases.

## Safety

- A visible but quiet `지금 위험한 상황인가요?` path remains available throughout.
- Risk flow interrupts the reflection session and shows current Korean human support options.
- The prototype must state that it cannot assess or solve an emergency.

## Quality Checks

- Viewports: 360, 390, 430, 768, 1280, 1440px.
- Keyboard completion and visible focus.
- No horizontal scroll or clipped sticky action.
- Long Korean copy, textarea keyboard, back navigation, reduced motion.
- Feedback export excludes the user's free-text story.
