import React from 'react';
import { createRoot } from 'react-dom/client';
import './projects.css';
import './projects-experience.css';
import ProjectsContent from './ProjectsContent.jsx';

const root = createRoot(document.getElementById('projects'));
root.render(<ProjectsContent />);

const cleanup = event => { if (!event.persisted) root.unmount(); };
window.addEventListener('pagehide', cleanup);
if (import.meta.hot) import.meta.hot.dispose(() => {
  window.removeEventListener('pagehide', cleanup);
  root.unmount();
});
