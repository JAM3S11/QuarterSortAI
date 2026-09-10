import React from 'react';
import { CommentItem } from './types';
import { MessageSquare, MessageSquareOff } from 'lucide-react';

interface CommentsPanelProps {
  comments: CommentItem[];
}

export const CommentsPanel: React.FC<CommentsPanelProps> = ({ comments }) => {
  if (comments.length === 0) {
    return (
      <div className="p-4 text-xs text-slate-400 text-center leading-relaxed">
        <MessageSquareOff className="w-6 h-6 mx-auto mb-2 text-slate-500" />
        No comments found in this document.
      </div>
    );
  }
  return (
    <div className="p-3 space-y-2 overflow-y-auto">
      <p className="px-1 py-1 text-[0.625rem] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
        <MessageSquare className="w-3.5 h-3.5" /> Comments ({comments.length})
      </p>
      {comments.map((c) => (
        <div key={c.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[0.6875rem] font-extrabold text-slate-800 dark:text-slate-100">{c.author}</span>
            {c.date && <span className="text-[0.5625rem] font-mono text-slate-400">{new Date(c.date).toLocaleDateString()}</span>}
          </div>
          <p className="text-[0.6875rem] text-slate-600 dark:text-slate-300 leading-relaxed">{c.text}</p>
        </div>
      ))}
    </div>
  );
};
