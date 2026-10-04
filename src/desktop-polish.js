import './desktop-polish.css';
import './desktop-header.css';

const desktop = matchMedia('(min-width: 1025px) and (pointer: fine) and (hover: hover)');
const links = [...document.querySelectorAll('header .logo-block')];
const originalHrefs = new Map(links.map(link => [link, link.getAttribute('href')]));
const updateLink = () => links.forEach(link => link.setAttribute('href', desktop.matches ? link.dataset.desktopHref : originalHrefs.get(link)));
const navigate = event => {
  if (!desktop.matches || event.defaultPrevented || event.button !== 0 ||
      event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const link = event.currentTarget;
  const target = document.getElementById(link.hash.slice(1));
  if (!target) return;
  event.preventDefault();
  if (location.hash !== link.hash) history.pushState(null, '', link.hash);
  target.scrollIntoView({
    block: 'start',
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  });
};
updateLink();
desktop.addEventListener('change', updateLink);
links.forEach(link => link.addEventListener('click', navigate));
if (import.meta.hot) import.meta.hot.dispose(() => {
  desktop.removeEventListener('change', updateLink);
  links.forEach(link => {
    link.removeEventListener('click', navigate);
    link.setAttribute('href', originalHrefs.get(link));
  });
});
