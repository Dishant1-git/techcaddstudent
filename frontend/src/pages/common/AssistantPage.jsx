import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, ExternalLink, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const MAX_QUESTION_LENGTH = 1000;
// Earlier turns sent with each question so follow-ups make sense
const HISTORY_TURNS = 4;

const SUGGESTIONS = [
  'What new courses have been added?',
  'Who are the trainers and their domains?',
  'Career path and future after a Python course?',
  "What's new in the tech world?"
];

function loadConversation(storageKey) {
  try {
    return JSON.parse(sessionStorage.getItem(storageKey)) || [];
  } catch (err) {
    return [];
  }
}

export function AssistantPage() {
  const { user } = useAuth();
  const storageKey = `assistant_chat_${user?.id}`;

  const [messages, setMessages] = useState(() => loadConversation(storageKey));
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const listRef = useRef(null);

  // The conversation only lives in this browser tab; the server keeps nothing
  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length, thinking]);

  const ask = async (text) => {
    const question = text.trim();
    if (!question || thinking) return;

    const history = messages
      .filter(m => !m.error)
      .slice(-HISTORY_TURNS)
      .map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setDraft('');
    setThinking(true);
    try {
      const res = await api.askAssistant(question, history);
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.answer, sources: res.data.sources || [] }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: err.message || 'The assistant could not answer right now. Please try again.',
        error: true
      }]);
    } finally {
      setThinking(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    ask(draft);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) handleSubmit(e);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Sparkles className="w-7 h-7 text-indigo-600" />
            Techcadd AI
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ask about Techcadd, new courses, trainers, career paths and what's new in tech.
          </p>
        </div>

        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            disabled={thinking}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            New chat
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-13rem)] min-h-[420px]">
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/60">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="p-3 rounded-2xl bg-indigo-600 text-white mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-800">Hi {user?.name?.split(' ')[0]}, what would you like to know?</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                I answer from the Techcadd website, this portal and current tech news. I can't help with other topics.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-xl">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => ask(suggestion)}
                    className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, index) => {
              const isMine = m.role === 'user';
              return (
                <div key={index} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[85%] sm:max-w-[75%]">
                    <div
                      className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isMine
                          ? 'bg-indigo-600 text-white rounded-br-md'
                          : m.error
                          ? 'bg-rose-50 text-rose-800 border border-rose-200 rounded-bl-md'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
                      }`}
                    >
                      {m.content}
                    </div>
                    {m.sources?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {m.sources.map((source) => (
                          <a
                            key={source.url}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                          >
                            <span className="truncate">{source.title}</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {thinking && (
            <div className="flex justify-start">
              <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-white border border-slate-200 flex items-center gap-1">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-3 border-t border-slate-100 flex items-end gap-2 flex-shrink-0">
          <textarea
            rows="1"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={MAX_QUESTION_LENGTH}
            placeholder="Ask about courses, trainers, careers or tech news..."
            className="flex-1 resize-none max-h-32 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={thinking || !draft.trim()}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
}
