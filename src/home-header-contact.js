const header = document.querySelector('header');
const email = header?.querySelector('.header-email');
const footer = document.querySelector('.home-video-footer');

if (header && email && footer) {
  const events = new AbortController();
  let observer;
  let overlapping = false;

  const observe = () => {
    observer?.disconnect();
    // Observe only the header's revealed footprint, not the whole viewport.
    // Keep tracking while its existing transform hides it so a reveal already
    // has the correct colour. Measure only on setup/resize, never on scroll.
    const height = Math.min(window.innerHeight, header.offsetHeight);
    observer = new IntersectionObserver(([entry]) => {
      const next = entry.isIntersecting;
      if (next === overlapping) return;
      overlapping = next;
      email.classList.toggle('is-over-home-footer', overlapping);
    }, { rootMargin: `0px 0px -${window.innerHeight - height}px 0px` });
    observer.observe(footer);
  };

  const size = new ResizeObserver(observe);
  size.observe(header);
  window.addEventListener('resize', observe, { passive: true, signal: events.signal });
  window.addEventListener('pageshow', observe, { signal: events.signal });
  observe();

  const dispose = () => {
    observer.disconnect();
    size.disconnect();
    events.abort();
    email.classList.remove('is-over-home-footer');
  };
  window.addEventListener('pagehide', event => {
    if (!event.persisted) dispose();
  }, { signal: events.signal });
  if (import.meta.hot) import.meta.hot.dispose(dispose);
}
