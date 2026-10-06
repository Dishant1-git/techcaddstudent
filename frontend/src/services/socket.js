import { API_BASE } from './api';

const RECONNECT_MIN_MS = 1000;
const RECONNECT_MAX_MS = 30000;

// Single WebSocket shared by the whole app. The server only pushes chat
// events over it; sending still goes through the REST API.
let ws = null;
let wanted = false;
let ready = false;
let reconnectDelay = RECONNECT_MIN_MS;
let reconnectTimer = null;
const listeners = new Set();

function socketUrl() {
  const url = new URL(`${API_BASE}/ws`, window.location.href);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.href;
}

function emit(event) {
  listeners.forEach(listener => listener(event));
}

function open() {
  const token = localStorage.getItem('auth_token');
  if (!wanted || !token) return;

  const socket = new WebSocket(socketUrl());
  ws = socket;

  socket.onopen = () => {
    socket.send(JSON.stringify({ type: 'auth', token }));
  };

  socket.onmessage = (e) => {
    let event;
    try {
      event = JSON.parse(e.data);
    } catch (err) {
      return;
    }
    if (event.type === 'ready') {
      ready = true;
      reconnectDelay = RECONNECT_MIN_MS;
    }
    emit(event);
  };

  socket.onclose = () => {
    if (ws !== socket) return;
    ws = null;
    ready = false;
    if (!wanted) return;
    reconnectTimer = setTimeout(open, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS);
  };
}

export const socket = {
  connect() {
    if (wanted) return;
    wanted = true;
    open();
  },

  disconnect() {
    wanted = false;
    ready = false;
    reconnectDelay = RECONNECT_MIN_MS;
    clearTimeout(reconnectTimer);
    if (ws) {
      const closing = ws;
      ws = null;
      closing.close();
    }
  },

  // True once the server has accepted the auth token
  isReady: () => ready,

  // Events: { type: 'ready' | 'message:new' | 'thread:read', unreadMessages, ... }
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};
