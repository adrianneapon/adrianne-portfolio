import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ProcessParticles from './ProcessParticles.jsx';
import './process.css';

const STEPS = [
  ['DISCOVER', 'Learn the users, goals, needs, and constraints.', 'Understand the problem, users, business goals, requirements, and constraints.'],
  ['DEFINE', 'Turn insights into clear priorities, flows, and direction.', 'Turn insights into clear priorities, flows, and direction before moving into design.'],
  ['DESIGN', 'Shape ideas into wireframes, interfaces, and prototypes.', 'Create wireframes, interfaces, and prototypes that shape the final user experience.'],
  ['DELIVER', 'Refine, hand off, and support the final implementation.', 'Refine the design, prepare handoff, and support the final implementation.'],
];

export default function DesignProcess({ container }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const height = container.querySelector('.process-step').getBoundingClientRect().height;
      const sectionTop = container.getBoundingClientRect().top;
      let progress = (window.innerHeight / 2 - sectionTop) / height;
      if (window.innerWidth <= 640) {
        const column = container.querySelector('.process-left');
        const intro = container.querySelector('.process-intro');
        const pinnedHeight = intro.offsetTop + intro.offsetHeight;
        const columnTop = column.getBoundingClientRect().top;
        const panelTop = Math.max(0, Math.min(innerHeight, columnTop + pinnedHeight));
        const panelCentre = panelTop + (innerHeight - panelTop) / 2;
        progress = (panelCentre - sectionTop - pinnedHeight) / height;
        container.style.setProperty('--process-pinned-height', `${pinnedHeight}px`);
      }
      const next = Math.max(0, Math.min(STEPS.length - 1, Math.floor(progress)));
      setActive(next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    // The existing page scrolls on body; capture also supports root scrolling.
    document.addEventListener('scroll', schedule, { passive: true, capture: true });
    window.addEventListener('resize', schedule);
    const sizing = new ResizeObserver(schedule);
    sizing.observe(container.querySelector('.process-intro'));
    update();
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      sizing.disconnect();
    };
  }, [container]);

  return createPortal(<>
    <div className="process-left">
      <ProcessParticles active={active} />
      <div className="process-intro">
        <p className="process-eyebrow">How the work happen</p>
        <h2 id="design-process-title">DESIGN PROCESS.</h2>
        <div className="process-explanations">
          {STEPS.map(([title, explanation], index) => <p key={title}
            className={`process-explanation${index <= active ? ' is-active' : ''}`}
            aria-hidden={index > active}>
            <span aria-hidden="true">&gt; </span>{explanation}
          </p>)}
        </div>
      </div>
    </div>
    <div className="process-right">
      {STEPS.map(([title, , description], index) => <article key={title}
        className="process-step" aria-current={active === index ? 'step' : undefined}>
        <div className="process-step-copy">
          <p className="process-eyebrow">0{index + 1}.</p>
          <h3>{title}</h3>
          <p className="process-description">{description}</p>
        </div>
      </article>)}
    </div>
  </>, container);
}
