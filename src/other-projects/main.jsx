import React from 'react';
import { createRoot } from 'react-dom/client';
import OtherProjects from './OtherProjects.jsx';
import './other-projects.css';

const root = createRoot(document.getElementById('other-projects'));
root.render(<OtherProjects />);

const cleanup = event => { if (!event.persisted) root.unmount(); };
window.addEventListener('pagehide', cleanup);
if (import.meta.hot) import.meta.hot.dispose(() => {
  window.removeEventListener('pagehide', cleanup);
  root.unmount();
});
