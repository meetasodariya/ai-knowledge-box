import React, { useState, useCallback } from 'react';
import { ingestContent } from '../api/client';
import LoadingSpinner from './LoadingSpinner';
import Toast from './Toast';

const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;

/**
 * Form to ingest a note or URL into the knowledge base.
 * @param {{ onSuccess: () => void }} props
 */
export default function IngestForm({ onSuccess }) {
  const [tab, setTab] = useState('note');
  const [noteValue, setNoteValue] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const urlValid = urlValue.length > 0 && URL_REGEX.test(urlValue);
  const urlInvalid = urlValue.length > 0 && !URL_REGEX.test(urlValue);

  const dismiss = useCallback(() => setToast(null), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const type = tab;
    const content = type === 'note' ? noteValue.trim() : urlValue.trim();
    if (!content) return;

    setLoading(true);
    try {
      const result = await ingestContent(type, content);
      const chunks = result?.chunkCount ?? result?.chunks ?? result?.data?.chunkCount ?? '?';
      setToast({ message: `Content saved successfully! ${chunks} chunks created.`, type: 'success' });
      setNoteValue('');
      setUrlValue('');
      onSuccess?.();
    } catch (err) {
      setToast({ message: err.message || 'Failed to save content.', type: 'error' });
      // Always refresh list — item may have been partially saved or list may have changed
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  };

  const noteCount = noteValue.length;
  const NOTE_MAX = 50000;

  return (
    <div className="card p-5">
      {/* Toast */}
      {toast && (
        <div className="mb-4">
          <Toast message={toast.message} type={toast.type} onClose={dismiss} />
        </div>
      )}

      <h2 className="text-base font-semibold text-gray-900 mb-4">Add Knowledge</h2>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-4" role="tablist">
        {[
          { id: 'note', label: 'Note' },
          { id: 'url',  label: 'URL'  },
        ].map(({ id, label }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${
              tab === id
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {tab === 'note' ? (
          <div className="mb-4">
            <label htmlFor="note-input" className="sr-only">Note content</label>
            <textarea
              id="note-input"
              rows={5}
              maxLength={NOTE_MAX}
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              placeholder="Paste your note or knowledge here..."
              className="input-field resize-y min-h-[120px]"
              aria-label="Note content"
            />
            <div className={`mt-1 text-xs text-right ${noteCount > NOTE_MAX * 0.9 ? 'text-amber-500' : 'text-gray-400'}`}>
              {noteCount.toLocaleString()} / {NOTE_MAX.toLocaleString()}
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <label htmlFor="url-input" className="sr-only">URL</label>
            <div className="relative">
              <input
                id="url-input"
                type="url"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="https://example.com/article"
                className={`input-field pr-9 ${urlValid ? 'border-emerald-400 focus:ring-emerald-500/20 focus:border-emerald-500' : ''} ${urlInvalid ? 'border-red-400 focus:ring-red-500/20 focus:border-red-500' : ''}`}
                aria-label="URL to ingest"
                aria-describedby="url-status"
              />
              {urlValid && (
                <span id="url-status" aria-label="Valid URL" className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">✓</span>
              )}
              {urlInvalid && (
                <span id="url-status" aria-label="Invalid URL" className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">✗</span>
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (tab === 'note' ? !noteValue.trim() : !urlValid)}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <LoadingSpinner size="sm" color="text-white" />
              <span>Saving…</span>
            </>
          ) : (
            <span>Save Content</span>
          )}
        </button>
      </form>
    </div>
  );
}
