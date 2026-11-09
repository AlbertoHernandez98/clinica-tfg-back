export function clinicHours(date: string): { opening: number; closing: number } | null {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  const opening = [null, 16 * 3600, 9 * 3600 + 30 * 60, 16 * 3600, 9 * 3600 + 30 * 60, 16 * 3600, null][day];
  const closing = [null, 20 * 3600, 13 * 3600 + 30 * 60, 20 * 3600, 13 * 3600 + 30 * 60, 20 * 3600, null][day];
  return opening === null || closing === null ? null : { opening, closing };
}

export function withinClinicHours(date: string, time: string, duration: number): boolean {
  const hours = clinicHours(date);
  if (!hours) return false;
  const parts = time.split(':').map(Number);
  const start = parts[0] * 3600 + parts[1] * 60 + parts[2];
  return start >= hours.opening && start + duration * 60 <= hours.closing;
}

export function workingDateRange(start: string, end: string): { start: string; end: string } | null {
  const first = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  if (first.getUTCDay() === 6) first.setUTCDate(first.getUTCDate() + 2);
  if (first.getUTCDay() === 0) first.setUTCDate(first.getUTCDate() + 1);
  if (last.getUTCDay() === 0) last.setUTCDate(last.getUTCDate() - 2);
  if (last.getUTCDay() === 6) last.setUTCDate(last.getUTCDate() - 1);
  return first > last ? null : { start: first.toISOString().slice(0, 10), end: last.toISOString().slice(0, 10) };
}
export function clinicToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)!.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
