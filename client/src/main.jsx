import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './features/auth/auth.css';
import { installErrorReporter } from './utils/errorReporter';

// Install global frontend error reporter → sends JS runtime errors to Dev Logs
installErrorReporter();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
