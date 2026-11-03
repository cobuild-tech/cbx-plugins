(function () {
  var log = document.getElementById('chat-log'), ws, retry = 0, queue = [];
  function connect() {
    ws = new WebSocket('wss://' + location.host + '/chat');
    ws.onopen = function () { retry = 0; queue.splice(0).forEach(function (m) { ws.send(m); }); };
    ws.onmessage = function (e) {
      var m = JSON.parse(e.data), li = document.createElement('li');
      li.textContent = m.user + ': ' + m.text; log.appendChild(li); log.scrollTop = log.scrollHeight;
    };
    ws.onclose = function () { setTimeout(connect, Math.min(30000, 1000 * Math.pow(2, retry++))); };
  }
  function send(text) { var m = JSON.stringify({ text: text }); ws && ws.readyState === 1 ? ws.send(m) : queue.push(m); }
  document.getElementById('chat-form').addEventListener('submit', function (e) { e.preventDefault(); send(this.msg.value); this.reset(); });
  window.Chat = { send: send };   // used by support-macros.js
  connect();
})();
