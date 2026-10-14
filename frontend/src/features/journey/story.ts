export const CHAPTERS = [
  'Enter',
  'Meet',
  'Connect',
  'Set the terms',
  'Train',
  'Move forward',
] as const;
export type Participant = 'provider' | 'trainer';
export type Scenario = 'own-model' | 'find-partner' | 'request-data';

export const SCENARIOS = {
  'own-model': {
    number: '01',
    label: 'Train my own model',
    role: 'provider' as Participant,
    title: 'Your data. Your model. Your direction.',
    description:
      'An institution brings its dataset and its own AI team. They use the playground to train a model for their work.',
    from: 'Your institution',
    via: 'Your dataset + your model',
    to: 'Your trained model',
    responsibility: 'You provide the data and choose the model. Your team runs the training.',
  },
  'find-partner': {
    number: '02',
    label: 'Find a training partner',
    role: 'provider' as Participant,
    title: 'You have the data. Find the right team.',
    description:
      'A data provider connects with an AI team that can train a model. Both sides agree on the purpose, access and use of the result.',
    from: 'Data provider',
    via: 'An agreed training partnership',
    to: 'A model for the agreed purpose',
    responsibility: 'You bring the data. Your partner brings the model and training expertise.',
  },
  'request-data': {
    number: '03',
    label: 'Request the right data',
    role: 'trainer' as Participant,
    title: 'You have a model. Find what it needs.',
    description:
      'An AI team describes the data it needs. A suitable institution or data holder can accept the request and set the terms for training.',
    from: 'AI training team',
    via: 'A request to a data provider',
    to: 'A model trained on approved data',
    responsibility:
      'You bring the model and a clear request. The provider decides whether to participate.',
  },
} as const;
export const DATA_KINDS = ['Images', 'Written records', 'Sensor readings'] as const;
export type DataKind = (typeof DATA_KINDS)[number];
export const TRAINING_WINDOWS = [1, 3, 6] as const;

export function clampProgress(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}
export function chapterAt(progress: number) {
  return Math.min(
    CHAPTERS.length - 1,
    Math.floor(clampProgress(progress) * (CHAPTERS.length - 1) + 0.01),
  );
}
export function defaultScenario(role: Participant): Scenario {
  return role === 'trainer' ? 'request-data' : 'own-model';
}
export function trainingStatus(progress: number): string {
  if (progress >= 100) return 'Preview complete';
  if (progress >= 90) return 'Releasing the trained model';
  if (progress >= 75) return 'Checking the model output';
  if (progress >= 25) return 'The model is learning';
  return progress > 0 ? 'Preparing the playground' : 'Ready for a training preview';
}
/** Cap frame time so returning to a backgrounded tab cannot finish the illustration instantly. */
export function advanceTraining(progress: number, deltaSeconds: number): number {
  if (!Number.isFinite(progress) || !Number.isFinite(deltaSeconds)) return 0;
  return Math.min(
    100,
    Math.max(0, progress) + Math.max(0, Math.min(deltaSeconds, 0.1)) * (100 / 18),
  );
}
export interface TrainingBrief {
  scenario: Scenario;
  dataKind: DataKind;
  hours: 1 | 3 | 6;
}
export function validateBrief(brief: TrainingBrief): boolean {
  return (
    Object.hasOwn(SCENARIOS, brief.scenario) &&
    DATA_KINDS.includes(brief.dataKind) &&
    TRAINING_WINDOWS.includes(brief.hours)
  );
}
