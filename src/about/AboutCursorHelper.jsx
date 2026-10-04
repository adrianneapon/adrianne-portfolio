import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './cursor-helper.css';

export default function AboutCursorHelper({ section, interactionContainer }) {
  const helper = useRef(null);
  const hasDraggedId = useRef(false);

  useEffect(() => {
    const label = helper.current;
    const desktop = matchMedia('(min-width: 1025px) and (pointer: fine) and (hover: hover)');
    let detach = () => {};
    const configure = () => {
      detach();
      label.hidden = true;
      if (!desktop.matches) return;
      let point = null;
      let press = null;
      const update = () => {
        if (!point) return;
        const rect = section.getBoundingClientRect();
        const inside = point.x >= rect.left && point.x < rect.right
          && point.y >= rect.top && point.y < rect.bottom;
        // Read the lanyard's existing hover/drag cursor; do not add hit testing.
        const cursor = inside || press ? getComputedStyle(interactionContainer).cursor : '';
        if (!hasDraggedId.current && press?.moved && cursor === 'grabbing') {
          hasDraggedId.current = true;
          label.textContent = 'HAHA, you cannot take my ID. 😛';
        }
        label.hidden = !inside || cursor === 'grab' || cursor === 'grabbing';
        // The native 20px circle is centred on its 10px hotspot.
        label.style.left = `${point.x + 10 + 16}px`;
        label.style.top = `${point.y}px`;
      };
      const hide = () => { point = null; press = null; label.hidden = true; };
      const down = event => {
        if (event.pointerType === 'mouse' && event.isPrimary && event.button === 0) {
          press = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
        }
      };
      const up = () => { press = null; };
      const move = event => {
        if (event.pointerType !== 'mouse') { hide(); return; }
        // A grabbing cursor alone also represents a click. Require deliberate
        // held-pointer movement before remembering the first actual ID drag.
        if (press?.id === event.pointerId && (event.buttons & 1)) {
          press.moved ||= Math.hypot(event.clientX - press.x, event.clientY - press.y) > 3;
        }
        point = { x: event.clientX, y: event.clientY };
        update();
      };
      const cursorChanges = new MutationObserver(update);
      cursorChanges.observe(interactionContainer, { attributes: true, attributeFilter: ['style'] });
      document.addEventListener('pointermove', move, { passive: true });
      document.addEventListener('pointerdown', down, { passive: true, capture: true });
      document.addEventListener('pointerup', up, true);
      document.addEventListener('pointercancel', up, true);
      document.addEventListener('pointerleave', hide);
      document.addEventListener('scroll', update, { passive: true, capture: true });
      document.addEventListener('visibilitychange', hide);
      window.addEventListener('blur', hide);
      window.addEventListener('resize', update);
      detach = () => {
        cursorChanges.disconnect();
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerdown', down, true);
        document.removeEventListener('pointerup', up, true);
        document.removeEventListener('pointercancel', up, true);
        document.removeEventListener('pointerleave', hide);
        document.removeEventListener('scroll', update, true);
        document.removeEventListener('visibilitychange', hide);
        window.removeEventListener('blur', hide);
        window.removeEventListener('resize', update);
      };
    };
    desktop.addEventListener('change', configure);
    configure();
    return () => { detach(); desktop.removeEventListener('change', configure); };
  }, [section, interactionContainer]);

  return createPortal(<span ref={helper} className="about-cursor-helper" hidden aria-hidden="true">
    psst, don't grab my ID. Okay? 🥹
  </span>, document.body);
}
