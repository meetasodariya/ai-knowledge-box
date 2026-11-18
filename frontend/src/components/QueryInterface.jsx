import React, { useState, useRef, useCallback } from 'react';
import LoadingSpinner from './LoadingSpinner';

const MAX_CHARS = 500;

/**
 * Query input interface.
 * @param {{ onSubmit: (q: string) => void, loading: boolean, error: string|null }} props
 */
export default function QueryInterface({ onSubmit, loading, error }) {
  const [question, setQuestion] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = useCallback(() => {
    const q = question.trim();
    if (!q || loading) return;
    onSubmit(q);
  }, [question, loading, onSubmit]);

  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const remaining = MAX_CHARS - question.length;

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-base font-semibold text-gray-900">Ask Your Knowledge Base</h2>
      </div>

      <div className="relative">
        <label htmlFor="query-input" className="sr-only">Question</label>
        <textarea
          id="query-input"
          ref={textareaRef}
          rows={3}
          maxLength={MAX_CHARS}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your saved content..."
          className="input-field resize-none pr-4"
          aria-label="Question"
          aria-describedby="query-hint"
          disabled={loading}
        />
      </div>

      <div className="flex items-center justify-between mt-2 mb-3">
        <p id="query-hint" className="text-xs text-gray-400">
          Press <kbd className="px-1 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-500 font-mono text-xs">Ctrl</kbd>
          {' + '}
          <kbd className="px-1 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-500 font-mono text-xs">Enter</kbd>
          {' to submit'}
        </p>
        <span className={`text-xs ${remaining < 50 ? 'text-amber-500' : 'text-gray-400'}`}>
          {remaining} left
        </span>
      </div>

      {error && (
        <div role="alert" className="mb-3 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm flex items-start gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!question.trim() || loading}
        className="btn-primary w-full flex items-center justify-center gap-2"
        aria-label="Submit question"
      >
        {loading ? (
          <>
            <LoadingSpinner size="sm" color="text-white" />
            <span>Searching...</span>
          </>
        ) : (
          <span>Search & Synthesize</span>
        )}
      </button>
    </div>
  );
}
