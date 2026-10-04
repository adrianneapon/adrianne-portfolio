import './home-video-text.css';

export function installFooterText(footer, viewport) {
  const overlay = footer.querySelector('.home-video-text');
  const heading = overlay.querySelector('.home-video-title');
  const identity = overlay.querySelector('.home-video-identity');
  const contacts = identity.querySelector('.home-video-contact-links');
  const now = heading.querySelector('.home-video-now');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const measure = () => heading.style.setProperty('--home-video-now-width', `${now.getBoundingClientRect().width}px`);
  const sizes = new ResizeObserver(measure);
  sizes.observe(now);
  measure();

  // Reference entrance: upward heading fade with a settling overshoot;
  // name and role fade in together from the right, slightly after the heading.
  const entrance = heading.animate([
    { opacity: 0, transform: 'translateY(80px)', easing: 'cubic-bezier(.25,.46,.45,.94)' },
    { offset: .5, opacity: 1, transform: 'translateY(-40px)', easing: 'cubic-bezier(.37,0,.63,1)' },
    { opacity: 1, transform: 'translateY(0)' },
  ], { duration: reduced.matches ? 1 : 800, fill: 'both' });
  const identityEntrance = identity.animate([
    { opacity: 0, transform: 'translateX(120px)' },
    { opacity: 1, transform: 'translateX(0)' },
  ], {
    duration: reduced.matches ? 1 : 700,
    delay: reduced.matches ? 0 : 100,
    easing: 'cubic-bezier(.16,1,.3,1)',
    fill: 'both',
  });
  const animations = [entrance, identityEntrance];
  animations.forEach(animation => { animation.pause(); animation.currentTime = 0; });
  let entered = false;
  let generation = 0;
  let timer = null;

  function sync() {
    // First entry is footer.top === viewport height. Thus 560vh from entry
    // equals 460vh after the sticky viewport becomes fully visible.
    const journey = window.innerHeight - footer.getBoundingClientRect().top;
    const beyond = journey >= viewport.offsetHeight * 5.6;
    if (beyond === entered) return;
    entered = beyond;
    const visit = ++generation;
    clearTimeout(timer);
    overlay.setAttribute('aria-hidden', String(!entered));
    contacts.inert = !entered;
    heading.classList.remove('is-complete');
    heading.setAttribute('aria-label', 'WHAT SHOULD WE DESIGN NEXT?');
    animations.forEach(animation => {
      animation.updatePlaybackRate(entered ? 1 : -1);
      animation.play();
    });
    if (!entered) return;
    entrance.finished.then(() => {
      if (!entered || visit !== generation) return;
      timer = setTimeout(() => {
        if (!entered || visit !== generation) return;
        heading.classList.add('is-complete');
        heading.setAttribute('aria-label', 'WHAT SHOULD WE DESIGN NOW?');
      }, 1000);
    }).catch(() => {}); // Disposal cancels the animation and its finished promise.
  }

  return {
    sync,
    dispose() {
      entered = false;
      generation++;
      clearTimeout(timer);
      sizes.disconnect();
      animations.forEach(animation => animation.cancel());
    },
  };
}
