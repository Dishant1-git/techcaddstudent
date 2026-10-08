import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, ExternalLink, RotateCcw, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { QUESTION_GROUPS } from './assistantQuestions';

const MAX_QUESTION_LENGTH = 1000;
// Earlier turns sent with each question so follow-ups make sense
const HISTORY_TURNS = 4;

function loadConversation(storageKey) {
  try {
    return JSON.parse(sessionStorage.getItem(storageKey)) || [];
  } catch (err) {
    return [];
  }
}

// Techcadd AI chat, sized to fill the chat dock
export function AssistantPanel() {
  const { user } = useAuth();
  const storageKey = `assistant_chat_${user?.id}`;

  const [messages, setMessages] = useState(() => loadConversation(storageKey));
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  // Topic whose ready-made questions are listed; open by default on a fresh chat
  const [openGroupId, setOpenGroupId] = useState(() => (loadConversation(storageKey).length ? null : QUESTION_GROUPS[0].id));
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
    setOpenGroupId(null);
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

  const startNewChat = () => {
    setMessages([]);
    setOpenGroupId(QUESTION_GROUPS[0].id);
  };

  const openGroup = QUESTION_GROUPS.find(group => group.id === openGroupId);

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* Ready-made questions by topic */}
      <div className="border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2 px-3 pt-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex-1">Ask about</span>
          {messages.length > 0 && (
            <button
              onClick={startNewChat}
              disabled={thinking}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-indigo-600 disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3" />
              New chat
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 px-3 py-2">
          {QUESTION_GROUPS.map((group) => {
            const isOpen = group.id === openGroupId;
            return (
              <button
                key={group.id}
                onClick={() => setOpenGroupId(isOpen ? null : group.id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                  isOpen
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-700'
                }`}
              >
                {group.label}
                <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
            );
          })}
        </div>

        {openGroup && (
          <div className="max-h-44 overflow-y-auto px-3 pb-2.5 space-y-1">
            {openGroup.questions.map((question) => (
              <button
                key={question}
                onClick={() => ask(question)}
                disabled={thinking}
                className="w-full text-left px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 text-xs text-slate-700 hover:text-indigo-800 transition-colors disabled:opacity-50"
              >
                {question}
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 bg-slate-50/60">
        {messages.length === 0 && (
          <div className="py-6 text-center px-4">
            <Sparkles className="w-8 h-8 text-indigo-300 mx-auto mb-2" />
            <h4 className="font-bold text-sm text-slate-800">Hi {user?.name?.split(' ')[0]}, what would you like to know?</h4>
            <p className="text-xs text-slate-500 mt-1">
              Pick a question above or type your own. I only answer about Techcadd, its courses and trainers, careers and tech news.
            </p>
          </div>
        )}

        {messages.map((m, index) => {
          const isMine = m.role === 'user';
          return (
            <div key={index} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[88%]">
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
        })}

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
          placeholder="Type your question..."
          className="flex-1 resize-none max-h-32 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={thinking || !draft.trim()}
          title="Ask"
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
