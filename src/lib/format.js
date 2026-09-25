const dayFmt = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortDayFmt = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long' });
const shortDayYearFmt = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });
const numericFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** „Donnerstag, 24. September 2026 · 21:14 Uhr" */
export const formatLong = (iso) => {
  const d = new Date(iso);
  return `${dayFmt.format(d)} · ${timeFmt.format(d)} Uhr`;
};

/** „24.09.2026 um 21:14" */
export const formatOpened = (iso) => {
  const d = new Date(iso);
  return `${numericFmt.format(d)} um ${timeFmt.format(d)}`;
};

/** Überschrift für Tagesgruppen im Verlauf */
export function dayLabel(iso) {
  const d = new Date(iso);
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (diff === 0) return 'Heute';
  if (diff === 1) return 'Gestern';
  if (d.getFullYear() === new Date().getFullYear()) return shortDayFmt.format(d);
  return shortDayYearFmt.format(d);
}

export const formatTime = (iso) => `${timeFmt.format(new Date(iso))} Uhr`;

/** „vor 5 Min.", „gestern", … */
export function relative(iso) {
  const diffMs = Date.now() - Date.parse(iso);
  const min = Math.round(diffMs / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.round(min / 60);
  if (h < 24 && startOfDay(new Date()) <= Date.parse(iso)) return `vor ${h} Std.`;
  const label = dayLabel(iso);
  return label === 'Gestern' ? 'gestern' : label === 'Heute' ? `vor ${h} Std.` : `am ${label}`;
}

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
