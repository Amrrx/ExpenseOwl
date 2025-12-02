import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Apply saved theme on initial load
const savedTheme = localStorage.getItem('theme') || 'system';
const root = document.documentElement;

if (savedTheme === 'dark') {
  root.classList.add('dark');
} else if (savedTheme === 'light') {
  root.classList.remove('dark');
} else {
  // System
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    root.classList.add('dark');
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
