(() => {
  const root = document.querySelector('[data-conversation-app]');
  const section = document.querySelector('[data-conversation]');
  if (!root || !section) return;

  const cfg = window.LA_USINA_SUPABASE || {};
  const edition = section.dataset.edition;
  const article = section.dataset.article;

  const escapeHtml = (value = '') => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  const renderDisabled = () => {
    root.innerHTML = `
      <div class="conversation-pending">
        <strong>Espacio de conversación en preparación</strong>
        <p>La estructura ya está incorporada. La publicación de aportes se habilitará cuando termine de conectarse la base de participación.</p>
      </div>`;
  };

  if (!cfg.enabled || !cfg.url || !cfg.anonKey) {
    renderDisabled();
    return;
  }

  root.innerHTML = `
    <form class="conversation-form" data-conversation-form>
      <div class="form-row">
        <label>Nombre o seudónimo
          <input name="author_name" maxlength="80" required autocomplete="name" placeholder="Cómo querés aparecer">
        </label>
      </div>
      <label>Tu reflexión
        <textarea name="body" maxlength="3000" required rows="6" placeholder="¿Qué te hizo pensar este texto?"></textarea>
      </label>
      <label class="file-label">Imagen opcional
        <input name="image" type="file" accept="image/jpeg,image/png,image/webp">
        <small>JPG, PNG o WEBP. Máximo 5 MB. No subas imágenes que identifiquen a personas sin su consentimiento.</small>
      </label>
      <input class="hp-field" tabindex="-1" autocomplete="off" name="website" aria-hidden="true">
      <input type="hidden" name="parent_id" value="">
      <div class="form-actions"><button class="button button-primary" type="submit">Enviar aporte</button><span class="form-status" data-form-status></span></div>
    </form>
    <div class="conversation-list" data-conversation-list><p>Cargando conversación…</p></div>`;

  const form = root.querySelector('[data-conversation-form]');
  const list = root.querySelector('[data-conversation-list]');
  const status = root.querySelector('[data-form-status]');

  async function load() {
    try {
      const url = new URL(cfg.url + '/functions/v1/comentarios');
      url.searchParams.set('edition', edition);
      url.searchParams.set('article', article);
      const res = await fetch(url, { headers: { apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey }});
      if (!res.ok) throw new Error('No se pudo cargar la conversación');
      const data = await res.json();
      const items = data.items || [];
      if (!items.length) {
        list.innerHTML = '<p class="empty-conversation">Todavía no hay aportes publicados. Podés abrir la conversación.</p>';
        return;
      }
      const byParent = new Map();
      items.forEach(x => { const k = x.parent_id || 'root'; if (!byParent.has(k)) byParent.set(k, []); byParent.get(k).push(x); });
      const renderItem = (x, depth=0) => `
        <article class="comment-card ${depth ? 'comment-reply' : ''}">
          <div class="comment-meta"><strong>${escapeHtml(x.author_name)}</strong><time>${new Date(x.created_at).toLocaleDateString('es-AR')}</time></div>
          <p>${escapeHtml(x.body).replace(/\n/g,'<br>')}</p>
          ${x.image_url ? `<img class="comment-image" src="${x.image_url}" alt="Imagen adjuntada por ${escapeHtml(x.author_name)}">` : ''}
          <button type="button" class="reply-button" data-reply="${x.id}" data-name="${escapeHtml(x.author_name)}">Responder</button>
          ${(byParent.get(x.id)||[]).map(y => renderItem(y, depth+1)).join('')}
        </article>`;
      list.innerHTML = (byParent.get('root') || []).map(x => renderItem(x)).join('');
      list.querySelectorAll('[data-reply]').forEach(btn => btn.addEventListener('click', () => {
        form.parent_id.value = btn.dataset.reply;
        form.body.focus();
        status.textContent = 'Respondiendo a ' + btn.dataset.name + '.';
      }));
    } catch (err) {
      list.innerHTML = '<p class="conversation-error">No pudimos cargar la conversación en este momento.</p>';
    }
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    status.textContent = 'Enviando…';
    const fd = new FormData(form);
    fd.set('edition', edition);
    fd.set('article', article);
    try {
      const res = await fetch(cfg.url + '/functions/v1/participar', {
        method: 'POST',
        headers: { apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey },
        body: fd
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar');
      form.reset();
      status.textContent = 'Gracias. Tu aporte quedó enviado para moderación.';
    } catch (err) {
      status.textContent = err.message || 'No se pudo enviar el aporte.';
    }
  });

  load();
})();
