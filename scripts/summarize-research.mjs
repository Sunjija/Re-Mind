import { readFileSync } from 'node:fs';

const paths = process.argv.slice(2);
if (!paths.length) {
  console.error('Usage: node scripts/summarize-research.mjs <record.json> [...]');
  process.exit(1);
}

const records = paths.map(path => JSON.parse(readFileSync(path, 'utf8')));
for (const record of records) {
  if (record.schemaVersion !== 'remind-usability-v1') {
    throw new Error(`Unsupported research record: ${record.schemaVersion || 'missing schemaVersion'}`);
  }
}

const byMode = Object.groupBy(records, record => record.mode || 'unknown');
const summary = {
  sampleSize: records.length,
  modes: Object.fromEntries(Object.entries(byMode).map(([mode, items]) => [mode, items.length])),
  medianDurationMinutes: round(median(records.map(record => record.durationSeconds / 60))),
  medianClarityChange: round(median(records.map(record => record.clarity.change))),
  medianFeedback: {
    understood: round(median(records.map(record => record.feedback.understood))),
    inferred: round(median(records.map(record => record.feedback.inferred))),
    agency: round(median(records.map(record => record.feedback.agency)))
  },
  aiFallbacks: Object.fromEntries(
    ['momentQuestion', 'meaningQuestion', 'understanding', 'deeperQuestion', 'map'].map(key => [
      key,
      records.filter(record => record.ai?.[key] === 'fallback').length
    ])
  ),
  repeatedSteps: collectRepeatedSteps(records)
};

console.log(JSON.stringify(summary, null, 2));

function median(values) {
  const valid = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!valid.length) return 0;
  const middle = Math.floor(valid.length / 2);
  return valid.length % 2 ? valid[middle] : (valid[middle - 1] + valid[middle]) / 2;
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function collectRepeatedSteps(items) {
  const counts = new Map();
  for (const record of items) {
    for (const step of record.steps || []) {
      if (step.visits > 1) counts.set(step.step, (counts.get(step.step) || 0) + 1);
    }
  }
  return Object.fromEntries([...counts.entries()].sort((left, right) => right[1] - left[1]));
}
