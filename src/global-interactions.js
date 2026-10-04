import './global-interactions.css';
import { installDesktopSmoothScroll } from './desktop-smooth-scroll.js';

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
const updateHeader = () => {
  scrollFrame = 0;
  const y = scrollPosition();
  const delta = y - lastScroll;
  lastScroll = y;
  if (y <= 12) {
    root.classList.remove('header-scroll-hidden');
    scrollTravel = 0;
    return;
  }
  if (!delta) return;
  scrollTravel = Math.sign(delta) === Math.sign(scrollTravel) ? scrollTravel + delta : delta;
  if (Math.abs(scrollTravel) >= 6) {
    root.classList.toggle('header-scroll-hidden', scrollTravel > 0);
    scrollTravel = 0;
  }
};
const scheduleHeader = event => {
  if (event.target !== document && event.target !== document.body && event.target !== root) return;
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateHeader);
};
listen(document, 'scroll', scheduleHeader, { passive: true, capture: true });
listen(header, 'focusin', () => root.classList.remove('header-scroll-hidden'));
cleanups.push(installDesktopSmoothScroll());

const dispose = () => {
  cleanups.forEach(cleanup => cleanup());
  cancelAnimationFrame(scrollFrame);

  root.classList.remove('header-scroll-hidden');
};
listen(window, 'pagehide', event => { if (!event.persisted) dispose(); });
if (import.meta.hot) import.meta.hot.dispose(dispose);
