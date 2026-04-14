export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function localDateKey(d: Date): string {
  const ld = startOfLocalDay(d);
  const y = ld.getFullYear();
  const m = String(ld.getMonth() + 1).padStart(2, '0');
  const day = String(ld.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
