// Third-party chart; re-renders its palette on themechange and sometimes sets the theme itself
// (e.g. high-contrast mode sets data-theme="dark").
document.addEventListener('themechange', function (e) { /* redraw with e.detail palette */ });
if (location.search.includes('hc=1')) document.documentElement.dataset.theme = 'dark';
