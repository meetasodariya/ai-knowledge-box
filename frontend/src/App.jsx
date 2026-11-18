import React, { useState, useCallback, useId } from 'react';
import { useItems } from './hooks/useItems';
import { useQuery } from './hooks/useQuery';
import IngestForm from './components/IngestForm';
import ItemsList from './components/ItemsList';
import QueryInterface from './components/QueryInterface';
import AnswerDisplay from './components/AnswerDisplay';
import Toast from './components/Toast';

/** @typedef {{ id: string, message: string, type: 'success'|'error'|'info' }} ToastEntry */

export default function App() {
  const { items, total, loading: itemsLoading, error: itemsError, refresh } = useItems();
  const { answer, sources, loading: queryLoading, error: queryError, hasResult, submit, reset } = useQuery();

  /** @type {[ToastEntry[], React.Dispatch<React.SetStateAction<ToastEntry[]>>]} */
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleIngestSuccess = useCallback(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">AI Knowledge Inbox</h1>
            <p className="text-xs text-gray-500 mt-0.5">Personal knowledge base with semantic search and RAG</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Live
            </span>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col md:flex-row gap-6 h-full">

          {/* Left column – Ingest + Items */}
          <aside className="w-full md:w-2/5 flex flex-col gap-5">
            <IngestForm onSuccess={handleIngestSuccess} />
            <ItemsList
              items={items}
              total={total}
              loading={itemsLoading}
              error={itemsError}
              onRefresh={refresh}
            />
          </aside>

          {/* Right column – Query + Answer */}
          <section className="w-full md:w-3/5 flex flex-col gap-5">
            {/* Sticky query interface */}
            <div className="sticky top-20 z-[5]">
              <QueryInterface
                onSubmit={submit}
                loading={queryLoading}
                error={queryError}
              />
            </div>
            <AnswerDisplay
              answer={answer}
              sources={sources}
              hasResult={hasResult}
              loading={queryLoading}
            />
          </section>
        </div>
      </main>

      {/* Toast container */}
      <div
        className="fixed top-4 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast
              message={t.message}
              type={t.type}
              onClose={() => removeToast(t.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
