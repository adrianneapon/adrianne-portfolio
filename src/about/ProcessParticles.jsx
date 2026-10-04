import React, { useEffect, useRef } from 'react';
import discover from '../../images/process/discover.png';
import define from '../../images/process/define.png';
import design from '../../images/process/design.png';
import deliver from '../../images/process/deliver.png';
import './particles.css';

const ICONS = [
  { url: discover, x: 156, y: 159, width: 257, height: 257 },
  { url: define, x: 111, y: 116, width: 344, height: 344 },
  { url: design, x: 115, y: 138, width: 340, height: 321 },
  { url: deliver, x: 133, y: 172, width: 272, height: 238 },
];
const PAD = 180;
const DURATION = 0.8;
const mix = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);

// Nearby samples retain nearby identities during morphs (Morton/Z ordering).
function spatialKey(x, y) {
  let key = 0;
  for (let bit = 0; bit < 10; bit++) {
    key |= ((x >> bit) & 1) << (bit * 2);
    key |= ((y >> bit) & 1) << (bit * 2 + 1);
  }
  return key;
}

async function sampleIcon(icon) {
  const image = new Image();
  image.src = icon.url;
  await image.decode();
  const mask = document.createElement('canvas');
  mask.width = icon.width;
  mask.height = icon.height;
  const context = mask.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, icon.width, icon.height);
  const pixels = context.getImageData(0, 0, icon.width, icon.height).data;
  const points = [];
  // Denser staggered samples supply the 2,154-particle target for every icon.
  for (let row = 0, y = 2; y < icon.height; row++, y += 2) {
    for (let x = 2 + (row % 2); x < icon.width; x += 2) {
      if (pixels[(y * icon.width + x) * 4 + 3] < 128) continue;
      points.push({ x: icon.x + x, y: icon.y + y,
        key: spatialKey(Math.floor(x / icon.width * 1023), Math.floor(y / icon.height * 1023)) });
    }
  }
  if (!points.length) throw new Error('Process icon has no readable shape: ' + icon.url);
  return points.sort((a, b) => a.key - b.key);
}

