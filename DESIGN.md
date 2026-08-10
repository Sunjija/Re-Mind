---
name: Re:Mind
description: 마음을 서둘러 결론 내리지 않고 한 질문씩 살펴보는 관계·감정 대화 서비스
colors:
  paper: "#F6F3EA"
  paper-deep: "#EDE8DC"
  surface: "#FFFDF8"
  ink: "#1C2420"
  muted: "#6D6F69"
  line: "#D8D2C5"
  deep-green: "#173D33"
  middle-green: "#2E5A4D"
  soft-green: "#DCE6DF"
  coral: "#D9553A"
  soft-coral: "#F5DED5"
typography:
  display:
    fontFamily: "Gowun Batang, Noto Serif KR, KoPub Batang, serif"
    fontSize: "clamp(2rem, 4.2vw, 3.25rem)"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.04em"
  body:
    fontFamily: "Noto Sans KR, Pretendard, SUIT, Apple SD Gothic Neo, Malgun Gothic, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.8
    letterSpacing: "-0.02em"
  label:
    fontFamily: "Noto Sans KR, Pretendard, SUIT, Apple SD Gothic Neo, Malgun Gothic, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.5
rounded:
  sm: "12px"
  md: "14px"
  lg: "18px"
  full: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.deep-green}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "14px 18px"
    height: "54px"
    typography: "{typography.label}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.deep-green}"
    rounded: "{rounded.md}"
    padding: "14px 18px"
    height: "54px"
    typography: "{typography.label}"
  choice:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "15px 16px"
---

# Design System: Re:Mind

## Overview

**Creative North Star: "접힌 마음 지도"**

Re:Mind의 화면은 상담 채팅창이 아니라, 사용자가 자기 말을 한 장씩 펼쳐보는 조용한 작업대다. 따뜻한 종이색 위에 짙은 녹색 잉크를 놓고 산호색은 진행과 선택을 확인하는 작은 표시로만 사용한다. 화면이 먼저 해석하거나 위로하는 인상을 주지 않고, 질문과 사용자의 답이 시각적 중심이 된다.

모바일에서는 한 화면에 질문 하나와 다음 행동 하나가 보인다. 넓은 화면에서는 왼쪽 맥락 레일이 세션의 위치를 보여주지만, 질문을 읽는 순서를 가로막지 않는다. 사람의 말이 주인공이며 AI·캐릭터·상담사 아바타를 시각적 주인공으로 만들지 않는다.

**Key Characteristics:**

- 따뜻한 종이 바탕과 차분한 녹색 잉크
- 한 번에 한 질문만 펼쳐지는 낮은 인지 부하
- 고운바탕 제목과 산세리프 본문의 명확한 역할 분리
- 과한 장식보다 여백·선·선택 상태로 만드는 리듬
- 결정권과 안전을 분명히 남기는 인터랙션

## Colors

종이와 잉크의 중성 팔레트가 대부분을 차지하고, 산호색은 현재 위치·체크·집중 상태처럼 의미가 있는 순간에만 나타난다.

### Primary

- **깊은 잉크 녹색:** 주요 제목, 핵심 행동, 데스크톱 맥락 레일에 사용한다.
- **중간 녹색:** 보조 행동, 선택 윤곽, 진행 정보에 사용한다.

### Secondary

- **따뜻한 산호색:** 현재 단계와 선택 완료를 알리는 작은 강조에만 사용한다.

### Neutral

- **따뜻한 종이:** 모든 기본 화면의 바탕이다.
- **깊은 종이:** 비활성 표면과 조용한 구획에 사용한다.
- **깨끗한 표면:** 선택 카드와 입력 표면에 사용한다.
- **본문 잉크:** 핵심 문장과 사용자 답변에 사용한다.
- **보조 잉크:** 설명과 메타 정보에 사용하며 일반 텍스트 대비 기준을 충족한다.
- **종이 선:** 구획을 나누되 카드 테두리처럼 화면을 잘게 자르지 않는다.

**The Quiet Accent Rule.** 산호색은 한 화면의 작은 신호에만 쓰며, 넓은 면을 채우거나 본문색으로 사용하지 않는다.

## Typography

**Display Font:** Gowun Batang 계열

**Body Font:** Noto Sans KR 계열

**Character:** 제목은 손으로 천천히 적어 내려간 듯 부드럽고, 설명과 조작 문구는 오해 없이 빠르게 읽히도록 담백하다.

### Hierarchy

- **Display:** 각 단계의 질문과 완료 문장에만 사용한다. 모바일에서는 2rem, 데스크톱에서는 최대 3.25rem까지 커진다.
- **Body:** 질문의 맥락과 도움말에 사용하며 기본 16px, 1.8 행간을 유지한다.
- **Label:** 버튼·진행 정보·필드 이름에 사용하며 13px 또는 14px, 굵기 700을 기본으로 한다.

**The Human Sentence Rule.** 제목은 서비스의 해석이 아니라 사용자가 스스로 답할 수 있는 질문 또는 선택권을 남기는 문장이어야 한다.

## Layout

