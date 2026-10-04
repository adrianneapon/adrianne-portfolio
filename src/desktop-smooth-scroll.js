import Lenis from 'lenis';

let setImmediatePosition = null;

// Used only by the homepage footer's entry boundary. No new scroll controller.
export function setDesktopScrollPosition(top) {
  return setImmediatePosition?.(top) ?? false;
}

export function installDesktopSmoothScroll() {
  const desktop = matchMedia('(min-width: 1025px) and (pointer: fine) and (hover: hover)');
  const touch = matchMedia('(any-pointer: coarse)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const scroller = getComputedStyle(document.body).overflowY === 'auto'
    ? document.body : document.scrollingElement;
  let lenis = null;

  const cancel = () => {
    // Reset to the real scroll position; never finish an old target on override.
    lenis?.reset();
  };
  setImmediatePosition = top => {
    if (!lenis) return false;
    cancel();
    lenis.scrollTo(top, { immediate: true, force: true });
    return true;
  };
  const keyDown = event => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape', 'Tab'].includes(event.key)) cancel();
  };
  const anchorClick = event => {
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (link?.hash || link?.getAttribute('href') === '#') cancel();
    // Existing anchor handlers retain their destinations, history and native easing.
  };
  const sync = () => {
    const enabled = desktop.matches && !touch.matches && !reduced.matches && !document.hidden;
    if (enabled === Boolean(lenis)) return;
    if (!enabled) {
      cancel();
      lenis.destroy();
      lenis = null;
      return;
    }

    lenis = new Lenis({
      wrapper: scroller === document.documentElement ? window : scroller,
      content: scroller,
      eventsTarget: window,
      smoothWheel: true,
      syncTouch: false,
      lerp: 0.18,
      wheelMultiplier: 1,
      autoRaf: true,
      // The body is already the native scroller. Child sections can change its
      // scrollHeight without changing its own observed 100%-height border box.
      naiveDimensions: true,
      allowNestedScroll: true,
      anchors: false,
      prevent: node => {
        const nativeControl = node.matches('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
        if (nativeControl) cancel();
        return nativeControl;
      },
      virtualScroll: ({ deltaX, deltaY, event }) => {
        if (event.type !== 'wheel' || event.defaultPrevented || !event.cancelable ||
            event.buttons || event.ctrlKey || event.metaKey || event.shiftKey ||
            !Number.isFinite(deltaY) || Math.abs(deltaX) > Math.abs(deltaY)) {
          cancel();
          return false;
        }
        const remaining = lenis.targetScroll - lenis.actualScroll;
        if (deltaY && remaining && Math.sign(deltaY) !== Math.sign(remaining)) cancel();
        return true;
      },
    });
    // No Lenis height/overflow CSS: preserve this site's existing body scroller,
    // sticky containing blocks, scrollbar and fixed backgrounds exactly.
  };

  // Capture before native keyboard/scrollbar/anchor actions and ID/divider drags.
  window.addEventListener('pointerdown', cancel, { capture: true, passive: true });
  window.addEventListener('touchstart', cancel, { capture: true, passive: true });
  window.addEventListener('keydown', keyDown, true);
  window.addEventListener('click', anchorClick, true);
  window.addEventListener('hashchange', cancel);
  window.addEventListener('popstate', cancel);
  document.addEventListener('visibilitychange', sync);
  [desktop, touch, reduced].forEach(media => media.addEventListener('change', sync));
  sync();

  return () => {
    setImmediatePosition = null;
    cancel();
    lenis?.destroy();
    lenis = null;
    window.removeEventListener('pointerdown', cancel, true);
    window.removeEventListener('touchstart', cancel, true);
    window.removeEventListener('keydown', keyDown, true);
    window.removeEventListener('click', anchorClick, true);
    window.removeEventListener('hashchange', cancel);
    window.removeEventListener('popstate', cancel);
    document.removeEventListener('visibilitychange', sync);
    [desktop, touch, reduced].forEach(media => media.removeEventListener('change', sync));
  };
}
