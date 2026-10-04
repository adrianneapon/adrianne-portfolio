import './home-video.css';
import { installFooterEntry } from './home-video-entry.js';
import { installFooterText } from './home-video-text.js';

const sources = {
  desktop: new URL('../../images/assets/footer-vid/desktop-footer-scrub.mp4', import.meta.url).href,
  mobile: new URL('../../images/assets/footer-vid/mobile-footer-scrub.mp4', import.meta.url).href,
};
const footer = document.querySelector('.home-video-footer');
const viewport = footer.querySelector('.home-video-footer-viewport');
const mobile = matchMedia('(max-width: 768px)');
// All approved footer sources contain 30 frames per second.
const frameRate = 30;
const events = new AbortController();
let active = null;
let displayed = null;
let source = '';
let frame = 0;
let visible = false;
const entry = installFooterEntry(footer);
const text = installFooterText(footer, viewport);

function discard(video) {
  if (!video) return;
  video.remove();
  video.removeAttribute('src');
  video.load();
}

function progress() {
  const range = footer.offsetHeight - viewport.offsetHeight;
  return Math.max(0, Math.min(1, -footer.getBoundingClientRect().top / Math.max(1, range)));
}

function reveal(video) {
  if (video !== active || video.seeking || video.readyState < 2) return;
  // Retain the decoded old frame during a breakpoint source change.
  if (displayed !== video) {
    discard(displayed);
    displayed = video;
    video.style.visibility = 'visible';
  }
}

function update() {
  frame = 0;
  text.sync();
  const video = active;
  if (!video || document.hidden || !Number.isFinite(video.duration) || video.duration <= 0) return;
  // Offscreen videos stay paused; entry re-syncs to the current scroll position.
  if (!visible) return;
  const target = entry.locked ? 0 : progress() * video.duration;
  // Coalesce input while the decoder seeks, then seek to the latest position.
  if (video.seeking) return;
  // Sub-frame scroll changes do not change the picture. Avoid decoding it again;
  // retain the exact scroll-derived timestamp whenever a new frame is needed.
  if (Math.floor(video.currentTime * frameRate) !== Math.floor(target * frameRate)) video.currentTime = target;
  else reveal(video);
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(update);
}

function selectSource() {
  const next = mobile.matches ? sources.mobile : sources.desktop;
  if (next === source) return;
  source = next;
  if (active !== displayed) discard(active);
  const video = document.createElement('video');
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('aria-hidden', 'true');
  video.style.visibility = 'hidden';
  active = video;
  for (const name of ['loadedmetadata', 'loadeddata', 'seeked']) {
    video.addEventListener(name, () => {
      if (video !== active) return;
      // An opening frame can be displayed before the footer enters the viewport.
      if (!visible && video.currentTime === 0) reveal(video);
      schedule();
    }, { signal: events.signal });
  }
  viewport.append(video);
  video.src = next;
  video.load();
}

const visibility = new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
  if (visible) schedule();
});
visibility.observe(footer);
document.addEventListener('scroll', event => {
  if (event.target === document || event.target === document.body || event.target === document.documentElement) entry.sync();
  schedule();
}, { passive: true, capture: true, signal: events.signal });
window.addEventListener('resize', schedule, { passive: true, signal: events.signal });
document.addEventListener('visibilitychange', schedule, { signal: events.signal });
mobile.addEventListener('change', selectSource, { signal: events.signal });
// No time-driven interpolation, including when reduced motion is requested.
selectSource();

function dispose() {
  text.dispose();
  entry.dispose();
  events.abort();
  visibility.disconnect();
  cancelAnimationFrame(frame);
  if (active !== displayed) discard(active);
  discard(displayed);
}
window.addEventListener('pagehide', event => {
  if (!event.persisted) dispose();
}, { signal: events.signal });
window.addEventListener('pageshow', schedule, { signal: events.signal });
if (import.meta.hot) import.meta.hot.dispose(dispose);
