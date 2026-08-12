(() => {
  'use strict';

  const enabled = new URLSearchParams(location.search).get('research') === '1';
  let sessionCode = createSessionCode();
  let startedAt = 0;
  let currentStep = '';
  let currentStepStartedAt = performance.now();
  let firstVisitIndex = 0;
  let stepMetrics = new Map();

  function createSessionCode() {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID().slice(0, 8);
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function start() {
    if (!startedAt) startedAt = Date.now();
  }

  function visit(stepId) {
    const now = performance.now();
    flushCurrentStep(now);
    currentStep = stepId;
    currentStepStartedAt = now;

    if (!stepMetrics.has(stepId)) {
      stepMetrics.set(stepId, { step: stepId, order: firstVisitIndex, visits: 0, seconds: 0 });
      firstVisitIndex += 1;
    }
    stepMetrics.get(stepId).visits += 1;
  }

  function flushCurrentStep(now = performance.now()) {
    if (!currentStep || !stepMetrics.has(currentStep)) return;
    const elapsed = Math.max(0, now - currentStepStartedAt) / 1000;
    stepMetrics.get(currentStep).seconds += elapsed;
  }

  function snapshot(summary) {
    const now = performance.now();
    const metrics = Array.from(stepMetrics.values(), item => ({ ...item }));
    if (currentStep) {
      const current = metrics.find(item => item.step === currentStep);
      if (current) current.seconds += Math.max(0, now - currentStepStartedAt) / 1000;
    }

    return {
      schemaVersion: 'remind-usability-v1',
      sessionCode,
      completedAt: new Date().toISOString(),
      durationSeconds: Math.max(0, Math.round((Date.now() - (startedAt || Date.now())) / 1000)),
      mode: summary.mode,
      goal: summary.goal,
      depthChoice: summary.depthChoice,
      clarity: {
        before: summary.clarityBefore,
        after: summary.clarityAfter,
        change: summary.clarityAfter - summary.clarityBefore
      },
      feedback: { ...summary.feedback },
      ai: {
        skippedRepeatedMoment: summary.aiSkipMoment,
        momentQuestion: summary.aiMomentStatus || 'not-used',
        meaningQuestion: summary.aiMeaningStatus || 'not-used',
        understanding: summary.aiUnderstandingStatus || 'not-used',
        deeperQuestion: summary.aiDeepStatus || 'not-used',
        map: summary.aiMapStatus || 'not-used'
      },
      steps: metrics
        .sort((left, right) => left.order - right.order)
        .map(({ order, seconds, ...item }) => ({ ...item, seconds: Math.round(seconds) }))
    };
  }

  function download(summary) {
    const record = snapshot(summary);
    const blob = new Blob([`${JSON.stringify(record, null, 2)}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `remind-usability-${sessionCode}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    sessionCode = createSessionCode();
    startedAt = 0;
    currentStep = '';
    currentStepStartedAt = performance.now();
    firstVisitIndex = 0;
    stepMetrics = new Map();
  }

  window.REMIND_RESEARCH = Object.freeze({ enabled, start, visit, snapshot, download, reset });
})();
