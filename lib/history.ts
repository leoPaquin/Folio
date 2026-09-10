import type { Snapshot } from './portfolio';

export const HISTORY_PERIODS = ['1J', '1M', '3M', '6M', '1A', 'Tout'] as const;
export type HistoryPeriod = typeof HISTORY_PERIODS[number];
export const snapshotTime = (snapshot: Snapshot) => Date.parse(snapshot.capturedAt || snapshot.date + 'T00:00:00.000Z');
export function historyForPeriod(snapshots: Snapshot[], period: HistoryPeriod, now = Date.now()) {
  const days = { '1J': 1, '1M': 30, '3M': 90, '6M': 180, '1A': 365, Tout: Infinity }[period];
  return snapshots.filter(s => snapshotTime(s) >= now - days * 86_400_000).sort((a, b) => snapshotTime(a) - snapshotTime(b));
}