export default function ProcessParticles({ active }) {
  const canvasRef = useRef(null);
  const engine = useRef(null);
  const current = useRef(active);
  useEffect(() => {
    current.current = active;
    engine.current?.morph(active);
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current, context = canvas.getContext('2d');
    if (!context) return;
    const column = canvas.parentElement, section = column.parentElement;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false, visible = false, reduced = media.matches;
    let frame = 0, previous = 0, time = 0, progress = DURATION;
    let targets = [], particles = [], selected = current.current;
    let box = { ...ICONS[selected] }, fromBox = { ...box };
    let width = 0, height = 0, scale = 1, offsetX = 0, offsetY = 0;
    let mobile = window.innerWidth <= 640;
    const pointer = { x: 0, y: 0, present: false };

    function resize() {
      width = column.clientWidth + PAD * 2;
      height = Math.min(column.clientHeight, 620) + PAD;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      mobile = window.innerWidth <= 640;
      if (!mobile) {
        const intro = column.querySelector('.process-intro');
        scale = Math.min(1, column.clientWidth / 540, (intro.offsetTop - 30) / 560);
        offsetX = offsetY = 0;
      }
      draw(0);
    }

    function morph(index) {
      if (!particles.length || index === selected) return;
      fromBox = { ...box };
      selected = index;
      progress = reduced ? DURATION : 0;
      particles.forEach(p => { p.sx = p.x; p.sy = p.y; });
      if (reduced) draw(0);
      start();
    }

    function draw(delta) {
      if (!particles.length) return;
      // This clock never resets on scroll, hover, or morph changes.
      if (!reduced) time += delta;
      progress = Math.min(DURATION, progress + delta);
      const t = reduced ? 1 : ease(progress / DURATION);
      const goal = ICONS[selected];
      for (const key of ['x', 'y', 'width', 'height']) box[key] = mix(fromBox[key], goal[key], t);
      const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
      if (mobile) {
        // Centre each existing silhouette within the same 130px mobile frame.
        scale = 130 / Math.max(box.width, box.height);
        offsetX = column.clientWidth / 2 - cx * scale;
        offsetY = 80 + 65 - cy * scale;
      }
      const drift = reduced ? 0 : Math.sin(time * 0.65) * 5 + Math.sin(time * 0.29) * 1.5;
      const pulse = reduced ? 1 : 1 + Math.sin(time * 1.25) * 0.014;
      const px = (pointer.x - offsetX) / scale, py = (pointer.y - offsetY) / scale;
      // Undo the idle transform so repulsion originates at the visible cursor.
      const cursorX = cx + (px - cx - drift) / pulse;
      const cursorY = cy + (py - cy) / pulse;
      const hover = !reduced && pointer.present && px > cx + drift - box.width * pulse / 2 - 12
        && px < cx + drift + box.width * pulse / 2 + 12
        && py > cy - box.height * pulse / 2 - 12 && py < cy + box.height * pulse / 2 + 12;
      const follow = 1 - Math.exp(-delta * (hover ? 9 : 6));
      context.clearRect(0, 0, width, height);
      context.save();
      context.translate(PAD + offsetX, PAD + offsetY);
      context.scale(scale, scale);
      context.fillStyle = '#3B001B';
      context.shadowColor = 'rgba(59, 0, 27, 0.65)';
      context.shadowBlur = 2;
      context.beginPath();
      particles.forEach((p, i) => {
        const target = targets[selected][i];
        p.x = mix(p.sx, target.x, t);
        p.y = mix(p.sy, target.y, t);
        let ox = 0, oy = 0;
        if (hover) {
          const dx = p.x - cursorX, dy = p.y - cursorY;
          const distance = Math.hypot(dx, dy);
          if (distance < 110) {
            const angle = distance > 0.001 ? Math.atan2(dy, dx) : p.seed * Math.PI * 2;
            const force = 55 * ease(1 - distance / 110) * (0.85 + p.seed * 0.15);
            ox = Math.cos(angle) * force;
            oy = Math.sin(angle) * force;
          }
        }
        p.ox = reduced ? 0 : mix(p.ox, ox, follow);
        p.oy = reduced ? 0 : mix(p.oy, oy, follow);
        const shimmer = reduced ? 0 : Math.sin(time * 1.4 + p.seed * 30) * 0.45;
        const x = cx + (p.x + p.ox - cx) * pulse + drift + shimmer;
        const y = cy + (p.y + p.oy - cy) * pulse + shimmer;
        // Keep the compact mobile version legible without packing its dots.
        if ((mobile || scale < 0.5) && i % 3 !== 0) return;
        const radius = (1 + p.seed * 0.3) / Math.max(0.45, scale);
        context.moveTo(x + radius, y);
        context.arc(x, y, radius, 0, Math.PI * 2);
      });
      context.fill();
      context.restore();
    }

    function tick(now) {
      frame = 0;
      if (disposed || !visible || document.hidden || reduced) { previous = 0; return; }
      const delta = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
      previous = now;
      draw(delta);
      frame = requestAnimationFrame(tick);
    }
    function start() {
      if (!disposed && particles.length && visible && !document.hidden && !reduced && !frame) frame = requestAnimationFrame(tick);
    }
    function pause() { cancelAnimationFrame(frame); frame = previous = 0; }
    function mode() {
      reduced = media.matches;
      if (reduced) { pause(); progress = DURATION; draw(0); }
      else start();
    }
    function pageVisibility() { if (document.hidden) pause(); else start(); }
    function move(event) {
      if (event.pointerType !== 'mouse') return;
      const rect = column.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.present = true;
    }
    function leave() { pointer.present = false; }
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start(); else { pause(); leave(); }
    });
    visibility.observe(column);
    const observer = new ResizeObserver(resize);
    observer.observe(column);
    section.addEventListener('pointermove', move, { passive: true, capture: true });
    section.addEventListener('pointerleave', leave, { passive: true });
    media.addEventListener('change', mode);
    document.addEventListener('visibilitychange', pageVisibility);

    Promise.all(ICONS.map(sampleIcon)).then(samples => {
      if (disposed) return;
      const count = Math.min(2154, ...samples.map(points => points.length));
      targets = samples.map(points => Array.from({ length: count }, (_, i) => points[Math.floor(i * points.length / count)]));
      selected = current.current;
      box = { ...ICONS[selected] }; fromBox = { ...box };
      particles = targets[selected].map((p, i) => ({ x: p.x, y: p.y, sx: p.x, sy: p.y, ox: 0, oy: 0, seed: ((i * 9301 + 49297) % 233280) / 233280 }));
      engine.current = { morph };
      resize();
      start();
    }).catch(error => {
      if (!disposed) console.error('Design Process particle shapes could not load:', error);
    });
    return () => {
      disposed = true;
      pause();
      engine.current = null;
      observer.disconnect(); visibility.disconnect();
      section.removeEventListener('pointermove', move, true);
      section.removeEventListener('pointerleave', leave);
      media.removeEventListener('change', mode);
      document.removeEventListener('visibilitychange', pageVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="process-particles" aria-hidden="true" />;
}
