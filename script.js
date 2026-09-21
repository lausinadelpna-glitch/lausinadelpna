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
