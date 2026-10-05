import './header-menu.css';
import { setDesktopScrollPosition } from './desktop-smooth-scroll.js';

export function installHeaderMenu(header, beginNavigation, finishNavigation) {
  const events = new AbortController();
  const listen = (node, type, callback, options = {}) => node.addEventListener(type, callback, { ...options, signal: events.signal });
  const navigation = document.createElement('nav');
  navigation.className = 'compact-navigation';
  navigation.setAttribute('aria-label', 'Main navigation');
  navigation.innerHTML = `
    <button class="compact-menu-button" type="button" aria-label="Open navigation" aria-expanded="false" aria-controls="compact-menu-panel"></button>
    <div class="compact-menu-panel" id="compact-menu-panel" hidden>
      <a href="/#about">About</a>
      <a href="/#design-process">Process</a>
      <a href="/#projects">Projects</a>
      <a href="/projects/">Case Studies</a>
      <a class="compact-menu-contact" href="mailto:hello@adrianne.design">Contact</a>
    </div>`;
  header.append(navigation);
  const button = navigation.querySelector('button');
  const panel = navigation.querySelector('.compact-menu-panel');
  let arrivalPending = document.documentElement.hasAttribute('data-menu-arrival');
  const caseStudiesArrival = document.documentElement.getAttribute('data-menu-arrival') === 'case-studies';
  let frame = 0;
  const setOpen = open => {
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    header.classList.toggle('header-menu-open', open);
  };
  const close = () => setOpen(false);
  const jump = (url, keepHeaderVisible = false) => {
    const target = url.hash ? document.getElementById(url.hash.slice(1)) : null;
    if (url.hash && !target) return;
    const scroller = getComputedStyle(document.body).overflowY === 'auto' ? document.body : document.scrollingElement;
    // The Projects stage is sticky on desktop; its existing runway gives the
    // section's flow origin even when navigating back from below the pinned stage.
    const flowTarget = target?.id === 'projects' ? document.getElementById('projects-runway') : target;
    const offset = target ? parseFloat(getComputedStyle(target).scrollMarginTop) || 0 : 0;
    const top = flowTarget ? Math.max(0, scroller.scrollTop + flowTarget.getBoundingClientRect().top - offset) : 0;
    beginNavigation(keepHeaderVisible);
    if (!setDesktopScrollPosition(top)) scroller.scrollTo({ top, behavior: 'instant' });
    // Let existing scroll listeners observe the jump before dropping the no-flash class.
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => { frame = requestAnimationFrame(finishNavigation); });
  };
  listen(button, 'click', () => setOpen(panel.hidden));
  listen(document, 'pointerdown', event => { if (!navigation.contains(event.target)) close(); });
  listen(document, 'keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) {
      close();
      button.focus({ preventScroll: true });
    }
  });
  listen(navigation, 'click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    close();
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.protocol === 'mailto:') return;
    event.preventDefault();
    link.blur();
    arrivalPending = false;
    const url = new URL(link.href);
    const caseStudies = link === panel.querySelector('a[href="/projects/"]');
    if (url.pathname === location.pathname) {
      if (location.href !== url.href) history.pushState(null, '', url);
      jump(url, caseStudies);
    } else {
      // A single-use destination marker; consumed in <head> before the next header paints.
      try {
        sessionStorage.setItem('portfolio-menu-arrival', JSON.stringify({ destination: url.pathname + url.search + url.hash, expires: Date.now() + 30000, kind: caseStudies ? 'case-studies' : 'anchor' }));
      } catch { /* Restricted storage must not block navigation. */ }
      beginNavigation(caseStudies);
      location.assign(url.href);
    }
  });
  listen(header, 'header-hidden', close);
  listen(header, 'menu-navigation-interrupted', () => { arrivalPending = false; });
  listen(window, 'pagehide', close);
  listen(window, 'popstate', close);
  listen(window, 'pageshow', event => { if (event.persisted) finishNavigation(); });
  if (arrivalPending) {
    const loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise(resolve => listen(window, 'load', resolve, { once: true }));
    Promise.all([loaded, document.fonts.ready]).then(() => {
      if (events.signal.aborted || !arrivalPending) return;
      frame = requestAnimationFrame(() => {
        if (!arrivalPending) return;
        arrivalPending = false;
        document.documentElement.removeAttribute('data-menu-arrival');
        jump(new URL(location.href), caseStudiesArrival);
      });
    });
  }
  return () => { events.abort(); cancelAnimationFrame(frame); navigation.remove(); header.classList.remove('header-menu-open'); };
}
