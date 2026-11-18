import React, { useState } from 'react';

/** Pulsing skeleton for loading state */
function AnswerSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-gray-200 shrink-0" />
        <div className="h-4 bg-gray-200 rounded w-24" />
      </div>
      <div className="space-y-2 pl-12">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-4/6" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>
      <div className="pl-12 space-y-2 mt-4">
        <div className="h-3 bg-gray-100 rounded w-16" />
        <div className="h-16 bg-gray-100 rounded w-full" />
        <div className="h-16 bg-gray-100 rounded w-full" />
      </div>
    </div>
  );
}

/** Source card with snippet expand/collapse */
function SourceCard({ source }) {
  const [expanded, setExpanded] = useState(false);
  const snippet = source.snippet ?? source.content ?? '';
  const isLong = snippet.length > 180;
  const displaySnippet = isLong && !expanded ? snippet.slice(0, 180) + '…' : snippet;
  const type = source.sourceType ?? source.source_type ?? 'note';
  const url = source.sourceUrl ?? source.source_url;

  return (
    <div className="card p-3 text-sm">
      <div className="flex items-start gap-2 mb-1.5">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0
          ${type === 'url' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-purple-50 text-purple-700 border border-purple-100'}`}>
          {type === 'url' ? 'URL' : 'Note'}
        </span>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand-500 hover:underline truncate"
            title={url}
          >
            {url}
          </a>
        )}
      </div>

      {source.title && (
        <p className="font-medium text-gray-800 mb-1 line-clamp-1">{source.title}</p>
      )}

      {snippet && (
        <div>
          <p className="text-gray-600 leading-relaxed text-xs">{displaySnippet}</p>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-xs text-brand-500 hover:text-brand-600 font-medium"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Displays the AI answer and its sources.
 * @param {{ answer: string, sources: Array, hasResult: boolean, loading: boolean }} props
 */
export default function AnswerDisplay({ answer, sources = [], hasResult, loading }) {
  if (loading) {
    return (
      <div className="card p-5">
        <AnswerSkeleton />
      </div>
    );
  }

  if (!hasResult) {
    return (
      <div className="card p-10 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mb-3 text-brand-600 font-semibold text-xl">
          ?
        </div>
        <p className="font-medium text-gray-700 mb-1">No question asked yet</p>
        <p className="text-sm text-gray-400 max-w-xs">
          Enter a question to search and synthesize answers from your knowledge base.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5 fade-in space-y-5">
      {/* Answer */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-500 inline-block"></span>
          <span className="text-sm font-semibold text-gray-800">Generated Answer</span>
        </div>
        <div>
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
            <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{answer}</p>
          </div>
        </div>
      </div>

      {/* Sources */}
      {sources.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Sources</h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              {sources.length}
            </span>
          </div>
          <div className="space-y-2">
            {sources.map((src, i) => (
              <SourceCard key={src.id ?? i} source={src} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
