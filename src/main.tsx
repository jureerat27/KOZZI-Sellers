import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AppNotifier } from './components/AppNotifier';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <AppNotifier />
  </StrictMode>,
);
