import React from 'react';
import LoadingSpinner from './LoadingSpinner';

/** Skeleton card for loading state */
function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex gap-2 items-center">
        <div className="pulse-skeleton h-5 w-14 rounded-full" />
        <div className="pulse-skeleton h-5 w-5 rounded-full ml-auto" />
      </div>
      <div className="pulse-skeleton h-4 w-full" />
      <div className="pulse-skeleton h-4 w-3/4" />
      <div className="pulse-skeleton h-3 w-24 mt-2" />
    </div>
  );
}

/** Format a date string to "Nov 17, 2026 at 9:45 PM" */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).replace(',', ',').replace(' at ', ' at ');
}

/** Source type badge */
function SourceBadge({ type }) {
  if (type === 'url') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
        URL
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
      Note
    </span>
  );
}

/**
 * Knowledge base items list.
 * @param {{ items: Array, total: number, loading: boolean, error: string|null, onRefresh: () => void }} props
 */
export default function ItemsList({ items = [], total = 0, loading, error, onRefresh }) {
  return (
    <div className="card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-900">Knowledge Base</h2>
          {total > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-600 border border-brand-100">
              {total}
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh knowledge base"
          className="p-1.5 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 disabled:opacity-40"
          title="Refresh"
        >
          {loading ? <LoadingSpinner size="sm" /> : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[520px]">
        {/* Loading skeletons */}
        {loading && items.length === 0 && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex flex-col items-center py-8 text-center">
            <span className="text-3xl mb-2">⚠️</span>
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button onClick={onRefresh} className="btn-secondary text-sm">Try again</button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center py-10 text-center">
            <span className="text-5xl mb-3">🗄️</span>
            <p className="font-medium text-gray-700 mb-1">Your knowledge base is empty</p>
            <p className="text-sm text-gray-400 max-w-xs">
              Add a note or URL using the form above to get started. Your AI will learn from everything you save.
            </p>
          </div>
        )}

        {/* Items */}
        {items.map((item) => (
          <article
            key={item.id}
            className="card p-4 hover:shadow-md hover:-translate-y-0.5 cursor-default"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <SourceBadge type={item.source_type ?? item.sourceType} />
              <span className="text-xs text-gray-400 shrink-0">
                {item.chunk_count ?? item.chunkCount ?? 0} chunks
              </span>
            </div>

            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">
              {item.title || 'Untitled'}
            </h3>

            {(item.source_url ?? item.sourceUrl) && (
              <a
                href={item.source_url ?? item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-500 hover:underline truncate block mb-1 max-w-full"
                title={item.source_url ?? item.sourceUrl}
              >
                {item.source_url ?? item.sourceUrl}
              </a>
            )}

            <p className="text-xs text-gray-400 mt-2">
              {formatDate(item.created_at ?? item.createdAt)}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
