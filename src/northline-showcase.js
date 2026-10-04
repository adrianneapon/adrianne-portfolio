const showcase = document.querySelector('.northline-showcase');

if (showcase) {
  const stage = showcase.querySelector('.moorr-device-stage');
  const screen = showcase.querySelector('.moorr-screen');
  const content = showcase.querySelector('.moorr-screen-content');
  const scroller = getComputedStyle(document.body).overflowY === 'auto'
    ? document.body : document.documentElement;
  const desktop = matchMedia('(width > 920px)');
  let pinTop = 0;
  let travel = 0;
  let frame = 0;

  const update = () => {
    frame = 0;
    if (!desktop.matches) return;
    // One native scroll pixel advances the UI by one rendered pixel. The
    // sticky stage releases at either end; no wheel interception or scroll reset.
    const offset = Math.max(0, Math.min(travel, pinTop - showcase.getBoundingClientRect().top));
    content.style.setProperty('--moorr-content-y', `${-offset}px`);
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const measure = () => {
    if (!desktop.matches) {
      showcase.style.removeProperty('height');
      return;
    }
    const stageHeight = stage.getBoundingClientRect().height;
    travel = Math.max(0, content.getBoundingClientRect().height - screen.getBoundingClientRect().height);
    pinTop = (scroller.clientHeight - stageHeight) / 2;
    showcase.style.height = `${stageHeight + travel}px`;
    stage.style.setProperty('--moorr-pin-top', `${pinTop}px`);
    update();
  };

  const resize = new ResizeObserver(measure);
  resize.observe(stage);
  resize.observe(scroller);
  content.addEventListener('load', measure);
  document.addEventListener('scroll', schedule, { capture: true, passive: true });
  window.addEventListener('resize', measure, { passive: true });
  desktop.addEventListener('change', measure);
  measure();

  const dispose = () => {
    cancelAnimationFrame(frame);
    resize.disconnect();
    desktop.removeEventListener('change', measure);
    content.removeEventListener('load', measure);
    document.removeEventListener('scroll', schedule, true);
    window.removeEventListener('resize', measure);
    showcase.style.removeProperty('height');
    stage.style.removeProperty('--moorr-pin-top');
    content.style.removeProperty('--moorr-content-y');
  };
  if (import.meta.hot) import.meta.hot.dispose(dispose);
}
