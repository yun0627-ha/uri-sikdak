import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './hooks/useAuth.jsx';
import { ToastProvider } from './components/ui.jsx';
import { configured } from './lib/supabase.js';
import './index.css';
import './lib/keyboard.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        {configured ? <AuthProvider><App /></AuthProvider> : <App />}
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
