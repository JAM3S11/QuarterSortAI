import React, { useState, useRef, useEffect } from 'react';
import { ScannedFile } from '../types';
import { MessageSquareText, User, Send, Loader2, Sparkles, Bot } from 'lucide-react';
import { buildRepoContext, answerQuestion, RepoContext } from '../lib/aiResponder';

interface AIChatPanelProps {
  files: ScannedFile[];
  totalFolders: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: 'groq' | 'offline';
}

const SUGGESTIONS = [
  'Which category has the most files?',
  'Which quarter is the busiest?',
  'Where are the duplicates and how much space do they waste?',
  'How is my repository organized?',
];

function nl2br(text: string): React.ReactNode[] {
  return text.split('\n').map((line, i, arr) => (
    <React.Fragment key={i}>
      {line}
      {i < arr.length - 1 && <br />}
    </React.Fragment>
  ));
}

let msgId = 0;
const nextId = () => `ai-msg-${++msgId}`;

export const AIChatPanel: React.FC<AIChatPanelProps> = ({ files, totalFolders }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: nextId(),
      role: 'assistant',
      content:
        'Hi! I\'m your repository assistant. Ask me anything about your scanned files — category and quarter distribution, duplicates, storage, or organization — and I\'ll give you feedback.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const contextRef = useRef<RepoContext | null>(null);
  if (!contextRef.current) {
    contextRef.current = buildRepoContext(files, totalFolders);
  }
  const context = contextRef.current;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isThinking]);

  const handleSend = async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || isThinking) return;

    const history = messages
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));

    const userMsg: ChatMessage = { id: nextId(), role: 'user', content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    const contextPayload = {
      totalFiles: context.totalFiles,
      totalFolders: context.totalFolders,
      quarterBreakdown: context.quarterBreakdown,
      categoryBreakdown: context.categoryBreakdown,
      duplicateSavingsMB: context.duplicateSavingsMB,
      duplicateFiles: context.duplicateFiles,
      topDirectories: context.topDirectories,
    };

    let reply: ChatMessage;
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context: contextPayload, history }),
      });
      if (!res.ok) throw new Error('Non-OK response');
      const data = await res.json();
      if (!data.success || !data.answer) throw new Error('Bad payload');
      reply = { id: nextId(), role: 'assistant', content: data.answer, source: data.source === 'groq' ? 'groq' : 'offline' };
    } catch {
      // Backend unreachable (e.g. Vercel static hosting) — answer client-side.
      await new Promise((r) => setTimeout(r, 650));
      reply = { id: nextId(), role: 'assistant', content: answerQuestion(question, context), source: 'offline' };
    }

    setMessages((prev) => [...prev, reply]);
    setIsThinking(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-[#fffdfc] rounded-2xl border border-[#d8ceca] overflow-hidden shadow-[0_10px_25px_rgba(84,43,43,0.06)] flex flex-col">
      {/* Header */}
      <div className="px-5 pt-4 pb-3.5 border-b border-[#f2edea]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 shrink-0 rounded-xl bg-[#542b2b]/10 text-[#542b2b] flex items-center justify-center">
              <MessageSquareText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-[#542b2b] leading-tight">Ask the AI</h3>
              <p className="text-[0.6875rem] text-[#705957] truncate">Questions & Feedback</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[0.625rem] font-bold px-2 py-1 rounded-full bg-[#542b2b]/10 text-[#542b2b] whitespace-nowrap shrink-0">
            <Sparkles className="w-3 h-3" />
            {files.length.toLocaleString()} files
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="px-4 py-4 space-y-4 max-h-[23.75rem] overflow-y-auto thin-scrollbar">
        {messages.map((m) => (
          <div key={m.id} className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 shrink-0 rounded-lg bg-[#542b2b]/10 text-[#542b2b] flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div
              className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-[#542b2b] text-[#faf9f7] rounded-br-md'
                  : 'bg-[#f2edea] text-[#542b2b] rounded-bl-md'
              }`}
            >
              {nl2br(m.content)}
              {m.role === 'assistant' && m.source === 'offline' && (
                <span className="block mt-1.5 text-[0.5625rem] font-bold uppercase tracking-wider text-[#705957]">
                  Offline assistant
                </span>
              )}
            </div>
            {m.role === 'user' && (
              <div className="w-7 h-7 shrink-0 rounded-lg bg-[#f2edea] text-[#542b2b] flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isThinking && (
          <div className="flex items-end gap-2 justify-start">
            <div className="w-7 h-7 shrink-0 rounded-lg bg-[#542b2b]/10 text-[#542b2b] flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-[#f2edea] flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#542b2b]" />
              <span className="text-xs text-[#705957]">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && !isThinking && (
        <div className="px-4 pb-3">
          <p className="text-[0.625rem] font-bold uppercase tracking-wider text-[#705957] mb-2">Try asking</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                className="px-3 py-1.5 rounded-lg border border-[#d8ceca] bg-[#faf9f7] text-[0.6875rem] text-[#542b2b] hover:border-[#542b2b]/40 hover:bg-[#f2edea] transition-colors text-left"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="mt-auto p-3 border-t border-[#f2edea] bg-[#fffdfc]">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask about your repository…"
            className="flex-1 resize-none bg-[#f2edea] border border-transparent focus:border-[#542b2b]/30 focus:bg-[#fffdfc] rounded-xl px-3 py-2.5 text-xs text-[#542b2b] placeholder:text-[#705957] outline-none transition-colors"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isThinking}
            className="w-9 h-9 shrink-0 rounded-xl bg-[#542b2b] hover:bg-[#6c3a3a] disabled:opacity-40 disabled:cursor-not-allowed text-[#faf9f7] flex items-center justify-center transition-colors"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-1.5 text-right text-[0.625rem] text-[#705957]">
          Enter ↵ to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  );
};
