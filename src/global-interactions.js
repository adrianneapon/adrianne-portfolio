import './global-interactions.css';
import { installDesktopSmoothScroll } from './desktop-smooth-scroll.js';
import { installHeaderMenu } from './header-menu.js';

const root = document.documentElement;
const header = document.querySelector('header');
const cleanups = [];
const listen = (node, name, callback, options) => {
  node.addEventListener(name, callback, options);
  cleanups.push(() => node.removeEventListener(name, callback, options));
};
const scrollPosition = () => Math.max(0, document.body.scrollTop, root.scrollTop);
let lastScroll = scrollPosition();
let scrollTravel = 0;
let scrollFrame = 0;
let menuNavigation = root.classList.contains('menu-navigation-pending');
const beginMenuNavigation = () => {
  menuNavigation = true;
  lastScroll = scrollPosition();
  scrollTravel = 0;
  root.classList.add('header-scroll-hidden', 'menu-navigation-pending');
};
const finishMenuNavigation = () => {
  lastScroll = scrollPosition();
  scrollTravel = 0;
  root.classList.remove('menu-navigation-pending');
  // Preserve the homepage's existing top-of-page visibility rule.
  if (document.getElementById('hero') && lastScroll <= 12) {
    menuNavigation = false;
    root.classList.remove('header-scroll-hidden');
  }
};
const resumeUserScroll = () => {
  if (!menuNavigation) return;
  menuNavigation = false;
  lastScroll = scrollPosition();
  scrollTravel = 0;
  root.classList.remove('menu-navigation-pending');
  root.removeAttribute('data-menu-arrival');
  header.dispatchEvent(new Event('menu-navigation-interrupted'));
  if (lastScroll <= 12) root.classList.remove('header-scroll-hidden');
};
const updateHeader = () => {
  scrollFrame = 0;
  const y = scrollPosition();
  const delta = y - lastScroll;
  lastScroll = y;
  if (menuNavigation) { scrollTravel = 0; return; }
  if (y <= 12) {
    root.classList.remove('header-scroll-hidden');
    scrollTravel = 0;
    return;
  }
  if (!delta) return;
  scrollTravel = Math.sign(delta) === Math.sign(scrollTravel) ? scrollTravel + delta : delta;
  if (Math.abs(scrollTravel) >= 6) {
    root.classList.toggle('header-scroll-hidden', scrollTravel > 0);
    if (scrollTravel > 0) header.dispatchEvent(new Event('header-hidden'));
    scrollTravel = 0;
  }
};
const scheduleHeader = event => {
  if (event.target !== document && event.target !== document.body && event.target !== root) return;
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateHeader);
};
listen(document, 'scroll', scheduleHeader, { passive: true, capture: true });
listen(header, 'focusin', () => { resumeUserScroll(); root.classList.remove('header-scroll-hidden'); });
listen(window, 'wheel', event => {
  if (event.isTrusted && event.deltaY && !event.ctrlKey && !event.metaKey && Math.abs(event.deltaY) >= Math.abs(event.deltaX)) resumeUserScroll();
}, { capture: true, passive: true });
listen(window, 'touchmove', event => {
  if (event.isTrusted && event.touches.length === 1) resumeUserScroll();
}, { capture: true, passive: true });
listen(window, 'keydown', event => {
  if (event.isTrusted && !event.ctrlKey && !event.metaKey && !event.altKey &&
      ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key) &&
      !event.target.closest('input, textarea, select, button, a, [contenteditable]')) resumeUserScroll();
}, true);
listen(window, 'pointerdown', event => {
  if (event.isTrusted && event.clientX >= document.body.clientWidth) resumeUserScroll();
}, { capture: true, passive: true });
listen(window, 'popstate', resumeUserScroll);
cleanups.push(installDesktopSmoothScroll());
cleanups.push(installHeaderMenu(header, beginMenuNavigation, finishMenuNavigation));

const dispose = () => {
  cleanups.forEach(cleanup => cleanup());
  cancelAnimationFrame(scrollFrame);

  root.classList.remove('header-scroll-hidden');
  root.classList.remove('menu-navigation-pending');
};
listen(window, 'pagehide', event => { if (!event.persisted) dispose(); });
if (import.meta.hot) import.meta.hot.dispose(dispose);
