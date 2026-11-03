// Written by another team; not part of this change.
document.getElementById('export').onclick = function () {
  var blob = new Blob([notes.map(function (n) { return n.text; }).join('\n')], { type: 'text/plain' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'notes.txt'; a.click();
};
window.importNotes = function (lines) { lines.forEach(function (t) { notes.push({ text: t, at: Date.now() }); }); save(); render(); };
