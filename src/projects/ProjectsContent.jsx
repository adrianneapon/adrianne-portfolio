import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import sears from '../../images/projects/Sears-mobile.png';
import cafe from '../../images/projects/Cafe-mobile.png';
import moorr from '../../images/projects/Moorr-desktop.png';
import alpha from '../../images/projects/Alpha-mobile.png';
import northline from '../../images/projects/Northline-mobile.png';
import searsDesktop from '../../images/projects/Sears-desktop.png';
import cafeDesktop from '../../images/projects/Cafe-desktop.png';
import moorrMobile from '../../images/projects/Moorr-mobile.png';
import alphaDesktop from '../../images/projects/Alpha-desktop.png';
import northlineDesktop from '../../images/projects/Northline-desktop.png';
import './projects-content.css';

const projects = [
  { name: 'Sears', href: '/projects/#sears-title', mobile: sears, desktop: searsDesktop, x: 40, y: 714, width: 173.683, mobileWidth: 173.683, mobileAspect: 209 / 471, delay: 945 },
  { name: 'Cafe', href: '/projects/#cafe-title', mobile: cafe, desktop: cafeDesktop, x: 238, y: 714, width: 179.015, mobileWidth: 179.015, mobileAspect: 215 / 471, delay: 614 },
  { name: 'Moorr', href: '/projects/#moorr-title', mobile: moorrMobile, desktop: moorr, x: 441, y: 649, width: 1042, mobileWidth: 173.683, mobileAspect: 209 / 471, delay: 429 },
  { name: 'Mr. Plumber', href: '/projects/#plumber-title', mobile: alpha, desktop: alphaDesktop, x: 1506, y: 714, width: 173.683, mobileWidth: 173.683, mobileAspect: 209 / 471, delay: 614 },
  { name: 'Northline', href: '/projects/#northline-title', mobile: northline, desktop: northlineDesktop, x: 1704, y: 714, width: 173.993, mobileWidth: 173.993, mobileAspect: 209 / 471, delay: 945 },
];
const defaultActive = 2;
const desktop = { width: projects[defaultActive].width, height: 523, y: projects[defaultActive].y };
const gaps = projects.map((project, index) => index ? project.x - projects[index - 1].x - projects[index - 1].width : 0);

export default function ProjectsContent() {
  const [stacked, setStacked] = useState(() => matchMedia('(max-width: 1300px)').matches);
  useEffect(() => {
    const media = matchMedia('(max-width: 1300px)');
    const update = () => setStacked(media.matches);
    media.addEventListener('change', update);
    update();
    return () => media.removeEventListener('change', update);
  }, []);

  if (!stacked) return <DesktopProjectsContent />;
  return <div className="projects-stack">
    <p className="projects-eyebrow">Case Studies</p>
    <h2 className="projects-title">Projects<br />I’m proud of.</h2>
    <div className="projects-stack-list">
      {projects.map(project => <a href={project.href} className="projects-stack-card"
        key={project.name} aria-label={`View ${project.name} case study`}>
        <img src={project.desktop} alt={`${project.name} desktop website`} draggable="false" />
      </a>)}
    </div>
  </div>;
}

