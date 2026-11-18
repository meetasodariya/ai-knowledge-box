import React, { useEffect, useRef } from 'react';

/** @type {Record<string, string>} */
const TYPE_STYLES = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error:   'bg-red-50 border-red-200 text-red-800',
  info:    'bg-brand-50 border-brand-100 text-brand-700',
};

const TYPE_ICONS = {
  success: '✅',
  error:   '❌',
  info:    'ℹ️',
};

/**
 * Auto-dismissing toast notification.
 * @param {{ message: string, type?: 'success'|'error'|'info', onClose: () => void }} props
 */
export default function Toast({ message, type = 'info', onClose }) {
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(onClose, 4000);
    return () => clearTimeout(timerRef.current);
  }, [onClose]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        slide-in-right flex items-start gap-3 max-w-sm w-full px-4 py-3 rounded-xl
        border shadow-lg text-sm
        ${TYPE_STYLES[type] ?? TYPE_STYLES.info}
      `}
    >
      <span className="shrink-0 mt-0.5 text-base">{TYPE_ICONS[type]}</span>
      <p className="flex-1 leading-snug">{message}</p>
      <button
        onClick={onClose}
        aria-label="Dismiss notification"
        className="shrink-0 opacity-60 hover:opacity-100 ml-1 leading-none"
      >
        ✕
      </button>
    </div>
  );
}
