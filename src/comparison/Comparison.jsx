import React, { useEffect, useRef, useState } from 'react';
import lowFi from '../../images/img/low-fi.png';
import highFi from '../../images/img/hi-fi.png';

// Reveal/slider interaction adapted from Motiq Compare Reveal (MIT).
// Both screenshots keep one shared frame; only the wireframe's clip changes.
export default function Comparison({ reveal }) {
  const viewport = useRef(null);
  const handle = useRef(null);
  const drag = useRef(null);
  const demoFrame = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [pointerFocus, setPointerFocus] = useState(false);
  const positionRef = useRef(50);
  // Position is a render-frame value, not component state. Keep the clipping,
  // divider and accessible slider value in sync without reconciling the images.
  const commit = value => {
    const position = Math.max(0, Math.min(100, value));
    positionRef.current = position;
    viewport.current.style.setProperty('--reveal', `${position}%`);
    handle.current.setAttribute('aria-valuenow', Math.round(position));
    handle.current.setAttribute('aria-valuetext', `${Math.round(position)}% wireframe, ${Math.round(100 - position)}% finished UI`);
  };

  function cancelDemo() {
    cancelAnimationFrame(demoFrame.current);
    demoFrame.current = 0;
  }

  useEffect(() => {
    const section = viewport.current.closest('section');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let visited = false;
    let interacted = false;
    let generation = 0;
    const interrupt = () => { interacted = true; cancelDemo(); };
    const play = () => {
      cancelDemo();
      if (drag.current || reduced.matches || document.hidden) return;
      const margin = Math.max(10, 41 / viewport.current.clientWidth * 100);
      const stops = [50, 100 - margin, margin, 50];
      const times = [0, 0.38, 0.78, 1];
      const from = positionRef.current;
      // A new upright cycle may follow manual dragging. Settle to its starting
      // centre smoothly rather than snapping away from the visitor's last value.
      const centering = Math.abs(from - 50) > 0.01 ? 220 : 0;
      let elapsed = 0;
      let last;
      const animate = now => {
        // Avoid skipping a leg if other page graphics briefly stall a frame.
        elapsed += last === undefined ? 0 : Math.min(50, now - last);
        last = now;
        if (elapsed < centering) {
          const t = elapsed / centering;
          commit(from + (50 - from) * (t * t * (3 - 2 * t)));
          demoFrame.current = requestAnimationFrame(animate);
          return;
        }
        const progress = Math.min(1, (elapsed - centering) / 2600);
        const leg = progress < times[1] ? 0 : progress < times[2] ? 1 : 2;
        const t = (progress - times[leg]) / (times[leg + 1] - times[leg]);
        const eased = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
        commit(progress === 1 ? 50 : stops[leg] + (stops[leg + 1] - stops[leg]) * eased);
        demoFrame.current = progress < 1 ? requestAnimationFrame(animate) : 0;
      };
      demoFrame.current = requestAnimationFrame(animate);
    };
    const revealChanged = () => {
      const state = reveal.current;
      if (!state.enabled) return;
      if (!state.upright) { cancelDemo(); return; }
      if (state.generation === generation) return;
      generation = state.generation;
      interacted = false;
      play();
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        visited = interacted = false;
        cancelDemo();
        if (!drag.current) commit(50);
        return;
      }
      // The untransformed small-screen fallback retains its existing visit demo.
      if (reveal.current.enabled || entry.intersectionRatio < 0.5 || visited) return;
      visited = true;
      if (!interacted) play();
    }, { threshold: [0, 0.5] });
    const visibility = () => { if (document.hidden) cancelDemo(); };
    const motion = () => { if (reduced.matches) cancelDemo(); };
    const element = viewport.current;
    element.addEventListener('pointerdown', interrupt, true);
    element.addEventListener('keydown', interrupt, true);
    element.addEventListener('click', interrupt, true);
    document.addEventListener('visibilitychange', visibility);
    reduced.addEventListener('change', motion);
    section.addEventListener('uiux:reveal-state', revealChanged);
    observer.observe(section);
    revealChanged();
    return () => {
      cancelDemo();
      observer.disconnect();
      element.removeEventListener('pointerdown', interrupt, true);
      element.removeEventListener('keydown', interrupt, true);
      element.removeEventListener('click', interrupt, true);
      document.removeEventListener('visibilitychange', visibility);
      reduced.removeEventListener('change', motion);
      section.removeEventListener('uiux:reveal-state', revealChanged);
    };
  }, [reveal]);

  function pointerPosition(event) {
    const element = viewport.current;
    const frame = element.parentElement;
    const style = getComputedStyle(frame);
    if (style.transform === 'none') {
      const rect = element.getBoundingClientRect();
      return { x: event.clientX - rect.left, width: rect.width };
    }
    // Invert only the presentation projection. The existing pointer capture,
    // drag offset and reveal percentage continue to operate in local pixels.
    const matrix = new DOMMatrixReadOnly(style.transform);
    const parent = frame.offsetParent.getBoundingClientRect();
    const x = event.clientX - parent.left - frame.offsetLeft - parseFloat(style.width) / 2;
    const y = event.clientY - parent.top - frame.offsetTop - parseFloat(style.height) / 2;
    const a = matrix.m11 - x * matrix.m14, b = matrix.m21 - x * matrix.m24;
    const c = x * matrix.m44 - matrix.m41;
    const d = matrix.m12 - y * matrix.m14, e = matrix.m22 - y * matrix.m24;
    const f = y * matrix.m44 - matrix.m42;
    const width = element.clientWidth;
    return { x: (c * e - b * f) / (a * e - b * d) + width / 2, width };
  }

  function startDrag(event) {
    cancelDemo();
    setPointerFocus(true);
    if (!event.isPrimary || event.button !== 0 || drag.current) return;
    const point = pointerPosition(event);
    // Grabbing the edge of the circle must not jump its centre to the pointer.
    const offset = handle.current.contains(event.target)
      ? point.x - point.width * positionRef.current / 100 : 0;
    drag.current = { id: event.pointerId, offset };
    event.currentTarget.setPointerCapture(event.pointerId);
    handle.current.focus({ preventScroll: true });
    setDragging(true);
    commit((point.x - offset) / point.width * 100);
  }

  function moveDrag(event) {
    if (drag.current?.id !== event.pointerId) return;
    const point = pointerPosition(event);
    // Direct tracking avoids the source demo's spring lag during a drag.
    commit((point.x - drag.current.offset) / point.width * 100);
  }

  function endDrag(event) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function keyDown(event) {
    cancelDemo();
    setPointerFocus(false);
    const step = event.shiftKey ? 10 : 2;
    let next;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = positionRef.current + step;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = positionRef.current - step;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = 100;
    else return;
    event.preventDefault();
    commit(next);
  }

  return <div className={`uiux-compare${dragging ? ' is-dragging' : ''}`}>
    <div ref={viewport} className="uiux-compare-viewport" role="group" aria-label="Wireframe and finished website comparison"
      style={{ '--reveal': '50%' }} onPointerDown={startDrag} onPointerMove={moveDrag}
      onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}
      onDoubleClick={() => commit(50)}>
      <div className="uiux-compare-images">
        <img src={highFi} alt="Finished high-fidelity property website" draggable={false} width="1253" height="595" />
        <img className="uiux-compare-wireframe" src={lowFi} alt="Low-fidelity wireframe of the same property website"
          draggable={false} width="1253" height="595" />
      </div>
      <div className="uiux-compare-divider">
        <button ref={handle} className="uiux-compare-handle" type="button" role="slider"
          aria-label="Reveal wireframe versus finished UI" aria-orientation="horizontal"
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={50}
          aria-valuetext="50% wireframe, 50% finished UI"
          data-pointer-focus={pointerFocus || undefined} onBlur={() => setPointerFocus(false)} onKeyDown={keyDown}>
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
            <path d="M6 1 1 7 6 13M12 1 17 7 12 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  </div>;
}
