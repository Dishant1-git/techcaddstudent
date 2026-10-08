import React, { useState } from 'react';
import { Sparkles, MessageSquare, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { AssistantPanel } from './AssistantPanel';
import { MessagesPanel } from './MessagesPanel';

// Floating launcher on the bottom-right of every portal page: one button for
// the Techcadd AI assistant and one for admin messages, each opening a chat box.
export function ChatDock() {
  const { role } = useAuth();
  const { unreadMessages } = useNotifications();
  const [active, setActive] = useState(null); // 'assistant' | 'messages' | null
  // The assistant stays mounted once opened so an answer in progress survives closing the box
  const [assistantOpened, setAssistantOpened] = useState(false);

  const toggle = (panel) => {
    if (panel === 'assistant') setAssistantOpened(true);
    setActive(current => (current === panel ? null : panel));
  };

  const messagesLabel = role === 'admin' ? 'Messages' : 'Message Admin';

  return (
    <>
      <div
        className={`fixed z-40 right-4 bottom-20 w-[24rem] max-w-[calc(100vw-2rem)] h-[36rem] max-h-[calc(100vh-6.5rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex-col overflow-hidden ${
          active ? 'flex' : 'hidden'
        }`}
      >
        <div className="h-12 px-4 flex items-center justify-between bg-indigo-600 text-white flex-shrink-0">
          <div className="flex items-center gap-2 font-bold text-sm">
            {active === 'messages' ? <MessageSquare className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {active === 'messages' ? messagesLabel : 'Techcadd AI'}
          </div>
          <button
            onClick={() => setActive(null)}
            className="p-1.5 rounded-lg hover:bg-white/15"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0">
          {assistantOpened && (
            <div className={active === 'assistant' ? 'h-full' : 'hidden'}>
              <AssistantPanel />
            </div>
          )}
          {/* Mounted only while visible: opening a thread marks it as read */}
          {active === 'messages' && <MessagesPanel />}
        </div>
      </div>

      <div className="fixed z-40 right-4 bottom-4 flex items-center gap-3">
        <button
          onClick={() => toggle('messages')}
          title={messagesLabel}
          className={`relative w-12 h-12 rounded-full flex items-center justify-center shadow-lg border transition-colors ${
            active === 'messages'
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'bg-white border-slate-200 text-indigo-600 hover:bg-indigo-50'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          {unreadMessages > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[1.25rem] px-1 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-500 text-white text-center">
              {unreadMessages}
            </span>
          )}
        </button>

        <button
          onClick={() => toggle('assistant')}
          title="Ask Techcadd AI"
          className={`h-12 px-4 rounded-full flex items-center gap-2 shadow-lg shadow-indigo-600/30 font-bold text-sm transition-colors ${
            active === 'assistant'
              ? 'bg-indigo-800 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          Ask AI
        </button>
      </div>
    </>
  );
}
