import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './content.css';

const CAREERS = [
  ['Senior UI/UX & Website Designer', 'Empower Wealth'],
  ['UI/UX, & Landing Page Designer', 'Strikingly'],
  ['Graphic, UI/UX, & Website Designer', 'Upwork'],
  ['UI/UX, & Website Designer', 'Citystyle IT Solutions Corp.'],
  ['UI/UX & Website Designer', 'EnfraUSA Solutions, Inc.'],
  ['Lead Website Designer', 'Wilcon Depot'],
  ['UI/UX & Website Designer', 'DXC Technology Philippines'],
];
const METRICS = [
  { value: 9, lines: ['Years of', 'Experience'] },
  { value: 100, lines: ['Projects', 'Completed'] },
  { value: 40, lines: ['Clients', '& Brands'] },
];
const CONTENT_THRESHOLD = 0.45;
const COUNT_DURATION = 2600;

export default function AboutContent({ container, mobile, reduced }) {
  const [revealed, setRevealed] = useState(false);
  const [metricsStarted, setMetricsStarted] = useState(false);
  const [counts, setCounts] = useState([0, 0, 0]);
  const metricsRef = useRef(null);
  const metricsDone = useRef(false);

  useEffect(() => {
    if (revealed) return;
    let observer;
    const observe = () => {
      observer?.disconnect();
      const threshold = CONTENT_THRESHOLD * (mobile ? Math.min(1, innerHeight / container.clientHeight) : 1);
      observer = new IntersectionObserver(([entry]) => {
        if (entry.intersectionRatio >= threshold) {
          setRevealed(true);
          observer.disconnect();
        }
      }, { threshold });
      observer.observe(container);
    };
    observe();
    const resize = mobile ? new ResizeObserver(observe) : null;
    resize?.observe(container);
    if (mobile) window.addEventListener('resize', observe);
    return () => {
      observer.disconnect();
      resize?.disconnect();
      if (mobile) window.removeEventListener('resize', observe);
    };
  }, [container, mobile, revealed]);

  useEffect(() => {
    if (metricsStarted) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio > 0) {
        setMetricsStarted(true);
        observer.disconnect();
      }
    }, { threshold: [0, 0.01] });
    observer.observe(metricsRef.current);
    return () => observer.disconnect();
  }, [mobile, metricsStarted]);

  useEffect(() => {
    if (!metricsStarted || metricsDone.current) return;
    if (reduced) {
      metricsDone.current = true;
      setCounts(METRICS.map(metric => metric.value));
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = time => {
      const progress = Math.min((time - start) / COUNT_DURATION, 1);
      const eased = progress === 1 ? 1 : 1 - 2 ** (-10 * progress);
      setCounts(METRICS.map(metric => Math.floor(metric.value * eased)));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else metricsDone.current = true;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [metricsStarted, reduced]);

  return createPortal(
    <div className={`about-content${revealed ? ' is-visible' : ''}`}>
      <div className="about-intro">
        <h2 className="about-heading about-reveal-left">Design is an idea<br />turned into reality.</h2>
        <p className="about-description about-reveal-left">
          I’m a UI/UX and Website Designer who turns ideas into clear, intuitive digital experiences that work for users and support real business goals.
        </p>
      </div>

      <aside className="about-career" aria-labelledby="about-career-title">
        <h3 id="about-career-title" className="about-career-title about-reveal-right">CAREER SNAPSHOT</h3>
        <ul className="about-career-list">
          {CAREERS.map(([role, company], index) => (
            <li key={company} className="about-career-item about-reveal-right" style={{ '--entrance-delay': `${80 + index * 80}ms` }}>
              <div className="about-career-text">
                <p className="about-career-role">{role}</p>
                <p className="about-career-company">{company}</p>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      <div ref={metricsRef} className="about-metrics" aria-label="Design experience in numbers">
        {METRICS.map((metric, index) => (
          <div key={metric.value} className="about-metric" role="group" aria-label={`${metric.value}+ ${metric.lines.join(' ')}`}>
            <div className="about-metric-number" aria-hidden="true">
              <span className="about-metric-reserve">{metric.value}+</span>
              <span className="about-metric-count">{counts[index]}+</span>
            </div>
            <p className="about-metric-label" aria-hidden="true">{metric.lines[0]}<br />{metric.lines[1]}</p>
          </div>
        ))}
      </div>
    </div>, container
  );
}
