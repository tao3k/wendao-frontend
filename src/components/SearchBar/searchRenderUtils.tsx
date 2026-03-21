import React from 'react';
import { ArrowRight, BookOpen, FileText, Hash, Paperclip, Search, Zap } from 'lucide-react';

export function getDocIcon(docType?: string): React.ReactNode {
  switch (docType) {
    case 'skill':
      return <Zap size={14} className="search-result-icon skill" />;
    case 'knowledge':
      return <BookOpen size={14} className="search-result-icon knowledge" />;
    case 'symbol':
      return <Hash size={14} className="search-result-icon symbol" />;
    case 'ast':
      return <Search size={14} className="search-result-icon ast" />;
    case 'reference':
      return <ArrowRight size={14} className="search-result-icon reference" />;
    case 'attachment':
      return <Paperclip size={14} className="search-result-icon doc" />;
    default:
      return <FileText size={14} className="search-result-icon doc" />;
  }
}

export function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="search-highlight">
        {part}
      </mark>
    ) : (
      part
    )
  );
}
