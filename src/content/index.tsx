import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import '@/styles/globals.css';

function mount() {
  const existing = document.getElementById('ts-root');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'ts-root';
  document.body.appendChild(container);

  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

mount();
