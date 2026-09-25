// Setzt das Farbschema vor dem ersten Rendern, damit nichts aufblitzt.
(function () {
  var pref = 'system';
  try { pref = localStorage.getItem('ls-theme') || 'system'; } catch (e) {}
  var dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#1D1719' : '#FBF4EF');
})();
