(() => {
  const cfg = window.LA_USINA_SUPABASE || {};
  const login = document.querySelector('[data-moderation-login]');
  const panel = document.querySelector('[data-moderation-panel]');
  const keyForm = document.querySelector('[data-key-form]');
  const loginStatus = document.querySelector('[data-login-status]');
  const list = document.querySelector('[data-moderation-list]');
  const panelStatus = document.querySelector('[data-panel-status]');
  const logout = document.querySelector('[data-logout]');
  const tabs = [...document.querySelectorAll('[data-status-tab]')];
  let moderationKey = sessionStorage.getItem('la_usina_moderation_key') || '';
  let currentStatus = 'pending';

  const labels = {
    'editorial': 'Editorial',
    'relato-una-experiencia': 'Una experiencia de cuidado',
    'entrevista-marianela-meneghetti': 'Entrevista a Marianela Meneghetti',
    'pensar': 'Lo que sos-tiene y con-tiene el cuidado'
  };

  const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  async function api(path = '', options = {}) {
    const headers = {
      apikey: cfg.anonKey,
      'x-moderation-key': moderationKey,
      ...(options.headers || {})
    };
    const res = await fetch(cfg.url + '/functions/v1/moderacion' + path, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudo completar la acción.');
    return data;
  }

  function showPanel() {
    login.hidden = true;
    panel.hidden = false;
  }

  function showLogin(message = '') {
    panel.hidden = true;
    login.hidden = false;
    loginStatus.textContent = message;
  }

  function formatDate(value) {
    if (!value) return '';
    return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }

  function card(item) {
    const published = item.status === 'approved' && !item.is_deleted;
    const hidden = item.status === 'approved' && item.is_deleted;
    const article = labels[item.article] || item.article;
    return `
      <article class="moderation-card" data-id="${item.id}">
        <div class="moderation-card-head">
          <div><span class="moderation-article">Edición ${escapeHtml(item.edition)} · ${escapeHtml(article)}</span>
          <h2>${escapeHtml(item.author_name)}</h2></div>
          <time>${escapeHtml(formatDate(item.created_at))}</time>
        </div>
        <div class="moderation-comment">${escapeHtml(item.body).replace(/\n/g,'<br>')}</div>
        ${item.image_url ? `<a class="moderation-image-link" href="${item.image_url}" target="_blank" rel="noopener"><img src="${item.image_url}" alt="Imagen adjunta al aporte"><span>Ver imagen en tamaño completo ↗</span></a>` : ''}
        ${item.parent_id ? '<p class="moderation-reply-note">↳ Este aporte es una respuesta a otro comentario.</p>' : ''}
        ${item.moderator_note ? `<p class="moderator-note"><strong>Nota interna:</strong> ${escapeHtml(item.moderator_note)}</p>` : ''}
        <div class="moderation-actions">
          ${item.status === 'pending' ? '<button class="approve" data-action="approve">Aprobar</button><button class="reject" data-action="reject">Rechazar</button>' : ''}
          ${published ? '<button class="hide" data-action="hide">Ocultar</button>' : ''}
          ${hidden ? '<button class="restore" data-action="restore">Volver a mostrar</button>' : ''}
          ${item.status === 'rejected' ? '<button class="approve" data-action="approve">Aprobar ahora</button>' : ''}
        </div>
      </article>`;
  }

  async function load(status = currentStatus) {
    currentStatus = status;
    panelStatus.textContent = 'Cargando…';
    list.innerHTML = '';
    try {
      const data = await api('?status=' + encodeURIComponent(status));
      const items = data.items || [];
      document.querySelector('[data-count="' + status + '"]').textContent = items.length ? '(' + items.length + ')' : '';
      list.innerHTML = items.length ? items.map(card).join('') : '<div class="moderation-empty">No hay aportes en esta sección.</div>';
      panelStatus.textContent = '';
      bindActions();
    } catch (err) {
      if (/clave/i.test(err.message) || /autoriz/i.test(err.message)) {
        sessionStorage.removeItem('la_usina_moderation_key');
        moderationKey = '';
        showLogin('La clave editorial no es válida.');
        return;
      }
      panelStatus.textContent = err.message;
    }
  }

  function bindActions() {
    list.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cardEl = btn.closest('[data-id]');
        const id = cardEl.dataset.id;
        const action = btn.dataset.action;
        let note = '';
        if (action === 'reject') note = prompt('Motivo interno del rechazo (opcional):') || '';
        if (action === 'hide') note = prompt('Motivo interno para ocultarlo (opcional):') || '';

        btn.disabled = true;
        panelStatus.textContent = 'Guardando…';
        try {
          await api('', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, id, note })
          });
          panelStatus.textContent = action === 'approve' ? 'Aporte publicado.' :
            action === 'reject' ? 'Aporte rechazado.' :
            action === 'hide' ? 'Aporte ocultado.' : 'Aporte visible nuevamente.';
          await load(currentStatus);
        } catch (err) {
          panelStatus.textContent = err.message;
          btn.disabled = false;
        }
      });
    });
  }

  keyForm?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    moderationKey = new FormData(keyForm).get('key').toString().trim();
    if (!moderationKey) return;
    loginStatus.textContent = 'Comprobando…';
    try {
      await api('?status=pending');
      sessionStorage.setItem('la_usina_moderation_key', moderationKey);
      showPanel();
      await load('pending');
    } catch (err) {
      moderationKey = '';
      sessionStorage.removeItem('la_usina_moderation_key');
      loginStatus.textContent = 'Clave incorrecta.';
    }
  });

  tabs.forEach(tab => tab.addEventListener('click', async () => {
    tabs.forEach(x => x.classList.toggle('is-active', x === tab));
    await load(tab.dataset.statusTab);
  }));

  logout?.addEventListener('click', () => {
    moderationKey = '';
    sessionStorage.removeItem('la_usina_moderation_key');
    keyForm.reset();
    showLogin('');
  });

  if (moderationKey && cfg.enabled) {
    showPanel();
    load('pending');
  } else {
    showLogin('');
  }
})();