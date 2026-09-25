const KEY = 'ls-theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');

export function getThemePref() {
  try { return localStorage.getItem(KEY) || 'system'; } catch { return 'system'; }
}

export function applyTheme(pref = getThemePref()) {
  const dark = pref === 'dark' || (pref === 'system' && media.matches);
  document.documentElement.classList.toggle('dark', dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1D1719' : '#FBF4EF');
}

export function setThemePref(pref) {
  try { localStorage.setItem(KEY, pref); } catch { /* privat */ }
  applyTheme(pref);
}

media.addEventListener('change', () => applyTheme());
