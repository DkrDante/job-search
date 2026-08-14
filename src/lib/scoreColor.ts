export function getScoreColor(score: number): string {
  if (score >= 80) return '#66D4CF'; // success (mint)
  if (score >= 60) return '#30D158'; // accent (green)
  if (score >= 40) return '#f59e0b'; // warning (amber)
  return '#64748b'; // muted
}