function DesktopProjectsContent() {
  const content = useRef(null);
  const pointer = useRef(null);
  const [interactionReady, setInteractionReady] = useState(false);
  const [active, setActive] = useState(defaultActive);
  const [imagesReady, setImagesReady] = useState(false);
  const interactive = interactionReady && imagesReady;

  useEffect(() => {
    let cancelled = false;
    // Both layers are mounted eagerly; wait for decoding before enabling swaps.
    Promise.all([...content.current.querySelectorAll('img')].map(image => image.decode()))
      .then(() => { if (!cancelled) setImagesReady(true); })
      .catch(() => { /* Keep the approved static composition if an image fails to load. */ });
    return () => { cancelled = true; };
  }, []);

  useLayoutEffect(() => {
    const element = content.current;
    const stage = element.closest('section');
    const runway = stage.parentElement;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let settleTimer = 0;
    let entered = false;
    let settled = false;
    let transitionStart = 0.15;
    let wasInteractionReady = false;
    const scrollOffset = () => -runway.getBoundingClientRect().top / innerHeight;
    const syncInteraction = offset => {
      const ready = settled && offset >= -0.3 && stage.getBoundingClientRect().bottom > 0;
      if (ready !== wasInteractionReady) {
        wasInteractionReady = ready;
        setInteractionReady(ready);
        if (!ready) setActive(defaultActive);
        pointer.current = null;
      }
    };
    const reset = () => {
      clearTimeout(settleTimer);
      entered = settled = false;
      transitionStart = 0.15;
      element.classList.remove('is-entered');
    };
    const update = () => {
      frame = 0;
      const offset = scrollOffset();
      // 85% of the actual 100vh stage, not 85% of the outer runway.
      if (!entered && offset >= -0.15) {
        entered = true;
        element.classList.add('is-entered');
        if (reduced.matches) settled = true;
        else settleTimer = setTimeout(() => {
          settled = true;
          // Fast input cannot collapse the first view during its entrance.
          // Further scroll drives the transformation; no scroll input is intercepted.
          transitionStart = Math.max(0.15, Math.min(1.14, scrollOffset()));
          syncInteraction(scrollOffset());
        }, 2000);
      } else if (entered && offset < -0.3) reset();
      const progress = settled ? Math.max(0, Math.min(1, (offset - transitionStart) / (1.15 - transitionStart))) : 0;
      element.style.setProperty('--projects-progress', progress);
      syncInteraction(offset);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const measure = () => {
      element.style.setProperty('--projects-scale', Math.min(stage.clientWidth / 1920, stage.clientHeight / 911));
      schedule();
    };
    const sizes = new ResizeObserver(measure);
    sizes.observe(stage);
    document.addEventListener('scroll', schedule, { passive: true, capture: true });
    window.addEventListener('resize', measure);
    reduced.addEventListener('change', schedule);
    measure();
    update();
    return () => {
      clearTimeout(settleTimer);
      cancelAnimationFrame(frame);
      sizes.disconnect();
      document.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', measure);
      reduced.removeEventListener('change', schedule);
    };
  }, []);

  const selected = active;
  let left = projects[0].x;
  const activate = index => { if (interactive) setActive(index); };
  const hover = (event, index) => {
    if (event.pointerType === 'touch') return;
    const position = `${event.clientX},${event.clientY}`;
    // Moving containers must not switch selection under a stationary pointer.
    if (pointer.current === position) return;
    pointer.current = position;
    activate(index);
  };

  return <div ref={content} className="projects-content" data-interactive={interactive}>
    <div className="projects-eyebrow-position"><p className="projects-enter projects-eyebrow">Case Studies</p></div>
    <div className="projects-title-position"><h2 className="projects-enter projects-title">Projects<br />I’m proud of.</h2></div>
    <div className="projects-image-position">
      {projects.map((project, index) => {
        const isActive = index === selected;
        const width = isActive ? desktop.width : project.mobileWidth;
        const x = left + gaps[index];
        left = x + width;
        return <a href={project.href} className="project-preview" key={project.name}
          aria-disabled={!interactive} tabIndex={interactive ? 0 : -1}
          aria-label={`View ${project.name} case study`} data-active={isActive}
          onPointerMove={event => hover(event, index)} onFocus={() => activate(index)} onClick={event => { if (!interactive) event.preventDefault(); }}
          style={{ left: x, top: isActive ? desktop.y : projects[0].y, width,
            height: isActive ? desktop.height : width / project.mobileAspect,
            borderRadius: isActive ? 24 : 16, '--entry-delay': `${project.delay}ms` }}>
          <span className="projects-enter project-preview-frame">
            <img className="project-image-mobile" src={project.mobile} alt="" loading="eager" draggable="false" />
            <img className="project-image-desktop" src={project.desktop} alt="" loading="eager" draggable="false" />
          </span>
        </a>;
      })}
    </div>
  </div>;
}
