const mobile = matchMedia('(max-width: 920px)');
const scroller = getComputedStyle(document.body).overflowY === 'auto'
  ? document.body : document.documentElement;

document.querySelectorAll('.mobile-showcase').forEach(showcase => {
  const stage = showcase.querySelector('.mobile-device-stage');
  const screen = showcase.querySelector('.mobile-device-screen');
  const content = showcase.querySelector('.mobile-device-content');
  let pinTop = 0;
  let travel = 0;
  let frame = 0;

  const update = () => {
    frame = 0;
    if (!mobile.matches) return;
    // The existing Behaviour A mapping: native scroll advances the image
    // one pixel at a time, with sticky release at both ends of the runway.
    const offset = Math.max(0, Math.min(travel, pinTop - showcase.getBoundingClientRect().top));
    content.style.setProperty('--mobile-content-y', `${-offset}px`);
  };
  const schedule = () => {
    if (mobile.matches && !frame) frame = requestAnimationFrame(update);
  };
  const measure = () => {
    if (!mobile.matches) {
      showcase.style.removeProperty('height');
      return;
    }
    const stageHeight = stage.getBoundingClientRect().height;
    travel = Math.max(0, content.getBoundingClientRect().height - screen.getBoundingClientRect().height);
    pinTop = (scroller.clientHeight - stageHeight) / 2;
    showcase.style.height = `${stageHeight + travel}px`;
    stage.style.setProperty('--mobile-pin-top', `${pinTop}px`);
    update();
  };

  const resize = new ResizeObserver(measure);
  resize.observe(stage);
  resize.observe(scroller);
  content.addEventListener('load', measure);
  document.addEventListener('scroll', schedule, { capture: true, passive: true });
  window.addEventListener('resize', measure, { passive: true });
  mobile.addEventListener('change', measure);
  measure();

  if (import.meta.hot) import.meta.hot.dispose(() => {
    cancelAnimationFrame(frame);
    resize.disconnect();
    content.removeEventListener('load', measure);
    document.removeEventListener('scroll', schedule, true);
    window.removeEventListener('resize', measure);
    mobile.removeEventListener('change', measure);
    showcase.style.removeProperty('height');
    stage.style.removeProperty('--mobile-pin-top');
    content.style.removeProperty('--mobile-content-y');
  });
});
