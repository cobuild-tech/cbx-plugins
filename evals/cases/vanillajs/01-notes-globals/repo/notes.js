var notes = JSON.parse(localStorage.getItem('notes') || '[]');
function save() { localStorage.setItem('notes', JSON.stringify(notes)); }
function render() {
  var ul = document.getElementById('notes'); ul.innerHTML = '';
  notes.forEach(function (n, i) {
    var li = document.createElement('li'); li.textContent = n.text;
    li.ondblclick = function () { notes.splice(i, 1); save(); render(); };
    ul.appendChild(li);
  });
}
document.getElementById('add').onsubmit = function (e) {
  e.preventDefault(); var t = this.t.value.trim(); if (!t) return;
  notes.push({ text: t, at: Date.now() }); save(); render(); this.reset();
};
window.addEventListener('storage', function (e) { if (e.key === 'notes') { notes = JSON.parse(e.newValue || '[]'); render(); } });
render();
