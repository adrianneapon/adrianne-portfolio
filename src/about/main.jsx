import React, { Component, Suspense, lazy, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import AboutContent from './AboutContent.jsx';
import DesignProcess from './DesignProcess.jsx';
import AboutCursorHelper from './AboutCursorHelper.jsx';
import './lanyard.css';

const Lanyard = lazy(() => import('./Lanyard.jsx'));
const mount = document.getElementById('about-lanyard');
const experience = document.getElementById('about-experience');
const process = document.getElementById('design-process');
const DROP_THRESHOLD = 0.5;

function useMedia(query) {
  const [matches, setMatches] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const media = matchMedia(query);
    const change = () => setMatches(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, [query]);
  return matches;
}

class SceneBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { console.error('About lanyard failed:', error); }
  render() {
    if (this.state.error) return <p role="alert" className="lanyard-error">The interactive ID could not load. Please reload the page.</p>;
    return this.props.children;
  }
}

function AboutLanyard() {
  const [entered, setEntered] = useState(false);
  const [backgroundVisible, setBackgroundVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(!document.hidden);
  const reduced = useMedia('(prefers-reduced-motion: reduce)');
  const mobile = useMedia('(max-width: 640px)');
  const contentMobile = useMedia('(max-width: 1289px)');
  useEffect(() => {
    let visibility;
    const observe = () => {
      visibility?.disconnect();
      // Mobile can now exceed one screen: retain the original half-screen
      // entrance point rather than requiring half of all its flowing content.
      const threshold = DROP_THRESHOLD * (mobile ? Math.min(1, innerHeight / mount.clientHeight) : 1);
      visibility = new IntersectionObserver(([entry]) => {
        if (entry.intersectionRatio >= threshold) setEntered(true);
      }, { threshold: [0, threshold] });
      visibility.observe(mount);
    };
    const pageChange = () => setPageVisible(!document.hidden);
    observe();
    const resize = mobile ? new ResizeObserver(observe) : null;
    resize?.observe(mount);
    if (mobile) window.addEventListener('resize', observe);
    const backgroundVisibility = new IntersectionObserver(([entry]) => setBackgroundVisible(entry.isIntersecting));
    backgroundVisibility.observe(experience);
    document.addEventListener('visibilitychange', pageChange);
    return () => {
      visibility.disconnect();
      resize?.disconnect();
      if (mobile) window.removeEventListener('resize', observe);
      backgroundVisibility.disconnect();
      document.removeEventListener('visibilitychange', pageChange);
    };
  }, [mobile]);
  return <>
    <AboutCursorHelper section={mount.parentElement} interactionContainer={experience} />
    <AboutContent container={mount.parentElement} mobile={contentMobile} reduced={reduced} />
    <DesignProcess container={process} />
    <SceneBoundary><Suspense fallback={null}>
    <Lanyard entered={entered} active={backgroundVisible && pageVisible} reduced={reduced} mobile={mobile}
      reference={mount} container={experience} />
    </Suspense></SceneBoundary>
  </>;
}

const root = createRoot(mount);
root.render(<AboutLanyard />);
const cleanup = event => { if (!event.persisted) root.unmount(); };
window.addEventListener('pagehide', cleanup);
if (import.meta.hot) import.meta.hot.dispose(() => {
  window.removeEventListener('pagehide', cleanup);
  root.unmount();
});
