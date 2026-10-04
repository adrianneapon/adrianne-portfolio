import { setDesktopScrollPosition } from '../desktop-smooth-scroll.js';

export function installFooterEntry(footer) {
  const scroller = getComputedStyle(document.body).overflowY === 'auto'
    ? document.body : document.scrollingElement;
  const events = new AbortController();
  const passive = { capture: true, passive: true, signal: events.signal };
  const blocking = { capture: true, passive: false, signal: events.signal };
  // Preserve a restored position already inside the video track.
  const initialTop = footer.getBoundingClientRect().top;
  let state = initialTop < 0 ? 'active' : 'approach';
  let footerStart = scroller.scrollTop + initialTop;
  let positionDirty = false;
  const invalidatePosition = () => { positionDirty = true; };
  // The footer follows these flow boxes. Their size changes include lazy
  // content, fonts and responsive section heights; the body alone has a fixed
  // viewport height and cannot report changes to all preceding content.
  const layoutSizes = new ResizeObserver(invalidatePosition);
  for (let node = footer; node; node = node.parentElement) {
    layoutSizes.observe(node);
    for (let sibling = node.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
      layoutSizes.observe(sibling);
    }
  }
  // Also invalidate when layout moves the footer into/out of the approach
  // range. This observer never changes the entry state or gesture handling.
  const proximity = new IntersectionObserver(invalidatePosition, { rootMargin: '200% 0px' });
  proximity.observe(footer);
  window.addEventListener('resize', invalidatePosition, passive);
  window.addEventListener('pageshow', invalidatePosition, passive);
  document.fonts.addEventListener('loadingdone', invalidatePosition, { signal: events.signal });
  let idleTimer = null;
  let wheelArmed = false;
  let touching = false;
  let touchY = null;
  let freshTouch = false;

  function pinOpening() {
    const top = scroller.scrollTop + footer.getBoundingClientRect().top;
    if (!setDesktopScrollPosition(top)) scroller.scrollTo({ top, behavior: 'instant' });
  }

  function resetWheelBoundary() {
    clearTimeout(idleTimer);
    wheelArmed = false;
    idleTimer = setTimeout(() => {
      // Arming never scrolls or starts the video; another input is required.
      wheelArmed = true;
    }, 250);
  }

  function setHeld(held) {
    // Touch tracking is passive everywhere except while the entry is held.
    document.removeEventListener('touchmove', onTouchMove, true);
    document.addEventListener('touchmove', onTouchMove, held ? blocking : passive);
    if (held) {
      window.addEventListener('wheel', onWheel, blocking);
      window.addEventListener('keydown', onKeyDown, { capture: true, signal: events.signal });
    } else {
      window.removeEventListener('wheel', onWheel, true);
      window.removeEventListener('keydown', onKeyDown, true);
      clearTimeout(idleTimer);
      wheelArmed = false;
      freshTouch = false;
    }
  }

  function release() {
    state = 'active';
    setHeld(false);
  }

  function onWheel(event) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey ||
        event.buttons || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    if (event.deltaY < 0 || wheelArmed) {
      release();
      return;
    }
    if (event.cancelable) event.preventDefault();
    resetWheelBoundary();
    pinOpening();
  }

  function onTouchStart(event) {
    freshTouch = state === 'held' && !touching && event.touches.length === 1;
    touching = true;
    touchY = event.touches.length === 1 ? event.touches[0].clientY : null;
  }

  function onTouchMove(event) {
    if (event.touches.length !== 1 || touchY === null) return;
    const y = event.touches[0].clientY;
    const delta = touchY - y;
    touchY = y;
    if (state !== 'held' || !delta) return;
    if (delta < 0 || freshTouch) {
      release();
      return;
    }
    if (event.cancelable) event.preventDefault();
    pinOpening();
  }

  function onTouchEnd(event) {
    if (event.touches.length) return;
    touching = false;
    touchY = null;
    freshTouch = false;
    // Momentum from this swipe is still clamped by sync(). Only a new
    // touchstart followed by downward movement releases the opening frame.
  }

  function onKeyDown(event) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey ||
        event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    const up = ['ArrowUp', 'PageUp', 'Home'].includes(event.key) || event.key === ' ' && event.shiftKey;
    const down = ['ArrowDown', 'PageDown', 'End', ' '].includes(event.key);
    if (up || down && !event.repeat) release();
    else if (down) event.preventDefault();
  }

  function sync() {
    // Use the cache only to reject distant positions, never for the entry
    // threshold. Current scrollTop also catches jumps past the approach range
    // immediately, without waiting for an IntersectionObserver notification.
    if (state === 'approach' && !positionDirty && footerStart - scroller.scrollTop > innerHeight * 2) return;
    const top = footer.getBoundingClientRect().top;
    footerStart = scroller.scrollTop + top;
    positionDirty = false;
    if (top > 1) {
      if (state === 'held') setHeld(false);
      state = 'approach';
      return;
    }
    if (state === 'approach' && top <= 0) {
      state = 'held';
      freshTouch = false;
      setHeld(true);
      resetWheelBoundary();
      pinOpening();
    } else if (state === 'held' && top < -0.5) {
      // Also discard native touch momentum after touchend, without a timer.
      pinOpening();
    }
  }

  // Entry swipes can start in the preceding section, so track their lifecycle
  // passively. No native touch scrolling is blocked outside the opening hold.
  document.addEventListener('touchstart', onTouchStart, passive);
  document.addEventListener('touchmove', onTouchMove, passive);
  document.addEventListener('touchend', onTouchEnd, passive);
  document.addEventListener('touchcancel', onTouchEnd, passive);

  return {
    sync,
    get locked() { return state === 'held'; },
    dispose() {
      clearTimeout(idleTimer);
      layoutSizes.disconnect();
      proximity.disconnect();
      events.abort();
    },
  };
}
