var btn = document.getElementById('theme-toggle');
function sync() {
  var dark = document.documentElement.dataset.theme === 'dark';
  btn.setAttribute('aria-pressed', String(dark)); btn.textContent = dark ? 'Light mode' : 'Dark mode';
}
btn.addEventListener('click', function () {
  var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next; localStorage.setItem('theme', next);
  document.dispatchEvent(new CustomEvent('themechange', { detail: next }));
  sync();
});
sync();
