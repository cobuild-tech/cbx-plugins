var photos = window.__PHOTOS__ || [];
var io = new IntersectionObserver(function (entries) {
  entries.forEach(function (e) { if (e.isIntersecting) { e.target.src = e.target.dataset.src; io.unobserve(e.target); } });
}, { rootMargin: '300px' });
function render(tag) {
  var grid = document.getElementById('grid'); grid.innerHTML = '';
  photos.filter(function (p) { return tag === 'all' || p.tags.indexOf(tag) >= 0; }).forEach(function (p) {
    var node = document.getElementById('card').content.cloneNode(true);
    var img = node.querySelector('img'); img.dataset.src = p.url; img.alt = p.title;
    node.querySelector('figcaption').textContent = p.title;
    grid.appendChild(node); io.observe(img);
  });
  document.querySelectorAll('#filters button').forEach(function (b) { b.classList.toggle('active', b.dataset.tag === tag); });
}
document.getElementById('filters').addEventListener('click', function (e) {
  var tag = e.target.dataset.tag; if (!tag) return;
  history.pushState({ tag: tag }, '', '?tag=' + tag); render(tag);
});
window.addEventListener('popstate', function (e) { render((e.state && e.state.tag) || 'all'); });
render(new URLSearchParams(location.search).get('tag') || 'all');
