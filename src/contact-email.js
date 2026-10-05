import './contact-email.css';
import homeCheck from '../images/assets/home-check.png';
import projectsCheck from '../images/assets/projects-check.png';

const email = 'hello@adrianne.design';
const desktop = matchMedia('(min-width: 1025px) and (pointer: fine) and (hover: hover)');
const touch = matchMedia('(any-pointer: coarse)');
const canCopy = () => desktop.matches && !touch.matches;
const events = new AbortController();
const status = document.createElement('span');
status.className = 'email-copy-status';
status.setAttribute('role', 'status');
status.setAttribute('aria-live', 'polite');
status.setAttribute('aria-atomic', 'true');
document.body.append(status);

const controls = [...document.querySelectorAll(
  `header .header-email[href="mailto:${email}"], .home-video-contact-links a[href="mailto:${email}"], .footer-contact-links a[href="mailto:${email}"]`
)].map(link => {
  const originalLabel = link.getAttribute('aria-label');
  const originalText = link.matches('.header-email') ? link.querySelector('span') : null;
  const icon = originalText ? null : link.querySelector('img');
  const originalSource = icon?.getAttribute('src');
  const check = link.closest('.home-video-contact-links') ? homeCheck : projectsCheck;
  let confirmation;
  let timer = 0;
  let request = 0;
  if (originalText) {
    originalText.classList.add('email-copy-original');
    confirmation = document.createElement('span');
    confirmation.className = 'email-copy-confirmation';
    confirmation.textContent = 'COPIED ✓';
    confirmation.setAttribute('aria-hidden', 'true');
    link.append(confirmation);
  }
  const reset = () => {
    ++request; // Invalidate any clipboard promise still in flight.
    clearTimeout(timer);
    link.classList.remove('email-is-copied');
    if (icon) icon.setAttribute('src', originalSource);
    if (originalLabel === null) link.removeAttribute('aria-label');
    else link.setAttribute('aria-label', originalLabel);
  };
  link.addEventListener('click', async event => {
    if (event.defaultPrevented || !canCopy() || event.pointerType === 'touch' ||
        event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    reset();
    const currentRequest = request;
    status.textContent = '';
    try {
      await navigator.clipboard.writeText(email);
      if (events.signal.aborted || currentRequest !== request || !canCopy()) return;
      if (icon) icon.setAttribute('src', check);
      link.classList.add('email-is-copied');
      link.setAttribute('aria-label', 'Email address copied');
      status.textContent = 'Email address copied';
      timer = setTimeout(reset, 2000);
    } catch {
      if (currentRequest === request) reset();
    }
  }, { signal: events.signal });
  return {
    reset,
    dispose() {
      reset();
      originalText?.classList.remove('email-copy-original');
      confirmation?.remove();
    },
  };
});
const resetAll = () => {
  controls.forEach(control => control.reset());
  status.textContent = '';
};
[desktop, touch].forEach(media => media.addEventListener('change', resetAll, { signal: events.signal }));
const dispose = () => {
  events.abort();
  controls.forEach(control => control.dispose());
  status.remove();
};
window.addEventListener('pagehide', event => {
  if (event.persisted) resetAll();
  else dispose();
}, { signal: events.signal });
if (import.meta.hot) import.meta.hot.dispose(dispose);
