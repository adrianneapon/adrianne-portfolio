import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

const images = import.meta.glob('../../images/projects/other/*.png', {
  eager: true, query: '?url', import: 'default',
});
const columns = [[1, 4, 7, 10], [2, 5, 8, 11], [3, 6, 9, 12]];
const clamp = value => Math.max(0, Math.min(1, value));

export default function OtherProjects() {
  const [responsive, setResponsive] = useState(() => matchMedia('(max-width: 1300px)').matches);
  useEffect(() => {
    const media = matchMedia('(max-width: 1300px)');
    const update = () => setResponsive(media.matches);
    media.addEventListener('change', update);
    update();
    return () => media.removeEventListener('change', update);
  }, []);
  return responsive ? <ResponsiveOtherProjects /> : <DesktopOtherProjects />;
}

function ResponsiveOtherProjects() {
  const stageRef = useRef(null);
  const headingRef = useRef(null);
  const galleryRef = useRef(null);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const section = stage.parentElement;
    const gallery = galleryRef.current;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, range = 1, readDistance = 0, travel = 0;
    const update = () => {
      frame = 0;
      const progress = clamp(-section.getBoundingClientRect().top / range);
      // Read through every row, then keep the opposing offsets moving until
      // the stage releases. Alignment at halfway is only a pass-through.
      const offset = reduced.matches ? 0 : travel * (progress * 2 - 1);
      stage.style.setProperty('--responsive-gallery-read', `${-readDistance * clamp(progress / 0.65)}px`);
      stage.style.setProperty('--responsive-column-left', `${-offset}px`);
      stage.style.setProperty('--responsive-column-right', `${offset}px`);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const measure = () => {
      const height = stage.clientHeight;
      const top = headingRef.current.offsetHeight + 62 + 72;
      travel = Math.min(24, height * 0.016);
      readDistance = Math.max(0, top + gallery.offsetHeight + travel + 32 - height);
      range = Math.max(height, readDistance) + height * 0.5;
      section.style.height = `${height + range}px`;
      gallery.style.top = `${top}px`;
      schedule();
    };
    const sizes = new ResizeObserver(measure);
    [stage, gallery, headingRef.current].forEach(node => sizes.observe(node));
    document.addEventListener('scroll', schedule, { passive: true, capture: true });
    reduced.addEventListener('change', schedule);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      sizes.disconnect();
      document.removeEventListener('scroll', schedule, true);
      reduced.removeEventListener('change', schedule);
      section.style.removeProperty('height');
    };
  }, []);

  return <>
    <div ref={headingRef} className="other-responsive-heading">
      <p>Other projects</p>
      <h2>Projects I also love.</h2>
    </div>
    <div ref={stageRef} className="other-responsive-stage">
      <div ref={galleryRef} className="other-responsive-gallery">
        {[[1, 3, 5, 7, 9, 11], [2, 4, 6, 8, 10, 12]].map((column, index) =>
          <div className="other-responsive-column" key={index}>
            {column.map(number => <img key={number}
              src={images[`../../images/projects/other/${number}.png`]}
              alt={`Additional project ${number}`} width="1920" height={number < 10 ? 911 : 912}
              loading="lazy" decoding="async" draggable="false" />)}
          </div>)}
      </div>
    </div>
  </>;
}

