import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Return a no-op if used outside provider (during initial render)
    return () => {};
  }
  return context;
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef(null);

  const showToast = useCallback((message, type = 'info', action = null) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setExiting(false);
    setToast({ message, type, action });

    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => setToast(null), 300);
    }, 4000);
  }, []);

  const dismissToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setExiting(true);
    setTimeout(() => setToast(null), 300);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${exiting ? 'exit' : ''}`} onClick={dismissToast}>
            <span>{toast.message}</span>
            {toast.action && (
              <button onClick={(e) => { e.stopPropagation(); toast.action.onClick(); dismissToast(); }}>
                {toast.action.label}
              </button>
            )}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export default function Toast() {
  // This component is a placeholder rendered in Layout.
  // Actual toast rendering happens via ToastProvider.
  return null;
}
