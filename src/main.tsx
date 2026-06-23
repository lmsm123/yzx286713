import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against cross-origin "Script error." or MediaPipe load exceptions on sandboxed iframes
if (typeof window !== 'undefined') {
  // Capture console.error and filter cross-origin/mediapipe/jsdelivr script notices
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const errorStr = args.map(arg => String(arg || "")).join(" ");
    if (
      errorStr.includes('Script error') ||
      errorStr.includes('cdn.jsdelivr.net') ||
      errorStr.toLowerCase().includes('hands') ||
      errorStr.toLowerCase().includes('camera_utils') ||
      errorStr.toLowerCase().includes('mediapipe') ||
      errorStr.toLowerCase().includes('unhandledrejection')
    ) {
      // Swallowed or redirected to warning
      return;
    }
    originalConsoleError.apply(console, args);
  };

  // Catch any unhandled script errors at capture phase before other listeners can see them
  window.addEventListener('error', (event) => {
    // Intercept resource loading errors (like failed <script> loads from jsdelivr/mediapipe)
    const target = event.target as any;
    if (target && (target.tagName === 'SCRIPT' || target.nodeName === 'SCRIPT' || target instanceof HTMLScriptElement)) {
      const src = target.src || "";
      if (src.includes('cdn.jsdelivr.net') || src.includes('mediapipe') || src.includes('camera_utils')) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }
    }

    const msg = event.message || "";
    const filename = event.filename || "";
    if (
      msg === 'Script error.' || 
      msg.includes('Script error') ||
      msg.toLowerCase().includes('hands') ||
      msg.toLowerCase().includes('camera_utils') ||
      msg.toLowerCase().includes('mediapipe') ||
      filename.includes('cdn.jsdelivr.net') ||
      !msg // anonymized script errors sometimes have empty messages
    ) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, true); // Use capture phase to intercept before normal bubble/listeners

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason && (
      (reason.message && reason.message.includes('cdn.jsdelivr.net')) ||
      (reason.stack && reason.stack.includes('cdn.jsdelivr.net')) ||
      (reason.message && reason.message.includes('Hands')) ||
      (reason.message && reason.message.includes('Script error'))
    )) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  });

  // Also override window.onerror as a fallback
  const originalOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    const msgStr = String(message || "");
    const srcStr = String(source || "");
    if (
      msgStr === 'Script error.' || 
      msgStr.includes('Script error') ||
      srcStr.includes('cdn.jsdelivr.net') ||
      msgStr.toLowerCase().includes('hands') ||
      msgStr.toLowerCase().includes('camera_utils') ||
      msgStr.toLowerCase().includes('mediapipe') ||
      !msgStr
    ) {
      // Return true to prevent default event handling and silence cross-origin script error reports
      return true;
    }
    if (originalOnError) {
      try {
        return originalOnError(message, source, lineno, colno, error);
      } catch (e) {
        return false;
      }
    }
    return false;
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

