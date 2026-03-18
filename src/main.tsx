import React from 'react';
import ReactDOM from 'react-dom/client';
import StudioBootstrap from './StudioBootstrap.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <StudioBootstrap />
  </React.StrictMode>,
);
