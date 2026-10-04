const showcase = document.querySelector('.sears-showcase');

if (showcase) {
  const video = showcase.querySelector('video');
  const desktop = matchMedia('(width > 920px)');
  let completed = false;
  let frame = 0;
  let loaded = false;

  const leave = () => {
    video.pause();
  };
  const finish = () => { completed = true; };
  const update = () => {
    frame = 0;
    if (!desktop.matches || document.hidden) {
      leave();
      return;
    }
    if (!loaded) {
      loaded = true;
      video.preload = 'metadata';
      video.load();
    }
    const rect = showcase.getBoundingClientRect();
    const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
    const visibleWidth = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
    const visibility = rect.width && rect.height
      ? visibleWidth * visibleHeight / (rect.width * rect.height) : 0;
    if (visibility === 0) {
      leave();
      if (video.currentTime !== 0) video.currentTime = 0;
      completed = false;
    } else if (visibility < 0.4) {
      leave();
    } else if (visibility >= 0.8 && !completed && !video.ended && video.paused) {
      // Resume the existing timestamp. Only a full exit resets it or rearms
      // a completed video; the 40–80% band never changes playback state.
      video.play().catch(() => {});
    }
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  document.addEventListener('scroll', schedule, { passive: true, capture: true });
  window.addEventListener('resize', schedule, { passive: true });
  document.addEventListener('visibilitychange', update);
  video.addEventListener('ended', finish);
  desktop.addEventListener('change', update);
  const resize = new ResizeObserver(schedule);
  resize.observe(showcase);
  document.fonts.ready.then(schedule);
  update();

  if (import.meta.hot) import.meta.hot.dispose(() => {
    cancelAnimationFrame(frame);
    leave();
    resize.disconnect();
    document.removeEventListener('scroll', schedule, true);
    window.removeEventListener('resize', schedule);
    document.removeEventListener('visibilitychange', update);
    video.removeEventListener('ended', finish);
    desktop.removeEventListener('change', update);
  });
}
