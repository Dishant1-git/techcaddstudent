import jwt from 'jsonwebtoken';
import { WebSocketServer } from 'ws';
import { db } from './db/database.js';
import { JWT_SECRET } from './middleware/auth.js';

export const WS_PATH = '/api/ws';

const AUTH_TIMEOUT_MS = 10000;
const HEARTBEAT_INTERVAL_MS = 30000;

// Authenticated sockets. A user can have several (multiple tabs/devices).
const sockets = new Set();

function send(ws, payload) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
}

function authenticate(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.findById('users', decoded.id);
    return user && user.status === 'active' ? user : null;
  } catch (err) {
    return null;
  }
}

// Pushes an event to everyone who can see a thread: its student/trainer and,
// because admins share one inbox, every connected admin. Each recipient also
// gets their own fresh unread total so no follow-up request is needed.
// `audience` narrows delivery to one side of the thread.
export function pushToThread(threadUserId, event, audience = 'all') {
  for (const ws of sockets) {
    const isAdmin = ws.user.role === 'admin';
    const isThreadUser = String(ws.user.id) === String(threadUserId);
    if (!isAdmin && !isThreadUser) continue;
    if (audience === 'admin' && !isAdmin) continue;
    if (audience === 'user' && isAdmin) continue;
    send(ws, { ...event, unreadMessages: db.countUnreadMessages(ws.user) });
  }
}

export function attachRealtime(server) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname !== WS_PATH) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws));
  });

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('error', () => {});

    // The token arrives as the first frame rather than in the URL so it never
    // ends up in proxy or access logs.
    const authTimer = setTimeout(() => ws.close(4401, 'Authentication timeout'), AUTH_TIMEOUT_MS);

    ws.on('message', (raw) => {
      if (ws.user) return; // The socket is push-only once authenticated

      let data = null;
      try {
        data = JSON.parse(raw.toString());
      } catch (err) {
        // Falls through to the auth failure below
      }

      const user = data && data.type === 'auth' && typeof data.token === 'string' ? authenticate(data.token) : null;
      if (!user) {
        ws.close(4401, 'Authentication failed');
        return;
      }

      clearTimeout(authTimer);
      ws.user = { id: user.id, role: user.role };
      sockets.add(ws);
      send(ws, { type: 'ready', unreadMessages: db.countUnreadMessages(ws.user) });
    });

    ws.on('close', () => {
      clearTimeout(authTimer);
      sockets.delete(ws);
    });
  });

  // Drops dead connections and keeps idle ones open through proxies
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);
  heartbeat.unref();

  server.on('close', () => {
    clearInterval(heartbeat);
    wss.close();
  });

  return wss;
}
