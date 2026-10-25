/**
 * Akmon Asistente IA — widget embedible.
 * Sin dependencias. Se configura con atributos data-* en el <script>:
 *
 * <script src="https://tu-backend.onrender.com/widget/chat-widget.js"
 *   data-backend="https://tu-backend.onrender.com"
 *   data-app-key="CLAVE_PUBLICA_DEMO"
 *   data-business="casa-brasa"
 *   data-name="Brasi"
 *   data-color="#f59e0b"></script>
 */
(function () {
  'use strict';

  var script = document.currentScript;
  if (!script) return;

  var BACKEND = (script.getAttribute('data-backend') || '').replace(/\/$/, '');
  var APP_KEY = script.getAttribute('data-app-key') || '';
  var BUSINESS = script.getAttribute('data-business') || '';
  var ASSISTANT_NAME = script.getAttribute('data-name') || 'Asistente';
  var COLOR = script.getAttribute('data-color') || '#f59e0b';

  if (!BACKEND || !APP_KEY || !BUSINESS) {
    console.error('[akmon-widget] faltan data-backend, data-app-key o data-business.');
    return;
  }

  var history = []; // {role, content}
  var open = false;

  // ---------- Estilos ----------
  var css = ''
    + '.akm-btn{position:fixed;bottom:24px;right:24px;width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;z-index:999998;'
    + 'background:' + COLOR + ';color:#1a1a1a;font-size:28px;display:flex;align-items:center;justify-content:center;'
    + 'box-shadow:0 8px 24px rgba(0,0,0,.25);transition:transform .2s}'
    + '.akm-btn:hover{transform:scale(1.08)}'
    + '.akm-panel{position:fixed;bottom:100px;right:24px;width:360px;max-width:calc(100vw - 48px);height:520px;max-height:calc(100vh - 140px);'
    + 'z-index:999999;background:#fff;border-radius:16px;box-shadow:0 16px 48px rgba(0,0,0,.25);display:none;flex-direction:column;overflow:hidden;'
    + 'font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}'
    + '.akm-panel.open{display:flex}'
    + '.akm-head{background:' + COLOR + ';color:#1a1a1a;padding:14px 16px;font-weight:700;display:flex;align-items:center;gap:10px}'
    + '.akm-head small{display:block;font-weight:400;font-size:12px;opacity:.8}'
    + '.akm-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:#faf9f7}'
    + '.akm-msg{max-width:82%;padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}'
    + '.akm-msg.user{align-self:flex-end;background:#1e3a5f;color:#fff;border-bottom-right-radius:4px}'
    + '.akm-msg.bot{align-self:flex-start;background:#fff;color:#1a1a1a;border:1px solid #eee;border-bottom-left-radius:4px}'
    + '.akm-msg.typing{display:flex;gap:4px;align-items:center}'
    + '.akm-msg.typing span{width:7px;height:7px;border-radius:50%;background:#bbb;animation:akm-b 1.2s infinite}'
    + '.akm-msg.typing span:nth-child(2){animation-delay:.15s}.akm-msg.typing span:nth-child(3){animation-delay:.3s}'
    + '@keyframes akm-b{0%,60%,100%{transform:none;opacity:.4}30%{transform:translateY(-4px);opacity:1}}'
    + '.akm-input{display:flex;border-top:1px solid #eee;padding:10px;gap:8px;background:#fff}'
    + '.akm-input input{flex:1;border:1px solid #ddd;border-radius:24px;padding:10px 14px;font-size:14px;outline:none}'
    + '.akm-input input:focus{border-color:' + COLOR + '}'
    + '.akm-input button{border:none;background:' + COLOR + ';color:#1a1a1a;font-weight:700;border-radius:24px;padding:0 18px;cursor:pointer;font-size:14px}'
    + '.akm-powered{text-align:center;font-size:11px;color:#999;padding:6px;background:#fff}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ---------- DOM ----------
  var btn = document.createElement('button');
  btn.className = 'akm-btn';
  btn.setAttribute('aria-label', 'Abrir chat con ' + ASSISTANT_NAME);
  btn.innerHTML = '💬';
  document.body.appendChild(btn);

  var panel = document.createElement('div');
  panel.className = 'akm-panel';
  panel.innerHTML =
    '<div class="akm-head"><div style="font-size:26px">🍽️</div><div>' + escapeHtml(ASSISTANT_NAME) +
    '<small>En línea · responde al instante</small></div></div>' +
    '<div class="akm-msgs"></div>' +
    '<form class="akm-input"><input type="text" placeholder="Escríbele a ' + escapeHtml(ASSISTANT_NAME) + '…" maxlength="2000" autocomplete="off"/>' +
    '<button type="submit">Enviar</button></form>' +
    '<div class="akm-powered">Asistente IA por Akmon Studios</div>';
  document.body.appendChild(panel);

  var msgs = panel.querySelector('.akm-msgs');
  var form = panel.querySelector('form');
  var input = panel.querySelector('input');
  var greeted = false;

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function scrollDown() { msgs.scrollTop = msgs.scrollHeight; }

  function addMsg(role, text) {
    var div = document.createElement('div');
    div.className = 'akm-msg ' + (role === 'user' ? 'user' : 'bot');
    div.textContent = text;
    msgs.appendChild(div);
    scrollDown();
    return div;
  }

  function toggle() {
    open = !open;
    panel.classList.toggle('open', open);
    btn.innerHTML = open ? '✕' : '💬';
    if (open && !greeted) {
      greeted = true;
      addMsg('bot', '¡Hola! Soy ' + ASSISTANT_NAME + ' 😊 ¿En qué te ayudo hoy?');
    }
    if (open) setTimeout(function () { input.focus(); }, 100);
  }
  btn.addEventListener('click', toggle);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMsg('user', text);
    history.push({ role: 'user', content: text });

    var typing = document.createElement('div');
    typing.className = 'akm-msg bot typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(typing);
    scrollDown();

    fetch(BACKEND + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-app-key': APP_KEY },
      body: JSON.stringify({ business: BUSINESS, messages: history.slice(-20) }),
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (r) {
        typing.remove();
        var reply = r.ok && r.data.reply
          ? r.data.reply
          : 'Ups, algo salió mal. Inténtalo de nuevo en un momento. 🙏';
        addMsg('bot', reply);
        if (r.ok) history.push({ role: 'assistant', content: reply });
      })
      .catch(function () {
        typing.remove();
        addMsg('bot', 'No pude conectarme. Revisa tu internet e inténtalo de nuevo. 🙏');
      });
  });
})();
