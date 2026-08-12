(() => {
  'use strict';

  const checkIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 12.5 3.4 3.4 7.6-8"/></svg>';
  const backIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
  const lockIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
  const AI_API_BASE = resolveAiApiBase();
  const AI_REQUEST_TIMEOUT_MS = 13000;
  const SESSION_ID = createSessionId();
  const researchTracker = window.REMIND_RESEARCH || Object.freeze({
    enabled: false,
    start() {},
    visit() {},
    download() {},
    reset() {}
  });

  const goalOptions = [
    { value: '엉킨 마음을 정리하고 싶어요', detail: '무엇이 가장 크게 남았는지 살펴봐요.' },
    { value: '왜 이렇게 마음이 쓰이는지 알고 싶어요', detail: '감정 아래에 중요했던 마음을 찾아봐요.' },
    { value: '지금 할 수 있는 일을 찾고 싶어요', detail: '서두르지 않고 다음 한 걸음을 골라봐요.' },
    { value: '정답 없이 그냥 꺼내놓고 싶어요', detail: '결론을 내리지 않아도 괜찮아요.' }
  ];

  const emotions = ['서운함', '화남', '불안함', '외로움', '답답함', '허탈함', '두려움', '미안함', '혼란스러움', '잘 모르겠음'];
  const needs = ['존중', '신뢰', '안정', '이해', '관심', '자유', '약속', '솔직함', '연결감', '잘 모르겠음'];
  const nextOptions = [
    { value: '오늘은 여기서 멈추고 쉬기', detail: '지금 당장 해결하지 않아도 괜찮아요.' },
    { value: '조금 더 생각해 볼 질문 하나 남기기', detail: '나중에 다시 볼 작은 질문만 가져가요.' },
    { value: '믿을 만한 사람에게 말해보기', detail: '혼자만의 생각에서 잠시 나와요.' },
    { value: '상대와 이야기할 시점 정하기', detail: '무엇을 말할지보다 언제 말할지부터 골라요.' },
    { value: '전문가의 도움 알아보기', detail: '혼자 정리하기 어려운 마음을 사람과 나눠요.' }
  ];

  const stageLabels = ['시작', '꺼내보기', '알아보기', '정리하기', '마무리'];
  const riskPattern = /(죽고\s*싶|자살|해치고|죽여|폭력|맞았|때렸|협박|감금|스토킹|따라다니|안전하지|흉기|칼로)/i;

  const state = {
    step: 0,
    startedAt: Date.now(),
    goal: '',
    clarityBefore: 4,
    story: '',
    moment: '',
    emotions: [],
    customEmotion: '',
    intensity: 5,
    meaning: '',
    needs: [],
    customNeed: '',
    nextChoice: '',
    clarityAfter: 5,
    feedback: { understood: 0, inferred: 0, agency: 0 },
    comment: '',
    riskChecked: false,
    pauseCompleted: false,
    returnToMap: false,
    mode: AI_API_BASE ? 'ai' : 'static',
    aiConsent: false,
    aiSkipMoment: false,
    aiMomentPrompt: null,
    aiMomentStatus: '',
    aiMeaningPrompt: null,
    aiMeaningStatus: '',
    aiUnderstanding: null,
    aiUnderstandingStatus: '',
    understandingVerdict: '',
    understandingCorrection: '',
    understandingRevision: 0,
    depthChoice: '',
    aiSkipDeep: false,
    aiDeepPrompt: null,
    aiDeepStatus: '',
    deepAnswer: '',
    aiMap: null,
    aiMapStatus: ''
  };

  const screens = [
    { id: 'welcome', stage: 0, render: renderWelcome },
    { id: 'goal', stage: 0, render: renderGoal },
    { id: 'clarity-before', stage: 0, render: renderClarityBefore },
    { id: 'story', stage: 1, render: renderStory },
    { id: 'moment', stage: 1, render: renderMoment, conditional: () => !state.aiSkipMoment },
    { id: 'emotion', stage: 2, render: renderEmotion },
    { id: 'intensity', stage: 2, render: renderIntensity },
    { id: 'pause', stage: 2, render: renderPause, conditional: () => state.intensity >= 8 },
    { id: 'meaning', stage: 2, render: renderMeaning },
    { id: 'understanding', stage: 2, render: renderUnderstanding },
    { id: 'need', stage: 2, render: renderNeed },
    { id: 'depth-choice', stage: 2, render: renderDepthChoice },
    { id: 'deep', stage: 2, render: renderDeep, conditional: () => !state.aiSkipDeep },
    { id: 'map', stage: 3, render: renderMap },
    { id: 'next', stage: 3, render: renderNext },
    { id: 'clarity-after', stage: 4, render: renderClarityAfter },
    { id: 'feedback', stage: 4, render: renderFeedback },
    { id: 'done', stage: 4, render: renderDone }
  ];

  const content = document.getElementById('session-content');
  const topActions = document.getElementById('top-actions');
  const progressFill = document.getElementById('progress-fill');
  const progressLabel = document.getElementById('mobile-progress-label');
  const foldProgress = document.getElementById('fold-progress');
  const safetyDialog = document.getElementById('safety-dialog');
  const riskDialog = document.getElementById('risk-dialog');

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function clipCopy(value, max) {
    const normalized = String(value ?? '').trim().replace(/\s+/g, ' ');
    const characters = Array.from(normalized);
    return characters.length <= max ? normalized : `${characters.slice(0, max - 1).join('')}…`;
  }

  function createSessionId() {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
  }

  function resolveAiApiBase() {
    const configured = String(window.REMIND_CONFIG?.aiApiBase || '').trim().replace(/\/$/, '');
    const isLocal = ['127.0.0.1', 'localhost'].includes(location.hostname);
    if (isLocal) {
      const localOverride = new URLSearchParams(location.search).get('api');
      if (localOverride && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(localOverride)) {
        return localOverride.replace(/\/$/, '');
      }
    }
    return configured;
  }

  function aiModeActive() {
    return state.mode === 'ai' && state.aiConsent && Boolean(AI_API_BASE);
  }

  function aiAnswers() {
    return {
      goal: state.goal,
      story: state.story,
      moment: state.moment,
      emotions: [...state.emotions, state.customEmotion.trim()].filter(Boolean),
      intensity: state.intensity,
      meaning: state.meaning,
      needs: [...state.needs, state.customNeed.trim()].filter(Boolean),
      understandingVerdict: state.understandingVerdict,
      understandingCorrection: state.understandingCorrection,
      deepAnswer: state.deepAnswer
    };
  }

  function resetDepthState() {
    state.depthChoice = '';
    state.aiSkipDeep = false;
    state.aiDeepPrompt = null;
    state.aiDeepStatus = '';
    state.deepAnswer = '';
  }

  function resetUnderstandingState() {
    state.aiUnderstanding = null;
    state.aiUnderstandingStatus = '';
    state.understandingVerdict = '';
    state.understandingCorrection = '';
    state.understandingRevision = 0;
    resetDepthState();
  }

  async function callAi(path, payload) {
    if (!AI_API_BASE) throw Object.assign(new Error('AI 서버가 연결되지 않았어요.'), { code: 'AI_NOT_CONFIGURED' });
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${AI_API_BASE}${path}?v=evidence-v0.3`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-remind-session': SESSION_ID
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(body.error?.message || 'AI 연결이 원활하지 않아요.');
        error.code = body.error?.code || 'AI_UNAVAILABLE';
        throw error;
      }
      return body;
    } catch (error) {
      if (error.name === 'AbortError') throw Object.assign(new Error('AI 응답이 늦어 기본 질문으로 이어갈게요.'), { code: 'AI_TIMEOUT' });
      throw error;
    } finally {
      window.clearTimeout(timer);
    }
  }

  function setAiLoading(button, status, message, statusCopy = '작성한 답에 맞는 다음 질문 하나를 고르고 있어요.') {
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.dataset.idleLabel = button.textContent;
    button.textContent = message;
    if (status) status.textContent = statusCopy;
  }

  function clearAiLoading(button, status) {
    button.removeAttribute('aria-busy');
    button.textContent = button.dataset.idleLabel || button.textContent;
    button.disabled = false;
    if (status) status.textContent = '';
  }

  async function prepareAiQuestion(phase, button, status) {
    if (!aiModeActive()) return true;
    setAiLoading(button, status, '다음 질문을 고르는 중…');
    try {
      const response = await callAi('/v1/reflection/next', {
        consent: true,
        phase,
        answers: aiAnswers()
      });
      if (phase === 'after_story') {
        state.aiMomentPrompt = response.prompt;
        state.aiMomentStatus = 'ai';
        state.aiSkipMoment = response.prompt?.route === 'use_story_moment';
        if (state.aiSkipMoment) state.moment = response.prompt.extractedMoment;
      } else if (phase === 'after_intensity') {
        state.aiMeaningPrompt = response.prompt;
        state.aiMeaningStatus = 'ai';
      } else {
        state.aiDeepPrompt = response.prompt;
        state.aiDeepStatus = 'ai';
      }
      return true;
    } catch (error) {
      if (error.code === 'SAFETY_CHECK_REQUIRED') {
        state.riskChecked = false;
        riskDialog.showModal();
        return false;
      }
      if (phase === 'after_story') {
        state.aiSkipMoment = false;
        state.aiMomentPrompt = null;
        state.aiMomentStatus = 'fallback';
      } else if (phase === 'after_intensity') {
        state.aiMeaningPrompt = null;
        state.aiMeaningStatus = 'fallback';
      } else {
        state.aiDeepPrompt = null;
        state.aiDeepStatus = 'fallback';
      }
      return true;
    } finally {
      clearAiLoading(button, status);
    }
  }

  async function prepareAiUnderstanding(button, status) {
    const fallback = {
      moment: clipCopy(state.moment, 48),
      meaning: clipCopy(state.understandingCorrection.trim() || state.meaning, 48),
      emotion: clipCopy([...state.emotions, state.customEmotion.trim()].filter(Boolean)[0] || '잘 모르겠음', 24)
    };
    if (!aiModeActive()) {
      state.aiUnderstanding = fallback;
      state.aiUnderstandingStatus = 'fallback';
      return true;
    }
    setAiLoading(button, status, '내 말을 다시 살펴보는 중…', '적어준 말 안에서 핵심 표현을 고르고 있어요.');
    try {
      const response = await callAi('/v1/reflection/understanding', { consent: true, answers: aiAnswers() });
      state.aiUnderstanding = {
        moment: clipCopy(response.reflection?.moment || fallback.moment, 48),
        meaning: clipCopy(response.reflection?.meaning || fallback.meaning, 48),
        emotion: clipCopy(response.reflection?.emotion || fallback.emotion, 24)
      };
      state.aiUnderstandingStatus = 'ai';
      return true;
    } catch (error) {
      if (error.code === 'SAFETY_CHECK_REQUIRED') {
        state.riskChecked = false;
        riskDialog.showModal();
        return false;
      }
      state.aiUnderstanding = fallback;
      state.aiUnderstandingStatus = 'fallback';
      return true;
    } finally {
      clearAiLoading(button, status);
    }
  }

  async function prepareAiMap(button, status) {
    if (!aiModeActive()) return true;
    setAiLoading(button, status, '마음 지도를 정리하는 중…');
    try {
      const response = await callAi('/v1/reflection/map', { consent: true, answers: aiAnswers() });
      state.aiMap = response.map;
      state.aiMapStatus = 'ai';
      return true;
    } catch (error) {
      if (error.code === 'SAFETY_CHECK_REQUIRED') {
        state.riskChecked = false;
        riskDialog.showModal();
        return false;
      }
      state.aiMap = null;
      state.aiMapStatus = 'fallback';
      return true;
    } finally {
      clearAiLoading(button, status);
    }
  }

  function aiContextMarkup(status, successCopy) {
    if (status === 'ai') {
      return `<div class="ai-context"><strong>답에 맞춰 이어지는 질문</strong><span>${escapeHtml(successCopy)}</span></div>`;
    }
    if (status === 'fallback') {
      return '<div class="ai-context fallback"><strong>기본 질문으로 이어가요</strong><span>AI 연결이 늦거나 불안정해도 적은 내용은 사라지지 않아요.</span></div>';
    }
    return '';
  }

  function activeScreenIndexes() {
    return screens.map((screen, index) => ({ screen, index }))
      .filter(({ screen }) => !screen.conditional || screen.conditional())
      .map(({ index }) => index);
  }

  function progressInfo() {
    const active = activeScreenIndexes();
    const position = Math.max(0, active.indexOf(state.step));
    const meaningfulTotal = active.length - 2;
    const meaningfulPosition = Math.max(0, Math.min(meaningfulTotal, position));
    const currentStage = screens[state.step].stage;
    return {
      percent: meaningfulTotal ? Math.round((meaningfulPosition / meaningfulTotal) * 100) : 0,
      label: state.step === 0 ? '마음 정리 시작' : `${stageLabels[currentStage]} · ${meaningfulPosition}단계`
    };
  }

  function renderProgress() {
    const info = progressInfo();
    progressFill.style.transform = `scaleX(${info.percent / 100})`;
    progressLabel.textContent = info.label;
    const currentStage = screens[state.step].stage;
    foldProgress.innerHTML = stageLabels.map((label, index) => {
      const className = index < currentStage ? 'done' : (index === currentStage ? 'current' : '');
      return `<div class="fold-step ${className}">${label}</div>`;
    }).join('');
  }

  function renderTopActions() {
    if (state.step === 0 || screens[state.step].id === 'done') {
      topActions.innerHTML = '<span></span><span></span>';
      return;
    }
    topActions.innerHTML = `<button class="back-button" type="button" id="back-button">${backIcon}<span>이전</span></button><span></span>`;
    document.getElementById('back-button').addEventListener('click', goBack);
  }

  function render(pushHistory = false) {
    const screen = screens[state.step];
    renderProgress();
    renderTopActions();
    content.classList.remove('session-content');
    void content.offsetWidth;
    content.classList.add('session-content');
    screen.render();
    researchTracker.visit(screen.id);
    if (pushHistory) {
      history.pushState({ step: state.step }, '', `#${screen.id}`);
    } else {
      history.replaceState({ step: state.step }, '', `#${screen.id}`);
    }
    document.getElementById('screen-wrap').scrollTo({ top: 0, behavior: 'instant' });
    requestAnimationFrame(() => {
      const heading = content.querySelector('h1');
      if (heading && state.step > 0) heading.focus({ preventScroll: true });
    });
  }

  function getNextIndex(from = state.step) {
    let index = from + 1;
    while (index < screens.length && screens[index].conditional && !screens[index].conditional()) index += 1;
    return Math.min(index, screens.length - 1);
  }

  function getPreviousIndex(from = state.step) {
    let index = from - 1;
    while (index > 0 && screens[index].conditional && !screens[index].conditional()) index -= 1;
    return Math.max(index, 0);
  }

  function goNext() {
    if (state.returnToMap && screens[state.step].id !== 'map') {
      state.returnToMap = false;
      state.step = screens.findIndex(screen => screen.id === 'map');
    } else {
      state.step = getNextIndex();
    }
    render(true);
  }

  function goBack() {
    history.back();
  }

  function jumpTo(screenId, returnToMap = false) {
    const index = screens.findIndex(screen => screen.id === screenId);
    if (index < 0) return;
    state.aiMap = null;
    state.aiMapStatus = '';
    if (screenId === 'story' || screenId === 'moment') state.aiSkipMoment = false;
    state.returnToMap = returnToMap;
    state.step = index;
    render(true);
  }

  function choiceMarkup(options, selected, multi = false) {
    const selection = multi ? selected : [selected];
    return options.map(option => {
      const item = typeof option === 'string' ? { value: option, detail: '' } : option;
      const isSelected = selection.includes(item.value);
      return `<button class="choice" type="button" data-choice="${escapeHtml(item.value)}" aria-pressed="${isSelected}">
        <span class="choice-copy"><span class="choice-title">${escapeHtml(item.label || item.value)}</span>${item.detail ? `<span class="choice-detail">${escapeHtml(item.detail)}</span>` : ''}</span>
        <span class="choice-mark" aria-hidden="true">${checkIcon}</span>
      </button>`;
    }).join('');
  }

  function chipMarkup(options, selected) {
    return options.map(value => `<button class="chip" type="button" data-chip="${escapeHtml(value)}" aria-pressed="${selected.includes(value)}">${escapeHtml(value)}</button>`).join('');
  }

  function bindSingleChoice(key, buttonId) {
    content.querySelectorAll('[data-choice]').forEach(button => {
      button.addEventListener('click', () => {
        state[key] = button.dataset.choice;
        content.querySelectorAll('[data-choice]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        document.getElementById(buttonId).disabled = false;
      });
    });
  }

  function bindMultiChips(key, buttonId) {
    content.querySelectorAll('[data-chip]').forEach(button => {
      button.addEventListener('click', () => {
        const value = button.dataset.chip;
        const selected = state[key];
        const nextSelected = selected.includes(value)
          ? selected.filter(item => item !== value)
          : [...selected, value];
        state[key] = nextSelected;
        state.aiMap = null;
        state.aiMapStatus = '';
        if (key === 'emotions') {
          state.aiMeaningPrompt = null;
          state.aiMeaningStatus = '';
          resetUnderstandingState();
        }
        if (key === 'needs') {
          resetDepthState();
        }
        button.setAttribute('aria-pressed', String(nextSelected.includes(value)));
        document.getElementById(buttonId).disabled = nextSelected.length === 0 && !state[key === 'emotions' ? 'customEmotion' : 'customNeed'].trim();
      });
    });
  }

  function updateRangeVisual(input) {
    const min = Number(input.min || 0);
    const max = Number(input.max || 10);
    const value = Number(input.value);
    const percent = ((value - min) / (max - min)) * 100;
    input.style.setProperty('--range-progress', `${percent}%`);
  }

  function checkRiskBeforeContinue(text) {
    if (!state.riskChecked && riskPattern.test(text)) {
      riskDialog.showModal();
      return true;
    }
    return false;
  }

  function renderWelcome() {
    const aiAvailable = Boolean(AI_API_BASE);
    if (!aiAvailable) state.mode = 'static';
    const railPrivacy = document.getElementById('rail-privacy');
    railPrivacy.textContent = state.mode === 'ai'
      ? '동의한 답변만 질문 생성 시 전송하며 Re:Mind는 저장하지 않습니다.'
      : '기본 질문은 입력 내용을 서버에 보내거나 저장하지 않습니다.';
    content.innerHTML = `
      <h1 class="question" tabindex="-1">말을 잘 고르지 않아도 괜찮아요.</h1>
      <p class="lead">지금 마음에 걸리는 일을 한 질문씩 천천히 따라가 볼게요. 답하기 어려운 질문은 건너뛰어도 돼요.</p>
      <fieldset class="mode-panel">
        <legend class="mode-title">질문 방식을 골라주세요</legend>
        <label class="mode-option">
          <input type="radio" name="session-mode" value="ai" ${state.mode === 'ai' ? 'checked' : ''} ${aiAvailable ? '' : 'disabled'} />
          <span class="mode-copy"><span class="mode-name">내 답에 맞는 질문 받기</span><span class="mode-detail">Claude가 방금 적은 답을 보고 다음 질문 하나를 고릅니다.${aiAvailable ? '' : ' AI 서버 연결 후 사용할 수 있어요.'}</span></span>
        </label>
        <label class="mode-option">
          <input type="radio" name="session-mode" value="static" ${state.mode === 'static' ? 'checked' : ''} />
          <span class="mode-copy"><span class="mode-name">기본 질문으로만 진행하기</span><span class="mode-detail">외부 전송 없이 미리 정한 질문 순서로 살펴봅니다.</span></span>
        </label>
      </fieldset>
      <div class="consent-panel" id="ai-consent-panel" ${state.mode === 'ai' ? '' : 'hidden'}>
        <span>AI 질문을 선택하면 목표와 작성한 답변 일부가 질문 생성 목적으로 Anthropic API에 전송됩니다. Re:Mind 서버에는 저장하지 않습니다.</span>
        <label class="consent-check"><input type="checkbox" id="ai-consent" ${state.aiConsent ? 'checked' : ''} /><span>전송 내용을 확인했고 AI 질문 사용에 동의해요.</span></label>
      </div>
      <div class="privacy-note">${lockIcon}<span id="privacy-copy">${state.mode === 'ai' ? '동의한 답변만 질문 생성 시 전송되며, 새로고침하면 이 화면의 내용은 사라집니다.' : '작성한 내용은 이 기기에만 잠시 머물고, 서버로 전송되지 않아요. 새로고침하면 모두 사라집니다.'}</span></div>
      <div class="action-zone sticky-mobile">
        <button class="primary-button" type="button" id="start-button" ${state.mode === 'ai' && !state.aiConsent ? 'disabled' : ''}>내 마음부터 살펴보기</button>
        <button class="safety-button" type="button" data-open-safety>지금 위험하거나 안전하지 않다면</button>
      </div>`;
    const consentPanel = document.getElementById('ai-consent-panel');
    const consentInput = document.getElementById('ai-consent');
    const startButton = document.getElementById('start-button');
    const privacyCopy = document.getElementById('privacy-copy');
    content.querySelectorAll('input[name="session-mode"]').forEach(input => input.addEventListener('change', () => {
      state.mode = input.value;
      consentPanel.hidden = state.mode !== 'ai';
      startButton.disabled = state.mode === 'ai' && !state.aiConsent;
      railPrivacy.textContent = state.mode === 'ai'
        ? '동의한 답변만 질문 생성 시 전송하며 Re:Mind는 저장하지 않습니다.'
        : '기본 질문은 입력 내용을 서버에 보내거나 저장하지 않습니다.';
      privacyCopy.textContent = state.mode === 'ai'
        ? '동의한 답변만 질문 생성 시 전송되며, 새로고침하면 이 화면의 내용은 사라집니다.'
        : '작성한 내용은 이 기기에만 잠시 머물고, 서버로 전송되지 않아요. 새로고침하면 모두 사라집니다.';
    }));
    consentInput.addEventListener('change', () => {
      state.aiConsent = consentInput.checked;
      startButton.disabled = state.mode === 'ai' && !state.aiConsent;
    });
    document.getElementById('start-button').addEventListener('click', () => {
      if (state.mode === 'ai' && (!state.aiConsent || !AI_API_BASE)) return;
      state.startedAt = Date.now();
      researchTracker.start();
      goNext();
    });
    bindSafetyButtons();
  }

  function renderGoal() {
    content.innerHTML = `
      <h1 class="question compact" tabindex="-1">오늘 이 시간이 끝났을 때, 무엇이 조금 더 선명해졌으면 하나요?</h1>
      <p class="lead">가장 가까운 것을 하나 골라주세요. 도중에 마음이 달라져도 괜찮아요.</p>
      <div class="choice-list">${choiceMarkup(goalOptions, state.goal)}</div>
      <div class="action-zone sticky-mobile">
        <button class="primary-button" type="button" id="goal-next" ${state.goal ? '' : 'disabled'}>이 마음으로 시작할게요</button>
        <button class="safety-button" type="button" data-open-safety>지금 위험한 상황인가요?</button>
      </div>`;
    bindSingleChoice('goal', 'goal-next');
    document.getElementById('goal-next').addEventListener('click', goNext);
    bindSafetyButtons();
  }

  function renderClarityBefore() {
    content.innerHTML = `
      <h1 class="question" tabindex="-1">지금은 내 마음을 얼마나 알고 있는 것 같나요?</h1>
      <p class="lead">정확하게 재려는 질문은 아니에요. 지금 느낌에 가까운 숫자를 골라주세요.</p>
      <div class="range-block">
        <div class="range-reading"><span class="range-value" id="range-reading">${state.clarityBefore}</span><span class="range-unit">10점 중</span></div>
        <label class="visually-hidden" for="clarity-before-range">시작 전 마음 명료도</label>
        <input id="clarity-before-range" type="range" min="0" max="10" step="1" value="${state.clarityBefore}" />
        <div class="range-ends"><span>잘 모르겠어요</span><span>꽤 분명해요</span></div>
      </div>
      <div class="action-zone sticky-mobile">
        <button class="primary-button" type="button" id="clarity-before-next">이 정도예요</button>
        <button class="safety-button" type="button" data-open-safety>지금 위험한 상황인가요?</button>
      </div>`;
    const range = document.getElementById('clarity-before-range');
    updateRangeVisual(range);
    range.addEventListener('input', () => {
      state.clarityBefore = Number(range.value);
      document.getElementById('range-reading').textContent = range.value;
      updateRangeVisual(range);
    });
    document.getElementById('clarity-before-next').addEventListener('click', goNext);
    bindSafetyButtons();
  }

  function renderStory() {
    content.innerHTML = `
      <h1 class="question" tabindex="-1">무슨 일이 있었나요?</h1>
      <p class="lead">정리해서 설명하지 않아도 괜찮아요. 지금 떠오르는 순서대로 적어주세요.</p>
      <div class="field">
        <label class="field-label" for="story-input">내가 겪은 일</label>
        <textarea id="story-input" maxlength="1200" placeholder="예: 어제 만나기로 했는데 갑자기 약속이 바뀌었어요…">${escapeHtml(state.story)}</textarea>
        <span class="field-helper">상대에게 보여주기 위한 글이 아니니 표현을 다듬지 않아도 돼요.</span>
      </div>
      <div class="action-zone sticky-mobile">
        <button class="primary-button" type="button" id="story-next" ${state.story.trim() ? '' : 'disabled'}>${state.returnToMap ? '수정한 내용으로 지도 보기' : '조금 더 살펴볼게요'}</button>
        <button class="safety-button" type="button" data-open-safety>지금 위험한 상황인가요?</button>
        <p class="status-message" id="ai-status" aria-live="polite"></p>
      </div>`;
    const input = document.getElementById('story-input');
    input.addEventListener('input', () => {
      state.story = input.value;
      state.aiSkipMoment = false;
      state.aiMomentPrompt = null;
      state.aiMomentStatus = '';
      state.aiMeaningPrompt = null;
      state.aiMeaningStatus = '';
      resetUnderstandingState();
      state.aiMap = null;
      state.aiMapStatus = '';
      document.getElementById('story-next').disabled = !state.story.trim();
    });
    document.getElementById('story-next').addEventListener('click', async event => {
      if (checkRiskBeforeContinue(state.story)) return;
      const ready = state.returnToMap
        ? true
        : await prepareAiQuestion('after_story', event.currentTarget, document.getElementById('ai-status'));
      if (ready) goNext();
    });
    bindSafetyButtons();
  }

  function renderMoment() {
    const prompt = state.aiMomentPrompt || {
      question: '그중에서 자꾸 돌아오는 장면이 있나요?',
      lead: '사건 전체보다 마음에 가장 오래 남은 순간 하나만 골라봐요.',
      label: '가장 마음에 남은 순간',
      placeholder: '예: 내 말을 듣기도 전에 괜찮다며 넘겼던 순간'
    };
    content.innerHTML = `
      <h1 class="question${state.aiMomentStatus === 'ai' ? ' ai-generated' : ''}" tabindex="-1">${escapeHtml(prompt.question)}</h1>
      <p class="lead">${escapeHtml(prompt.lead)}</p>
      ${aiContextMarkup(state.aiMomentStatus, '방금 적은 상황에서 아직 선명하지 않은 부분을 묻고 있어요. 질문이 맞지 않으면 내 말로 다르게 답해도 돼요.')}
      <div class="field">
        <label class="field-label" for="moment-input">${escapeHtml(prompt.label)}</label>
        <textarea id="moment-input" maxlength="600" placeholder="${escapeHtml(prompt.placeholder)}">${escapeHtml(state.moment)}</textarea>
        <span class="field-helper">딱 떠오르는 장면이 없다면 “전체적으로 답답했다”처럼 적어도 괜찮아요.</span>
      </div>
      <div class="action-zone sticky-mobile">
        <button class="primary-button" type="button" id="moment-next" ${state.moment.trim() ? '' : 'disabled'}>${state.returnToMap ? '수정한 내용으로 지도 보기' : '그때의 마음을 볼게요'}</button>
        <button class="safety-button" type="button" data-open-safety>지금 위험한 상황인가요?</button>
      </div>`;
    const input = document.getElementById('moment-input');
    input.addEventListener('input', () => {
      state.moment = input.value;
      state.aiMeaningPrompt = null;
      state.aiMeaningStatus = '';
      resetUnderstandingState();
      state.aiMap = null;
      state.aiMapStatus = '';
      document.getElementById('moment-next').disabled = !state.moment.trim();
    });
    document.getElementById('moment-next').addEventListener('click', () => {
      if (!checkRiskBeforeContinue(state.moment)) goNext();
    });
    bindSafetyButtons();
  }

  function renderEmotion() {
    content.innerHTML = `
      <h1 class="question" tabindex="-1">그 장면에서 마음은 어떤 쪽에 가까웠나요?</h1>
      <p class="lead">한 가지로 딱 맞지 않아도 괜찮아요. 가까운 감정을 여러 개 골라도 돼요.</p>
      ${state.aiSkipMoment ? '<div class="ai-context"><strong>겹치는 질문은 건너뛰었어요</strong><span>처음 적은 답 안에 구체적인 장면이 이미 있어, 같은 내용을 다시 묻지 않았어요.</span></div>' : ''}
      <div class="chip-grid" aria-label="감정 선택">${chipMarkup(emotions, state.emotions)}</div>
      <div class="field">
        <label class="field-label" for="custom-emotion">목록에 없는 마음이 있다면</label>
        <input class="text-input" id="custom-emotion" maxlength="80" value="${escapeHtml(state.customEmotion)}" placeholder="내 말로 적어볼게요" />
      </div>
      <div class="action-zone sticky-mobile">
        <button class="primary-button" type="button" id="emotion-next" ${(state.emotions.length || state.customEmotion.trim()) ? '' : 'disabled'}>${state.returnToMap ? '수정한 내용으로 지도 보기' : '이 마음의 크기도 볼게요'}</button>
        <button class="safety-button" type="button" data-open-safety>지금 위험한 상황인가요?</button>
      </div>`;
    bindMultiChips('emotions', 'emotion-next');
    const input = document.getElementById('custom-emotion');
    input.addEventListener('input', () => {
      state.customEmotion = input.value;
      state.aiMeaningPrompt = null;
      state.aiMeaningStatus = '';
      resetUnderstandingState();
      state.aiMap = null;
      state.aiMapStatus = '';
      document.getElementById('emotion-next').disabled = state.emotions.length === 0 && !state.customEmotion.trim();
    });
    document.getElementById('emotion-next').addEventListener('click', goNext);
    bindSafetyButtons();
  }

  function renderIntensity() {
    content.innerHTML = `
      <h1 class="question" tabindex="-1">그 감정은 지금 얼마나 크게 남아 있나요?</h1>
      <p class="lead">그때가 아니라, 지금 이 화면을 보고 있는 순간을 기준으로 골라주세요.</p>
      <div class="range-block">
        <div class="range-reading"><span class="range-value" id="range-reading">${state.intensity}</span><span class="range-unit">10점 중</span></div>
        <label class="visually-hidden" for="intensity-range">현재 감정 강도</label>
        <input id="intensity-range" type="range" min="0" max="10" step="1" value="${state.intensity}" />
        <div class="range-ends"><span>거의 가라앉았어요</span><span>아주 크게 남아 있어요</span></div>
      </div>
      <div class="action-zone sticky-mobile">
        <button class="primary-button" type="button" id="intensity-next">이 정도예요</button>
        <button class="safety-button" type="button" data-open-safety>지금 위험한 상황인가요?</button>
        <p class="status-message" id="ai-status" aria-live="polite"></p>
      </div>`;
    const range = document.getElementById('intensity-range');
    updateRangeVisual(range);
    range.addEventListener('input', () => {
      state.intensity = Number(range.value);
      state.aiMeaningPrompt = null;
      state.aiMeaningStatus = '';
      resetUnderstandingState();
      state.aiMap = null;
      state.aiMapStatus = '';
      document.getElementById('range-reading').textContent = range.value;
      updateRangeVisual(range);
    });
    document.getElementById('intensity-next').addEventListener('click', async event => {
      if (state.intensity >= 8) {
        goNext();
        return;
      }
      const ready = await prepareAiQuestion('after_intensity', event.currentTarget, document.getElementById('ai-status'));
      if (ready) goNext();
    });
    bindSafetyButtons();
  }

  function renderPause() {
    content.innerHTML = `
      <h1 class="question compact" tabindex="-1">지금은 이해보다 숨을 돌리는 게 먼저일 수 있어요.</h1>
      <p class="lead">감정을 없애려는 시간이 아니에요. 몸이 이 자리에 있다는 것만 잠깐 확인해 볼까요?</p>
      <div class="pause-panel">
        <p class="pause-prompt" id="pause-prompt">발바닥이 바닥에 닿는 감각을 느껴보세요.</p>
        <p class="pause-instruction" id="pause-instruction">어깨에 들어간 힘을 조금 풀고, 평소보다 천천히 숨을 내쉬어도 좋아요.</p>
        <div class="pause-timer">
          <div class="timer-line" id="timer-line" aria-hidden="true"><span></span></div>
          <span class="timer-number" id="timer-number">20초</span>
        </div>
      </div>
      <div class="action-zone sticky-mobile">
        <button class="primary-button" type="button" id="pause-start">${state.pauseCompleted ? '조금 쉬었어요' : '20초만 멈춰볼게요'}</button>
        <button class="secondary-button" type="button" id="pause-skip">지금은 괜찮아요, 이어갈게요</button>
        <button class="safety-button" type="button" data-open-safety>지금 위험한 상황인가요?</button>
        <p class="status-message" id="ai-status" aria-live="polite"></p>
      </div>`;
    let timerId = null;
    let remaining = 20;
    const start = document.getElementById('pause-start');
    const skip = document.getElementById('pause-skip');
    const continueFromPause = async button => {
      const ready = await prepareAiQuestion('after_intensity', button, document.getElementById('ai-status'));
      if (ready) goNext();
    };
    if (state.pauseCompleted) start.addEventListener('click', () => continueFromPause(start));
    else start.addEventListener('click', () => {
      start.disabled = true;
      skip.disabled = true;
      document.getElementById('timer-line').classList.add('running');
      timerId = window.setInterval(() => {
        remaining -= 1;
        document.getElementById('timer-number').textContent = remaining > 0 ? `${remaining}초` : '됐어요';
        if (remaining <= 0) {
          window.clearInterval(timerId);
          state.pauseCompleted = true;
          document.getElementById('pause-prompt').textContent = '지금 마음이 그대로여도 괜찮아요.';
          document.getElementById('pause-instruction').textContent = '조금 더 살펴볼 수 있을 때 다음으로 이어가요.';
          start.disabled = false;
          start.textContent = '이제 이어갈게요';
          start.addEventListener('click', () => continueFromPause(start), { once: true });
          skip.disabled = false;
        }
      }, 1000);
    }, { once: true });
    skip.addEventListener('click', async () => {
      if (timerId) window.clearInterval(timerId);
      await continueFromPause(skip);
    });
    bindSafetyButtons();
  }

  function renderMeaning() {
    const prompt = state.aiMeaningPrompt || {
      question: '그 순간, 나에게는 어떤 뜻으로 느껴졌나요?',
      lead: '상대의 실제 의도를 맞히는 질문은 아니에요. 그 일이 내 마음에 어떻게 닿았는지 적어주세요.',
      label: '내가 받아들인 의미',
      placeholder: '예: 내 마음이 중요하지 않은 것처럼 느껴졌어요'
    };
    content.innerHTML = `
      <h1 class="question${state.aiMeaningStatus === 'ai' ? ' ai-generated' : ''}" tabindex="-1">${escapeHtml(prompt.question)}</h1>
      <p class="lead">${escapeHtml(prompt.lead)}</p>
      ${aiContextMarkup(state.aiMeaningStatus, '지금까지 고른 감정과 강도를 보고, 상대의 속마음이 아니라 내 경험을 더 분명히 볼 수 있는 질문을 골랐어요.')}
      <div class="field">
        <label class="field-label" for="meaning-input">${escapeHtml(prompt.label)}</label>
        <textarea id="meaning-input" maxlength="600" placeholder="${escapeHtml(prompt.placeholder)}">${escapeHtml(state.meaning)}</textarea>
        <span class="field-helper">“상대는 분명히…”보다 “나에게는 …처럼 느껴졌다”로 시작하면 구분하기 쉬워요.</span>
      </div>
      <div class="action-zone sticky-mobile">
        <button class="primary-button" type="button" id="meaning-next" ${state.meaning.trim() ? '' : 'disabled'}>${state.returnToMap ? '수정한 내용으로 지도 보기' : '내가 이해된 방향을 확인할게요'}</button>
        <button class="safety-button" type="button" data-open-safety>지금 위험한 상황인가요?</button>
      </div>`;
    const input = document.getElementById('meaning-input');
    input.addEventListener('input', () => {
      state.meaning = input.value;
      state.aiUnderstanding = null;
      state.aiUnderstandingStatus = '';
      state.understandingVerdict = '';
      state.understandingCorrection = '';
      state.understandingRevision = 0;
      resetDepthState();
      state.aiMap = null;
      state.aiMapStatus = '';
      document.getElementById('meaning-next').disabled = !state.meaning.trim();
    });
    document.getElementById('meaning-next').addEventListener('click', async event => {
      if (checkRiskBeforeContinue(state.meaning)) return;
      if (state.returnToMap) {
        goNext();
        return;
      }
      const ready = await prepareAiUnderstanding(event.currentTarget, null);
      if (ready) goNext();
    });
    bindSafetyButtons();
  }

  function renderUnderstanding() {
    const reflection = state.aiUnderstanding || {
      moment: clipCopy(state.moment, 48),
      meaning: clipCopy(state.understandingCorrection.trim() || state.meaning, 48),
      emotion: clipCopy([...state.emotions, state.customEmotion.trim()].filter(Boolean)[0] || '잘 모르겠음', 24)
    };
    const showCorrection = state.understandingVerdict === 'different';
    content.innerHTML = `
      <h1 class="question compact" tabindex="-1">제가 이해한 방향이 맞는지 확인할게요.</h1>
      <p class="lead">AI가 정답을 내린 게 아니에요. 적어준 말에서 고른 표현이 내 마음과 가까운지만 봐주세요.</p>
      ${aiContextMarkup(state.aiUnderstandingStatus, '새로운 의미를 덧붙이지 않고, 직접 적은 말과 고른 감정 안에서 핵심 표현만 가져왔어요.')}
      <div class="understanding-sheet">
        <div class="understanding-line"><span class="understanding-label">가장 남은 순간</span><p class="understanding-value">“${escapeHtml(reflection.moment)}”</p></div>
        <div class="understanding-line"><span class="understanding-label">그때 나에게 닿은 뜻</span><p class="understanding-value">“${escapeHtml(reflection.meaning)}”</p></div>
        <div class="understanding-line"><span class="understanding-label">가까운 감정</span><p class="understanding-value">${escapeHtml(reflection.emotion)}</p></div>
      </div>
      <p class="understanding-question">이 정리가 지금 내 마음과 가까운가요?</p>
      <div class="choice-list">
        ${choiceMarkup([
          { value: 'close', detail: '이 방향으로 조금 더 이어가 볼게요.' },
          { value: 'different', detail: '다른 부분을 내 말로 바로잡을게요.' },
          { value: 'unsure', detail: '확정하지 않고 지금 표현 그대로 가져가요.' }
        ].map(item => ({
          value: item.value,
          detail: item.detail,
          label: item.value === 'close' ? '네, 가까워요' : item.value === 'different' ? '조금 달라요' : '아직 잘 모르겠어요'
        })), state.understandingVerdict)}
      </div>
      ${showCorrection ? `<div class="field">
        <label class="field-label" for="understanding-correction">어떤 부분이 다른가요?</label>
        <textarea id="understanding-correction" maxlength="600" placeholder="예: 무시당했다기보다, 혼자 결정된 느낌이 더 서운했어요">${escapeHtml(state.understandingCorrection)}</textarea>
        <span class="field-helper">다시 확인은 두 번까지만 해요. 내 표현이 가장 중요하니까요.</span>
      </div>` : ''}
      <div class="action-zone sticky-mobile">
        <button class="primary-button" type="button" id="understanding-next" ${state.understandingVerdict && (!showCorrection || state.understandingCorrection.trim()) ? '' : 'disabled'}>${showCorrection ? (state.understandingRevision >= 2 ? '내 설명 그대로 이어갈게요' : '내 말로 다시 확인할게요') : '이 이해로 이어갈게요'}</button>
        <button class="safety-button" type="button" data-open-safety>지금 위험한 상황인가요?</button>
        <p class="status-message" id="ai-status" aria-live="polite"></p>
      </div>`;

    content.querySelectorAll('[data-choice]').forEach(button => {
      const value = button.dataset.choice;
      button.addEventListener('click', () => {
        state.understandingVerdict = value;
        render();
      });
    });

    const correction = document.getElementById('understanding-correction');
    if (correction) correction.addEventListener('input', () => {
      state.understandingCorrection = correction.value;
      document.getElementById('understanding-next').disabled = !state.understandingCorrection.trim();
    });

    document.getElementById('understanding-next').addEventListener('click', async event => {
      if (showCorrection && checkRiskBeforeContinue(state.understandingCorrection)) return;
      if (showCorrection && state.understandingRevision < 2) {
        state.understandingRevision += 1;
        const ready = await prepareAiUnderstanding(event.currentTarget, document.getElementById('ai-status'));
        if (ready) {
          state.understandingVerdict = '';
          render();
        }
        return;
      }
      goNext();
    });
    bindSafetyButtons();
  }

  function renderNeed() {
    content.innerHTML = `
      <h1 class="question compact" tabindex="-1">그 마음 안에서, 내가 지키고 싶었던 것은 무엇이었을까요?</h1>
      <p class="lead">감정이 컸다는 건 나에게 중요했던 것이 있었다는 뜻일 수 있어요. 가까운 것을 골라주세요.</p>
      <div class="chip-grid" aria-label="중요했던 마음 선택">${chipMarkup(needs, state.needs)}</div>
      <div class="field">
        <label class="field-label" for="custom-need">내 말로 적고 싶다면</label>
        <input class="text-input" id="custom-need" maxlength="80" value="${escapeHtml(state.customNeed)}" placeholder="나에게 중요했던 것" />
      </div>
      <div class="action-zone sticky-mobile">
        <button class="primary-button" type="button" id="need-next" ${(state.needs.length || state.customNeed.trim()) ? '' : 'disabled'}>${state.returnToMap ? '수정한 내용으로 지도 보기' : '조금 더 볼지 정할게요'}</button>
        <button class="safety-button" type="button" data-open-safety>지금 위험한 상황인가요?</button>
        <p class="status-message" id="ai-status" aria-live="polite"></p>
      </div>`;
    bindMultiChips('needs', 'need-next');
    const input = document.getElementById('custom-need');
    input.addEventListener('input', () => {
      state.customNeed = input.value;
      resetDepthState();
      state.aiMap = null;
      state.aiMapStatus = '';
      document.getElementById('need-next').disabled = state.needs.length === 0 && !state.customNeed.trim();
    });
    document.getElementById('need-next').addEventListener('click', goNext);
    bindSafetyButtons();
  }

  function renderDepthChoice() {
    const options = [
      { value: 'deeper', label: '한 질문만 더 이어갈래요', detail: '지금까지의 답에서 아직 남은 한 지점을 살펴봐요.' },
      { value: 'organize', label: '지금까지의 마음을 정리할래요', detail: '더 답하지 않고 내가 확인한 내용으로 넘어가요.' }
    ];
    content.innerHTML = `
      <h1 class="question compact" tabindex="-1">여기서 한 걸음 더 들어가 볼까요?</h1>
      <p class="lead">더 오래 답한다고 더 잘한 세션은 아니에요. 지금 내 마음에 맞는 쪽을 골라주세요.</p>
      <div class="choice-list">${choiceMarkup(options, state.depthChoice)}</div>
      <div class="action-zone sticky-mobile">
        <button class="primary-button" type="button" id="depth-choice-next" ${state.depthChoice ? '' : 'disabled'}>${state.depthChoice === 'organize' ? '이제 정리할게요' : '한 질문 더 볼게요'}</button>
        <button class="safety-button" type="button" data-open-safety>지금 위험한 상황인가요?</button>
        <p class="status-message" id="ai-status" aria-live="polite"></p>
      </div>`;
    bindSingleChoice('depthChoice', 'depth-choice-next');
    content.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => {
      document.getElementById('depth-choice-next').textContent = button.dataset.choice === 'organize' ? '이제 정리할게요' : '한 질문 더 볼게요';
    }));
    document.getElementById('depth-choice-next').addEventListener('click', async event => {
      state.aiSkipDeep = state.depthChoice !== 'deeper';
      if (state.aiSkipDeep) {
        state.aiDeepPrompt = null;
        state.aiDeepStatus = '';
        state.deepAnswer = '';
        const ready = await prepareAiMap(event.currentTarget, document.getElementById('ai-status'));
        if (ready) goNext();
        return;
      }
      const ready = await prepareAiQuestion('after_need', event.currentTarget, document.getElementById('ai-status'));
      if (ready) goNext();
    });
    bindSafetyButtons();
  }

  function renderDeep() {
    const prompt = state.aiDeepPrompt || {
      question: '그 순간 차마 하지 못한 말이 있나요?',
      lead: '상대에게 보낼 문장이 아니에요. 내 안에 남은 말 하나만 적어봐요.',
      label: '하지 못한 말',
      placeholder: '예: 나도 내 상황을 먼저 물어봐 주길 바랐어'
    };
    content.innerHTML = `
      <h1 class="question${state.aiDeepStatus === 'ai' ? ' ai-generated' : ''}" tabindex="-1">${escapeHtml(prompt.question)}</h1>
      <p class="lead">${escapeHtml(prompt.lead)}</p>
      ${aiContextMarkup(state.aiDeepStatus, '지금까지 답한 내용을 반복하지 않고, 직접 고른 목표에 맞춰 한 질문만 더 골랐어요.')}
      <div class="field">
        <label class="field-label" for="deep-input">${escapeHtml(prompt.label)}</label>
        <textarea id="deep-input" maxlength="600" placeholder="${escapeHtml(prompt.placeholder)}">${escapeHtml(state.deepAnswer)}</textarea>
        <span class="field-helper">정답을 찾지 않아도 괜찮아요. 지금 떠오르는 만큼만 적어주세요.</span>
      </div>
      <div class="action-zone sticky-mobile">
        <button class="primary-button" type="button" id="deep-next" ${state.deepAnswer.trim() ? '' : 'disabled'}>${state.returnToMap ? '수정한 내용으로 지도 보기' : '이제 내 마음을 정리할게요'}</button>
        <button class="safety-button" type="button" data-open-safety>지금 위험한 상황인가요?</button>
        <p class="status-message" id="ai-status" aria-live="polite"></p>
      </div>`;
    const input = document.getElementById('deep-input');
    input.addEventListener('input', () => {
      state.deepAnswer = input.value;
      state.aiMap = null;
      state.aiMapStatus = '';
      document.getElementById('deep-next').disabled = !state.deepAnswer.trim();
    });
    document.getElementById('deep-next').addEventListener('click', async event => {
      if (checkRiskBeforeContinue(state.deepAnswer)) return;
      if (state.returnToMap) {
        goNext();
        return;
      }
      const ready = await prepareAiMap(event.currentTarget, document.getElementById('ai-status'));
      if (ready) goNext();
    });
    bindSafetyButtons();
  }

  function renderMap() {
    const emotionText = state.aiMap?.emotions?.length
      ? state.aiMap.emotions.join(', ')
      : [...state.emotions, state.customEmotion.trim()].filter(Boolean).join(', ');
    const needText = state.aiMap?.needs?.length
      ? state.aiMap.needs.join(', ')
      : [...state.needs, state.customNeed.trim()].filter(Boolean).join(', ');
    const rows = [
      { label: '있었던 일', value: state.aiMap?.event || state.story, target: 'story' },
      { label: '남은 장면', value: state.aiMap?.moment || state.moment, target: 'moment' },
      { label: '느낀 마음', value: emotionText, target: 'emotion' },
      { label: '받아들인 뜻', value: state.aiMap?.meaning || state.meaning, target: 'meaning' },
      { label: '중요했던 것', value: needText, target: 'need' }
    ];
    if (state.deepAnswer.trim()) {
      rows.push({ label: '더 살펴본 마음', value: state.aiMap?.deeper || state.deepAnswer, target: 'deep' });
    }
    content.innerHTML = `
      <h1 class="question compact" tabindex="-1">당신이 적어준 말을 한자리에 놓아봤어요.</h1>
      <p class="lead">내 마음과 다르게 정리된 부분이 있다면 직접 고쳐주세요. 이 내용이 정답은 아니에요.</p>
      ${aiContextMarkup(state.aiMapStatus, 'AI는 새 의미를 덧붙이지 않고, 사용자가 적거나 고른 말 안에서 짧은 구절만 골랐어요. 마음과 다르면 언제든 직접 고칠 수 있어요.')}
      <div class="mind-map">${rows.map(row => `
        <div class="map-row">
          <span class="map-label">${row.label}</span>
          <p class="map-value">${escapeHtml(row.value)}</p>
          <button class="edit-button" type="button" data-edit="${row.target}" aria-label="${row.label} 수정">수정</button>
        </div>`).join('')}</div>
      <div class="action-zone sticky-mobile">
        <button class="primary-button" type="button" id="map-next">이 정도면 내 마음과 가까워요</button>
        <button class="safety-button" type="button" data-open-safety>지금 위험한 상황인가요?</button>
      </div>`;
    content.querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => jumpTo(button.dataset.edit, true)));
    document.getElementById('map-next').addEventListener('click', goNext);
    bindSafetyButtons();
  }

  function renderNext() {
    content.innerHTML = `
      <h1 class="question" tabindex="-1">지금의 나에게 가장 맞는 다음은 무엇인가요?</h1>
      <p class="lead">해결에 가까운 선택이 아니어도 괜찮아요. 지금 할 수 있는 만큼만 골라주세요.</p>
      <div class="choice-list">${choiceMarkup(nextOptions, state.nextChoice)}</div>
      <div class="action-zone sticky-mobile">
        <button class="primary-button" type="button" id="next-choice-button" ${state.nextChoice ? '' : 'disabled'}>이 선택을 가져갈게요</button>
        <button class="safety-button" type="button" data-open-safety>지금 위험한 상황인가요?</button>
      </div>`;
    bindSingleChoice('nextChoice', 'next-choice-button');
    document.getElementById('next-choice-button').addEventListener('click', goNext);
    bindSafetyButtons();
  }

  function renderClarityAfter() {
    content.innerHTML = `
      <h1 class="question" tabindex="-1">지금은 내 마음이 얼마나 보이는 것 같나요?</h1>
      <p class="lead">처음에는 ${state.clarityBefore}점이라고 골랐어요. 더 선명해지지 않았어도 있는 그대로 알려주세요.</p>
      <div class="range-block">
        <div class="range-reading"><span class="range-value" id="range-reading">${state.clarityAfter}</span><span class="range-unit">10점 중</span></div>
        <label class="visually-hidden" for="clarity-after-range">세션 후 마음 명료도</label>
        <input id="clarity-after-range" type="range" min="0" max="10" step="1" value="${state.clarityAfter}" />
        <div class="range-ends"><span>여전히 잘 모르겠어요</span><span>전보다 선명해요</span></div>
      </div>
      <div class="action-zone sticky-mobile">
        <button class="primary-button" type="button" id="clarity-after-next">이 정도예요</button>
        <button class="safety-button" type="button" data-open-safety>지금 위험한 상황인가요?</button>
      </div>`;
    const range = document.getElementById('clarity-after-range');
    updateRangeVisual(range);
    range.addEventListener('input', () => {
      state.clarityAfter = Number(range.value);
      document.getElementById('range-reading').textContent = range.value;
      updateRangeVisual(range);
    });
    document.getElementById('clarity-after-next').addEventListener('click', goNext);
    bindSafetyButtons();
  }

  function scaleMarkup(name, selected) {
    return `<div class="scale-options">${[1, 2, 3, 4, 5].map(value => `
      <label class="scale-option"><input type="radio" name="${name}" value="${value}" ${Number(selected) === value ? 'checked' : ''} /><span>${value}</span></label>`).join('')}</div>
      <div class="scale-labels"><span>전혀 아니에요</span><span>매우 그래요</span></div>`;
  }

  function renderFeedback() {
    content.innerHTML = `
      <h1 class="question" tabindex="-1">이 시간은 어떻게 느껴졌나요?</h1>
      <p class="lead">좋게 평가하지 않아도 괜찮아요. 솔직한 느낌이 다음 버전을 만드는 데 더 도움이 돼요.</p>
      <div class="feedback-grid">
        <fieldset class="feedback-item"><legend>내 말을 내 마음과 가깝게 정리해 줬나요?</legend>${scaleMarkup('understood', state.feedback.understood)}</fieldset>
        <fieldset class="feedback-item"><legend>내가 말하지 않은 것을 멋대로 해석한다고 느꼈나요?</legend>${scaleMarkup('inferred', state.feedback.inferred)}</fieldset>
        <fieldset class="feedback-item"><legend>마지막 선택이 내 몫으로 남아 있었나요?</legend>${scaleMarkup('agency', state.feedback.agency)}</fieldset>
      </div>
      <div class="field">
        <label class="field-label" for="comment-input">한 줄 의견 <span style="font-weight:400;color:var(--muted)">(선택)</span></label>
        <textarea id="comment-input" maxlength="500" placeholder="어색했던 질문이나 빠졌으면 하는 단계가 있었나요?">${escapeHtml(state.comment)}</textarea>
      </div>
      <div class="action-zone sticky-mobile">
        <button class="primary-button" type="button" id="feedback-next" ${feedbackComplete() ? '' : 'disabled'}>테스트를 마칠게요</button>
        <button class="safety-button" type="button" data-open-safety>지금 위험한 상황인가요?</button>
      </div>`;
    content.querySelectorAll('input[type="radio"]').forEach(input => input.addEventListener('change', () => {
      state.feedback[input.name] = Number(input.value);
      document.getElementById('feedback-next').disabled = !feedbackComplete();
    }));
    document.getElementById('comment-input').addEventListener('input', event => { state.comment = event.target.value; });
    document.getElementById('feedback-next').addEventListener('click', goNext);
    bindSafetyButtons();
  }

  function feedbackComplete() {
    return state.feedback.understood > 0 && state.feedback.inferred > 0 && state.feedback.agency > 0;
  }

  function renderDone() {
    const emotionText = [...state.emotions, state.customEmotion.trim()].filter(Boolean).join(', ');
    const needText = [...state.needs, state.customNeed.trim()].filter(Boolean).join(', ');
    content.innerHTML = `
      <h1 class="question" tabindex="-1">마음을 다 정리하지 못해도 괜찮아요.</h1>
      <p class="lead">오늘은 내 마음을 서둘러 결론 내리지 않고 여기까지 바라봤어요.</p>
      <dl class="result-sheet">
        <div class="result-line"><dt>오늘 알아차린 마음</dt><dd>${escapeHtml(emotionText)}${needText ? `<br />그 안에서 ${escapeHtml(needText)}이 중요했어요.` : ''}</dd></div>
        <div class="result-line"><dt>지금 내가 고른 다음</dt><dd>${escapeHtml(state.nextChoice)}</dd></div>
        <div class="result-line"><dt>마음의 선명함</dt><dd>${state.clarityBefore}점에서 ${state.clarityAfter}점</dd></div>
        <div class="result-line"><dt>질문 방식</dt><dd>${state.mode === 'ai' ? '내 답에 맞는 질문' : '기본 질문'}</dd></div>
      </dl>
      <div class="privacy-note">${lockIcon}<span>아래 복사 내용에는 개인적인 상황과 직접 적은 문장을 넣지 않아요. 평가 점수와 한 줄 의견만 복사됩니다.</span></div>
      <div class="action-zone">
        <button class="primary-button" type="button" id="copy-result">테스트 결과 복사하기</button>
        ${researchTracker.enabled ? '<button class="secondary-button" type="button" id="download-research">익명 사용성 기록 저장하기</button>' : ''}
        <button class="secondary-button" type="button" id="restart-session">처음부터 다시 보기</button>
      </div>
      <p class="status-message" id="copy-status" aria-live="polite"></p>`;
    document.getElementById('copy-result').addEventListener('click', copyTestResult);
    document.getElementById('download-research')?.addEventListener('click', downloadResearchRecord);
    document.getElementById('restart-session').addEventListener('click', restartSession);
  }

  function researchSummary() {
    return {
      mode: state.mode,
      goal: state.goal,
      depthChoice: state.depthChoice,
      clarityBefore: state.clarityBefore,
      clarityAfter: state.clarityAfter,
      feedback: state.feedback,
      aiSkipMoment: state.aiSkipMoment,
      aiMomentStatus: state.aiMomentStatus,
      aiMeaningStatus: state.aiMeaningStatus,
      aiUnderstandingStatus: state.aiUnderstandingStatus,
      aiDeepStatus: state.aiDeepStatus,
      aiMapStatus: state.aiMapStatus
    };
  }

  function downloadResearchRecord() {
    researchTracker.download(researchSummary());
    document.getElementById('copy-status').textContent = '개인적인 답변을 제외한 사용성 기록을 저장했어요.';
  }

  function testResultText() {
    const minutes = Math.max(1, Math.round((Date.now() - state.startedAt) / 60000));
    return [
      'Re:Mind 마음 정리 세션 · 초기 테스트 결과',
      '',
      `세션 목표: ${state.goal}`,
      `마음의 명료도: ${state.clarityBefore} → ${state.clarityAfter}`,
      `질문 방식: ${state.mode === 'ai' ? '내 답에 맞는 질문' : '기본 질문'}`,
      `내 말을 가깝게 정리함: ${state.feedback.understood}/5`,
      `과하게 해석한다고 느낌: ${state.feedback.inferred}/5`,
      `선택권이 남아 있었음: ${state.feedback.agency}/5`,
      `내가 고른 다음: ${state.nextChoice}`,
      `소요 시간: 약 ${minutes}분`,
      state.comment.trim() ? `한 줄 의견: ${state.comment.trim()}` : '한 줄 의견: 없음',
      '',
      '※ 개인적인 상황 원문과 감정 서술은 포함하지 않았습니다.'
    ].join('\n');
  }

  async function copyTestResult() {
    const status = document.getElementById('copy-status');
    try {
      await navigator.clipboard.writeText(testResultText());
      status.textContent = '복사했어요. 테스트를 부탁한 사람에게 그대로 보내주세요.';
    } catch (error) {
      const textarea = document.createElement('textarea');
      textarea.value = testResultText();
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      status.textContent = '복사했어요. 테스트를 부탁한 사람에게 그대로 보내주세요.';
    }
  }

  function restartSession() {
    researchTracker.reset();
    Object.assign(state, {
      step: 0,
      startedAt: Date.now(),
      goal: '',
      clarityBefore: 4,
      story: '',
      moment: '',
      emotions: [],
      customEmotion: '',
      intensity: 5,
      meaning: '',
      needs: [],
      customNeed: '',
      nextChoice: '',
      clarityAfter: 5,
      feedback: { understood: 0, inferred: 0, agency: 0 },
      comment: '',
      riskChecked: false,
      pauseCompleted: false,
      returnToMap: false,
      mode: AI_API_BASE ? 'ai' : 'static',
      aiConsent: false,
      aiSkipMoment: false,
      aiMomentPrompt: null,
      aiMomentStatus: '',
      aiMeaningPrompt: null,
      aiMeaningStatus: '',
      aiUnderstanding: null,
      aiUnderstandingStatus: '',
      understandingVerdict: '',
      understandingCorrection: '',
      understandingRevision: 0,
      depthChoice: '',
      aiSkipDeep: false,
      aiDeepPrompt: null,
      aiDeepStatus: '',
      deepAnswer: '',
      aiMap: null,
      aiMapStatus: ''
    });
    history.replaceState({ step: 0 }, '', '#welcome');
    render();
  }

  function bindSafetyButtons() {
    document.querySelectorAll('[data-open-safety]').forEach(button => {
      if (button.dataset.bound === 'true') return;
      button.dataset.bound = 'true';
      button.addEventListener('click', () => safetyDialog.showModal());
    });
  }

  document.querySelectorAll('[data-close-safety]').forEach(button => button.addEventListener('click', () => safetyDialog.close()));

  document.getElementById('risk-yes').addEventListener('click', () => {
    state.riskChecked = true;
    riskDialog.close();
    safetyDialog.showModal();
  });

  document.getElementById('risk-no').addEventListener('click', () => {
    state.riskChecked = true;
    riskDialog.close();
    goNext();
  });

  window.addEventListener('popstate', event => {
    if (event.state && Number.isInteger(event.state.step)) {
      state.step = event.state.step;
      state.returnToMap = false;
      render(false);
    }
  });

  render(false);
})();
