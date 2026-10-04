import React from 'react';
import { createRoot } from 'react-dom/client';
import ScrollReveal from './ScrollReveal.jsx';
import './comparison.css';

const root = createRoot(document.getElementById('uiux-comparison'));
root.render(<ScrollReveal />);

const cleanup = event => { if (!event.persisted) root.unmount(); };
window.addEventListener('pagehide', cleanup);
if (import.meta.hot) import.meta.hot.dispose(() => {
  window.removeEventListener('pagehide', cleanup);
  root.unmount();
});
