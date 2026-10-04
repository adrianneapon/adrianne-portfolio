import './footer.css';

const footer = document.getElementById('contact-footer');
const track = footer.querySelector('.footer-marquee-track');
const repeat = track.firstElementChild.cloneNode(true);
track.append(repeat);
let disposed = false;
const heading = document.getElementById('footer-title');
const now = heading.querySelector('.footer-now');
let timer = 0;
let completed = false;
const measure = () => heading.style.setProperty('--footer-now-width', `${now.getBoundingClientRect().width}px`);
const sizes = new ResizeObserver(measure);
sizes.observe(now);
measure();
// A sustained, mostly visible footer visit starts the one-time word change.
const visits = new IntersectionObserver(([entry]) => {
  clearTimeout(timer);
  if (completed || entry.intersectionRatio < .9) return;
  timer = setTimeout(() => {
    completed = true;
    heading.classList.add('is-complete');
    heading.setAttribute('aria-label', 'WHAT SHOULD WE DESIGN NEXTNOW?');
    visits.disconnect();
    sizes.disconnect();
  }, 1500);
}, { threshold: [.9] });
visits.observe(footer);
let marqueeVisible = false;
const syncMarquee = () => footer.classList.toggle('marquee-visible', marqueeVisible && !document.hidden);
const marqueeVisibility = new IntersectionObserver(([entry]) => {
  marqueeVisible = entry.isIntersecting;
  syncMarquee();
});
marqueeVisibility.observe(footer.querySelector('.footer-marquee'));
document.addEventListener('visibilitychange', syncMarquee);
// Wait for stable text widths before starting the seamless CSS-only loop.
document.fonts.ready.then(() => {
  if (!disposed) footer.classList.add('marquee-ready');
});
const dispose = () => {
  disposed = true;
  clearTimeout(timer);
  visits.disconnect();
  sizes.disconnect();
  marqueeVisibility.disconnect();
  document.removeEventListener('visibilitychange', syncMarquee);
  footer.classList.remove('marquee-visible');
  footer.classList.remove('marquee-ready');
  repeat.remove();
};
if (import.meta.hot) import.meta.hot.dispose(dispose);
