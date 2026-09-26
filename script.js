const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('#nav-principal');

if (menuButton && nav) {
  menuButton.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(open));
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded', 'false');
    });
  });
}

const shareButton = document.querySelector('[data-share]');
if (shareButton) {
  shareButton.addEventListener('click', async () => {
    const shareData = {
      title: 'La Usina del PNA',
      text: 'Relatos, debates y pensamiento colectivo desde el Primer Nivel de Atención de Bahía Blanca.',
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        const original = shareButton.textContent;
        shareButton.textContent = 'Enlace copiado';
        setTimeout(() => { shareButton.textContent = original; }, 1800);
      }
    } catch (_) {
      // El usuario puede cancelar el diálogo de compartir.
    }
  });
}


/* Edición 0: activar el relato completo publicado */
if (/\/ediciones\/0\/(?:index\.html)?$/.test(window.location.pathname)) {
  document.querySelectorAll('.entry').forEach((entry) => {
    const type = entry.querySelector('.entry-type');
    const title = entry.querySelector('h2');
    const summary = entry.querySelector('p');
    if (!type || !title) return;
    if (type.textContent.toLowerCase().includes('relato')) {
      type.textContent = 'Relato';
      title.innerHTML = '<a href="relato-una-experiencia.html">Una experiencia de cuidado <span aria-hidden="true">↗</span></a>';
      if (summary) summary.textContent = 'Una escena del primer nivel que permite pensar demanda, escucha, redes y cuidado.';
    }
  });
}