모바일은 `100dvh`를 기준으로 한 단일 열 구조다. 상단에는 브랜드와 진행 상태, 중앙에는 질문과 입력, 하단에는 하나의 주요 행동이 놓인다. 380px 이하에서는 좌우 여백을 17px로 줄이며, 960px 미만은 태블릿을 포함해 단일 열을 유지한다.

960px 이상에서는 최대 1120px의 종이 작업대가 나타나고 300px 맥락 레일과 유동적인 질문 영역으로 나뉜다. 본문은 최대 720px 안에서 읽히며, 넓은 화면에서도 문장이 지나치게 길어지지 않는다. 여백은 8px 기반의 12·16·24·32px 리듬을 우선한다.

## Elevation & Depth

기본 화면은 평면적이며 선과 색면 차이로 깊이를 만든다. 그림자는 데스크톱 작업대와 안전 대화상자처럼 다른 층이 실제로 생기는 경우에만 넓고 부드럽게 사용한다.

**The Flat-by-Default Rule.** 선택 카드와 입력 필드는 그림자로 띄우지 않는다. 깊이는 상태 변화보다 구조가 바뀌는 표면에만 허용한다.

## Shapes

주요 버튼과 선택 카드는 14px의 부드러운 모서리를 사용한다. 입력 필드는 밑줄 중심의 열린 형태를 사용해 문서 작업의 느낌을 유지한다. 칩은 짧은 감정·가치 단어를 담을 때만 완전한 알약 형태를 사용한다. 데스크톱 전체 작업대는 18px로 한 단계 더 크게 묶는다.

## Components

### Buttons

- **Primary:** 깊은 녹색 면, 밝은 종이색 글자, 54px 이상의 높이와 14px 모서리를 사용한다.
- **Secondary:** 투명 또는 종이 표면과 녹색 선을 사용하며 주요 행동과 같은 무게로 보이지 않는다.
- **Hover / Focus:** 색을 한 단계 진하게 하거나 1px 이내로 눌리는 피드백을 제공하고, 3px 산호색 포커스 링을 유지한다.

### Chips

- **Style:** 밝은 표면과 녹색 선을 사용한다.
- **State:** 선택되면 부드러운 녹색 배경·짙은 녹색 글자·체크 아이콘이 함께 나타난다. 색만으로 선택을 전달하지 않는다.

### Cards / Containers

- 선택 카드는 테두리와 배경 변화로만 상태를 구분한다.
- 요약 지도는 행 단위로 펼쳐지며 각 행에 직접 수정할 수 있는 텍스트 행동을 둔다.

### Inputs / Fields

- 제목이 있는 실제 `label`과 넓은 밑줄 입력을 사용한다.
- 포커스 시 녹색 선과 산호색 포커스 링을 함께 제공한다.
- 도움말은 입력의 목적과 사용자가 선택할 수 있는 범위를 설명한다.

### Navigation

- 모바일은 상단 진행률과 명시적인 이전 버튼을 사용한다.
- 데스크톱 맥락 레일은 시작·꺼내보기·알아보기·정리하기·마무리의 현재 위치를 텍스트와 마름모 표시로 함께 보여준다.

### 마음 지도

사용자가 적은 사건, 장면, 감정, 받아들인 뜻, 중요했던 것을 한자리에서 구분한다. 서비스가 만든 결론처럼 보이지 않도록 “정답이 아니다”라는 설명과 각 항목의 수정 행동을 항상 함께 둔다.

### AI 질문 안내

- 첫 화면에서 AI 질문과 기본 질문을 같은 위계의 라디오 선택으로 제공한다.
- AI 질문은 외부 전송 범위와 제공자를 설명한 뒤 별도 체크 동의를 받아야 시작할 수 있다.
- 맞춤 질문에는 작은 녹색 안내선을 붙여 왜 이 질문이 나타났는지 설명한다. 반짝이, 로봇, 상담사 아바타는 사용하지 않는다.
- AI 질문은 모바일에서 38자를 넘기지 않고, 기본 제목보다 한 단계 작은 유동 크기와 `overflow-wrap`을 사용해 최대 세 줄 안에서 읽히도록 한다.
- 연결 실패 안내는 오류를 전면에 세우지 않고 “기본 질문으로 이어가요”라고 알리며 사용자가 적은 내용이 유지된다는 점을 먼저 말한다.

## Do's and Don'ts

### Do:

- **Do** 한 화면에 하나의 질문과 하나의 주요 행동만 둔다.
- **Do** “정확한 평가가 아니다”, “건너뛰어도 된다”, “직접 고칠 수 있다”처럼 사용자의 결정권을 문장으로 확인한다.
- **Do** 안전 안내와 종료 경로를 어느 단계에서도 찾을 수 있게 한다.
- **Do** 모바일 44px 이상의 터치 영역과 키보드 포커스 표시를 유지한다.

### Don't:

- **Don't** 상담사 아바타, 채팅 말풍선, AI 반짝이 아이콘으로 화면을 꾸미지 않는다.
- **Don't** 사용자가 말하지 않은 감정·의도·진단을 결과에 추가하지 않는다.
- **Don't** 산호색, 그림자, 둥근 카드를 한 화면에 과도하게 반복하지 않는다.
- **Don't** 화해·관계 유지·메시지 발송을 세션의 정답처럼 제시하지 않는다.
