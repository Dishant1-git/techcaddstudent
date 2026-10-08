import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Search, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useNotifications } from '../../context/NotificationContext';
import { api } from '../../services/api';
import { socket } from '../../services/socket';

// Messages arrive over the WebSocket; polling only runs while it is down
const FALLBACK_POLL_INTERVAL_MS = 15000;
const MAX_MESSAGE_LENGTH = 2000;

function formatTime(iso) {
  const date = new Date(iso);
  const isToday = date.toDateString() === new Date().toDateString();
  return date.toLocaleString([], isToday ? { timeStyle: 'short' } : { dateStyle: 'medium', timeStyle: 'short' });
}

function avatarFor(person) {
  return person?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(person?.name || 'User')}`;
}

// Admin <-> student/trainer chat, sized to fill the chat dock
export function MessagesPanel() {
  const { role } = useAuth();
  const toast = useToast();
  const { fetchNotifications } = useNotifications();
  const isAdmin = role === 'admin';

  // Admin only: inbox of every student/trainer thread
  const [conversations, setConversations] = useState([]);
  const [activeUserId, setActiveUserId] = useState(null);
  const [search, setSearch] = useState('');

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(!isAdmin);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const listRef = useRef(null);
  // Lets a slow response for a previously opened thread be discarded
  const activeUserIdRef = useRef(activeUserId);
  activeUserIdRef.current = activeUserId;
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  const sameId = (a, b) => String(a) === String(b);

  const loadConversations = async () => {
    try {
      const res = await api.getConversations();
      if (res.success) setConversations(res.data || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const loadThread = async () => {
    if (isAdmin && !activeUserId) return;
    try {
      const res = await api.getMessageThread(isAdmin ? activeUserId : undefined);
      if (!res.success) return;
      if (isAdmin && String(res.user.id) !== String(activeUserIdRef.current)) return;

      setMessages(res.data || []);
      if (res.markedRead > 0) {
        // The socket pushes the new unread total; without it, ask for it
        if (!socket.isReady()) fetchNotifications();
        setConversations(prev => prev.map(c => (
          String(c.user_id) === String(res.user.id) ? { ...c, unread_count: 0 } : c
        )));
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleIncomingMessage = (message) => {
    const inOpenThread = !isAdmin || sameId(message.thread_user_id, activeUserIdRef.current);
    const isMine = isAdmin ? message.sender_role === 'admin' : message.sender_role !== 'admin';

    if (isAdmin) {
      if (conversationsRef.current.some(c => sameId(c.user_id, message.thread_user_id))) {
        // Move the thread to the top with its new preview
        setConversations(prev => {
          const current = prev.find(c => sameId(c.user_id, message.thread_user_id));
          if (!current) return prev;
          const updated = {
            ...current,
            last_message: { body: message.body, sender_role: message.sender_role, created_at: message.created_at },
            unread_count: current.unread_count + (!isMine && !inOpenThread ? 1 : 0)
          };
          return [updated, ...prev.filter(c => c !== current)];
        });
      } else {
        loadConversations();
      }
    }

    if (!inOpenThread) return;
    if (isMine) {
      // Echo of a message sent from this or another tab (or by another admin)
      setMessages(prev => (prev.some(m => m.id === message.id) ? prev : [...prev, message]));
    } else {
      // Refetching also marks the new message as read
      loadThread();
    }
  };

  const refresh = () => {
    if (isAdmin) loadConversations();
    loadThread();
  };

  useEffect(() => {
    refresh();

    const unsubscribe = socket.subscribe((event) => {
      if (event.type === 'ready') {
        // (Re)connected: catch up on anything missed while offline
        refresh();
      } else if (event.type === 'message:new') {
        handleIncomingMessage(event.message);
      } else if (event.type === 'thread:read') {
        setConversations(prev => prev.map(c => (
          sameId(c.user_id, event.thread_user_id) ? { ...c, unread_count: 0 } : c
        )));
      }
    });

    const interval = setInterval(() => {
      if (!socket.isReady() && !document.hidden) refresh();
    }, FALLBACK_POLL_INTERVAL_MS);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [isAdmin, activeUserId]);

  // Keep the newest message in view
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length, activeUserId]);

  const openConversation = (userId) => {
    if (String(userId) === String(activeUserId)) return;
    setMessages([]);
    setDraft('');
    setLoading(true);
    setActiveUserId(userId);
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    try {
      const res = await api.sendMessage(body, isAdmin ? activeUserId : undefined);
      if (res.success) {
        // The socket echo may have added it already
        setMessages(prev => (prev.some(m => m.id === res.data.id) ? prev : [...prev, res.data]));
        setDraft('');
        if (isAdmin && !socket.isReady()) loadConversations();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) handleSend(e);
  };

  const activeConversation = conversations.find(c => String(c.user_id) === String(activeUserId));
  const query = search.trim().toLowerCase();
  const visibleConversations = query
    ? conversations.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        (c.student_code && c.student_code.toLowerCase().includes(query))
      )
    : conversations;

  const showThread = !isAdmin || !!activeUserId;

  return (
    <div className="flex h-full min-h-0 bg-white">
      {/* Conversation List (Admin only) */}
      {isAdmin && !activeUserId && (
        <div className="w-full flex flex-col min-h-0">
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students or trainers..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {visibleConversations.length > 0 ? (
              visibleConversations.map((c) => {
                const isActive = String(c.user_id) === String(activeUserId);
                return (
                  <button
                    key={c.user_id}
                    onClick={() => openConversation(c.user_id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 text-left border-b border-slate-50 transition-colors ${
                      isActive ? 'bg-indigo-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <img
                      src={avatarFor(c)}
                      alt={c.name}
                      className="w-9 h-9 rounded-xl bg-slate-100 object-cover flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-xs text-slate-900 truncate">{c.name}</p>
                        {c.last_message && (
                          <span className="text-[10px] text-slate-400 flex-shrink-0">
                            {formatTime(c.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={`text-[11px] truncate ${c.unread_count > 0 ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>
                          {c.last_message
                            ? `${c.last_message.sender_role === 'admin' ? 'You: ' : ''}${c.last_message.body}`
                            : <span className="capitalize">{c.role}{c.student_code ? ` · ${c.student_code}` : ''}</span>}
                        </p>
                        {c.unread_count > 0 && (
                          <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-500 text-white flex-shrink-0">
                            {c.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="p-6 text-center text-xs text-slate-400">No students or trainers found.</p>
            )}
          </div>
        </div>
      )}

      {/* Thread */}
      {showThread && (
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <div className="h-12 px-3 flex items-center gap-3 border-b border-slate-100 flex-shrink-0">
            {isAdmin && (
              <button
                onClick={() => setActiveUserId(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                title="Back to conversations"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            {isAdmin ? (
              <img
                src={avatarFor(activeConversation)}
                alt={activeConversation?.name}
                className="w-8 h-8 rounded-xl bg-slate-100 object-cover"
              />
            ) : (
              <div className="p-2 rounded-xl bg-indigo-600 text-white">
                <ShieldCheck className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-sm text-slate-900 truncate">
                {isAdmin ? activeConversation?.name : 'Administration'}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {isAdmin
                  ? <span className="capitalize">{activeConversation?.role} · <span className="normal-case">{activeConversation?.email}</span></span>
                  : 'Techcadd admin team'}
              </p>
            </div>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/60">
            {loading ? (
              <p className="py-12 text-center text-xs text-slate-400">Loading messages...</p>
            ) : messages.length > 0 ? (
              messages.map((m) => {
                const isMine = isAdmin ? m.sender_role === 'admin' : m.sender_role !== 'admin';
                return (
                  <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[85%]">
                      <div
                        className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                          isMine
                            ? 'bg-indigo-600 text-white rounded-br-md'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
                        }`}
                      >
                        {m.body}
                      </div>
                      <p className={`text-[10px] text-slate-400 mt-1 ${isMine ? 'text-right' : 'text-left'}`}>
                        {isAdmin && isMine ? `${m.sender_name} · ` : ''}{formatTime(m.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-slate-400">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <h4 className="font-bold text-sm text-slate-700">No messages yet</h4>
                <p className="text-xs text-slate-400 mt-0.5">Send a message to start the conversation.</p>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="p-3 border-t border-slate-100 flex items-end gap-2 flex-shrink-0">
            <textarea
              rows="1"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="Type a message..."
              className="flex-1 resize-none max-h-32 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              title="Send"
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
