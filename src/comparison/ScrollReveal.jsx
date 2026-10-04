import React, { useLayoutEffect, useRef } from 'react';
import Comparison from './Comparison.jsx';
import SurroundingText from './SurroundingText.jsx';
import './surrounding-text.css';

export default function ScrollReveal() {
  const composition = useRef(null);
  const intro = useRef(null);
  const sides = useRef(null);
  const tail = useRef(null);
  const reveal = useRef({ enabled: false, upright: false, generation: 0 });

  useLayoutEffect(() => {
    const element = composition.current;
    const section = element.closest('section');
    const desktop = matchMedia('(min-width: 769px) and (min-height: 795px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let armed = true;
    const textElements = [intro.current, sides.current];
    const inView = new Map();
    const show = (node, visible) => node.classList.toggle('is-visible', visible);
    const update = () => {
      frame = 0;
      const enabled = desktop.matches;
      const top = section.getBoundingClientRect().top;
      // Entry at +0.5 viewport; release at -2.5 viewports: a 3-viewport run.
      const progress = Math.max(0, Math.min(1, (innerHeight * 0.5 - top) / (innerHeight * 3)));
      const amount = enabled && !reduced.matches ? Math.max(0, Math.min(1, (progress - 0.08) / 0.74)) : 1;
      element.style.setProperty('--compare-rotation', `${60 * (1 - amount)}deg`);
      element.style.setProperty('--compare-scale', `${0.92 + 0.08 * amount}`);
      element.style.setProperty('--compare-offset', `${50 * (1 - amount)}px`);
      const textRevealed = amount >= 0.9;
      textElements.forEach(node => show(node, enabled ? textRevealed : !!inView.get(node)));
      const upright = enabled && textRevealed;
      const previous = reveal.current;
      if (progress <= 0.74 || enabled !== previous.enabled) armed = true;
      const generation = previous.generation + (upright && armed ? 1 : 0);
      if (upright) armed = false;
      reveal.current = { enabled, upright, generation };
      if (enabled !== previous.enabled || upright !== previous.upright || generation !== previous.generation) {
        section.dispatchEvent(new Event('uiux:reveal-state'));
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    // Reserve reading space outside the locked comparison runway, not inside its sticky bounds.
    const measureText = () => {
      const comparison = element.querySelector('.uiux-compare');
      const sideTop = comparison.offsetTop + comparison.offsetHeight + 52;
      element.style.setProperty('--uiux-text-top', `${sideTop}px`);
      element.style.setProperty('--uiux-intro-space', `${comparison.offsetTop}px`);
      const wide = matchMedia('(min-width: 1900px) and (min-height: 795px)').matches;
      tail.current.style.height = `${wide ? 0 : Math.max(0, sideTop + sides.current.offsetHeight + 96 - element.clientHeight)}px`;
    };
    const sizes = new ResizeObserver(measureText);
    [element, sides.current, element.querySelector('.uiux-compare')].forEach(node => sizes.observe(node));
    const visibility = new IntersectionObserver(entries => {
      entries.forEach(entry => inView.set(entry.target, entry.isIntersecting));
      schedule();
    });
    textElements.forEach(node => visibility.observe(node));
    window.addEventListener('resize', measureText);
    document.addEventListener('scroll', schedule, { passive: true, capture: true });
    window.addEventListener('resize', schedule);
    desktop.addEventListener('change', schedule);
    reduced.addEventListener('change', schedule);
    measureText();
    update();
    return () => {
      cancelAnimationFrame(frame);
      sizes.disconnect();
      visibility.disconnect();
      window.removeEventListener('resize', measureText);
      document.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      desktop.removeEventListener('change', schedule);
      reduced.removeEventListener('change', schedule);
    };
  }, []);

  return <><section className="uiux-comparison-runway" aria-label="UI/UX comparison presentation"><div className="uiux-reveal-stage">
    <div ref={composition} className="uiux-reveal-composition">
      <SurroundingText introRef={intro} sidesRef={sides} />
      <Comparison reveal={reveal} />
    </div>
  </div></section><div ref={tail} className="uiux-text-tail" aria-hidden="true" /></>;
}
