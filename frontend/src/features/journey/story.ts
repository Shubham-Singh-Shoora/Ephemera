export const CHAPTERS = ['A file', 'The copies', 'A boundary', 'The work', 'An ending'] as const;
export const COPY_PLACES = [
  'Your device',
  'An email',
  'A download',
  'A shared drive',
  'A forwarded email',
  'A backup',
  'Another device',
  'An old folder',
] as const;
export const ROLES = {
  owner: {
    name: 'The owner',
    person: 'Product teams & project leads',
    line: 'Your file. Your review window.',
    detail: 'The document-owning team is the intended customer. They set the review window.',
  },
  reviewer: {
    name: 'The reviewer',
    person: 'Researchers & outside collaborators',
    line: 'Find the answer. Finish the task.',
    detail: 'Researchers and consultants review a document for a specific piece of work.',
  },
  security: {
    name: 'The security lead',
    person: 'Security & IT teams',
    line: 'Check the controls and the limits.',
    detail: 'Security and IT teams check where files go and how access ends.',
  },
} as const;
export type JourneyRole = keyof typeof ROLES;
export const STORY_DURATIONS = [5, 15, 60] as const;
export function illustratedTime(minutes: number, elapsed: number): string {
  const progress = Number.isFinite(elapsed) ? Math.min(100, Math.max(0, elapsed)) : 0;
  const seconds = Math.round(minutes * 60 * (1 - progress / 100));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
export function chapterAt(offset: number, viewport: number): number {
  if (!Number.isFinite(offset) || !Number.isFinite(viewport) || viewport <= 0) return 0;
  return Math.max(0, Math.min(CHAPTERS.length - 1, Math.floor(offset / viewport + 0.25)));
}
export function nextCopy(current: number): number {
  return Math.min(COPY_PLACES.length, Math.max(1, current) + 1);
}
export const PASSAGES = [
  {
    label: 'When do we launch?',
    answer:
      'The team plans to launch the private beta on 2 December, after accessibility testing is complete.',
    source: 'Project brief / Launch timeline',
  },
  {
    label: 'Who owns the work?',
    answer:
      'Maya owns the product brief. Arun reviews the technical plan. Jules checks accessibility and writes the release notes.',
    source: 'Project brief / Responsibilities',
  },
  {
    label: 'What is still open?',
    answer:
      'Test keyboard navigation, agree on a backup owner, and review the recovery plan before the beta launch.',
    source: 'Project brief / Open questions',
  },
] as const;
