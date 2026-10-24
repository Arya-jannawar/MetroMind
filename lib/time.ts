// Minutes-of-day + relative time helpers. All engine times are minutes of
// day; the UI converts with these.

export function minToHHMM(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function hhmmToMin(s: string): number {
  const [h, m] = s.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function relTime(at: number, nowMs: number = Date.now()): string {
  const diff = Math.round((nowMs - at) / 60000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff} min ago`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)} d ago`;
}

export function greetingFor(min: number): string {
  if (min < 5 * 60) return "Late night";
  if (min < 12 * 60) return "Good morning";
  if (min < 17 * 60) return "Good afternoon";
  if (min < 21 * 60) return "Good evening";
  return "Good night";
}
