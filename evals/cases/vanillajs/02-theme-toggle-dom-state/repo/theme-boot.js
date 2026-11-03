// Runs in <head> before paint to avoid a flash of the wrong theme.
(function () {
  var t = localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = t;
})();