function DesktopOtherProjects() {
  const stageRef = useRef(null);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const section = stage.parentElement;
    const heading = section.querySelector('.other-projects-heading-position');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = matchMedia('(min-width: 1025px) and (pointer: fine) and (hover: hover)');
    let frame = 0;
    let height = stage.clientHeight;
    let previousProgress = -1;
    let revealDistance = 0;
    let readDistance = 0;
    let columnTravel = 0;
    let previousReadOffset = -1;
    let entered = false;

    const update = () => {
      frame = 0;
      const top = section.getBoundingClientRect().top;
      // Desktop enters at 25% of the viewport-height stage; keep the existing
      // 15%-viewport re-arm gap and the original smaller-screen thresholds.
      const entranceTop = desktop.matches ? 0.75 : 0.15;
      if (!entered && top <= height * entranceTop) {
        entered = true;
        heading.classList.add('is-entered');
      } else if (entered && top > height * (desktop.matches ? 0.9 : 0.3)) {
        entered = false;
        heading.classList.remove('is-entered');
      }
      const progress = reduced.matches ? 1 : clamp((height * 0.35 - top) / (height * 2.15));
      // Reveal the last row between upright and alignment, reserving enough
      // room below it for the outer columns' subsequent downward movement.
      const readOffset = reduced.matches
        ? Math.max(0, Math.min(revealDistance, -top - height * 1.8))
        : readDistance * clamp((progress - 0.72) / 0.28);
      if (readOffset !== previousReadOffset) {
        previousReadOffset = readOffset;
        stage.style.setProperty('--gallery-read-offset', `${readOffset}px`);
      }
      // Continue past alignment until the sticky gallery releases. This must
      // update even when the independent 3D/opacity progress has reached one.
      const continuation = clamp((-top - height * 1.8) / (revealDistance + height * 0.5));
      const remaining = 1 - clamp((progress - 0.25) / 0.75);
      const travel = columnTravel * continuation;
      stage.style.setProperty('--gallery-left', `calc(${-4 * remaining}% + ${travel}px)`);
      stage.style.setProperty('--gallery-center', `calc(${7 * remaining}% - ${travel * 1.75}px)`);
      stage.style.setProperty('--gallery-right', `calc(${-3 * remaining}% + ${travel * 0.75}px)`);
      if (progress === previousProgress) return;
      previousProgress = progress;
      const rotation = clamp(progress / 0.72);
      stage.style.setProperty('--gallery-image-opacity', 0.5 + 0.5 * clamp(rotation / 0.85));
      stage.style.setProperty('--gallery-rotate', `${75 * (1 - rotation)}deg`);
      stage.style.setProperty('--gallery-scale', 0.92 + 0.08 * progress);
      stage.style.setProperty('--gallery-offset', `${height * 0.12 * (1 - progress)}px`);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const measure = () => {
      height = stage.clientHeight;
      const gutter = parseFloat(getComputedStyle(stage).getPropertyValue('--gallery-gutter'));
      const gap = Math.max(6, Math.min(18, stage.clientWidth * 0.01));
      // Width follows the portfolio margins; do not shrink images to fit the viewport height.
      const columnWidth = (stage.clientWidth - gutter * 2 - gap * 2) / 3;
      const width = columnWidth * 3 + gap * 2;
      const galleryHeight = columnWidth * (3645 / 1920) + gap * 3;
      revealDistance = Math.max(0, galleryHeight - height + gutter);
      // Keep row 4 inside the viewport throughout the opposing column travel.
      const lastRowHeight = columnWidth * (912 / 1920);
      columnTravel = Math.max(0, Math.min(galleryHeight * 0.04, (height - lastRowHeight - gutter * 2) / 2.75));
      readDistance = Math.max(0, galleryHeight - height + gutter + columnTravel);
      // Retain the existing active runway; the separate empty hold follows it.
      section.style.height = `${height * 3.3 + revealDistance}px`;
      stage.style.setProperty('--gallery-width', `${width}px`);
      stage.style.setProperty('--gallery-gap', `${gap}px`);
      stage.style.setProperty('--gallery-perspective', `${Math.max(width * 1.4, galleryHeight * 3.5)}px`);
      section.style.setProperty('--gallery-heading-scale', Math.min(stage.clientWidth / 1920, height / 911));
      previousProgress = -1;
      schedule();
    };
    const sizes = new ResizeObserver(measure);
    sizes.observe(stage);
    document.addEventListener('scroll', schedule, { passive: true, capture: true });
    reduced.addEventListener('change', schedule);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      sizes.disconnect();
      document.removeEventListener('scroll', schedule, true);
      reduced.removeEventListener('change', schedule);
    };
  }, []);

  return <>
    <div className="other-projects-heading-position">
      <div className="other-projects-heading">
        <p className="projects-enter">Other projects</p>
        <h2 className="projects-enter">Projects I also love.</h2>
      </div>
    </div>
    <div ref={stageRef} className="other-projects-stage">
    <div className="other-projects-gallery">
      {columns.map((column, index) => <div className="other-projects-column" key={index}>
        {column.map(number => <img key={number}
          src={images[`../../images/projects/other/${number}.png`]}
          alt={`Additional project ${number}`} width="1920" height={number < 10 ? 911 : 912}
          loading="lazy" decoding="async" draggable="false" />)}
      </div>)}
    </div>
    </div>
  </>;
}
