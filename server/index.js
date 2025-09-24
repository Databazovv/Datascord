const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { randomUUID } = require('crypto');

const PORT = process.env.PORT || 4000;
const ORIGIN = process.env.ORIGIN || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: ORIGIN, credentials: true }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ORIGIN, credentials: true }
});

const chat = io.of('/chat');
const call = io.of('/call');

// Чат
chat.on('connection', (socket) => {
  socket.on('conversation:join', (conversationId) => {
    if (!conversationId) return;
    socket.join(conversationId);
    socket.data.conversationId = conversationId;
  });

  socket.on('conversation:leave', (conversationId) => {
    if (!conversationId) return;
    socket.leave(conversationId);
  });

  socket.on('message:send', (payload) => {
    if (!payload?.conversationId) return;
    const msg = { id: randomUUID(), ...payload, createdAt: Date.now() };
    chat.to(payload.conversationId).emit('message:new', msg);
  });

  socket.on('typing:start', (conversationId) => {
    if (!conversationId) return;
    socket.to(conversationId).emit('typing', { userId: socket.id, isTyping: true });
  });
  socket.on('typing:stop', (conversationId) => {
    if (!conversationId) return;
    socket.to(conversationId).emit('typing', { userId: socket.id, isTyping: false });
  });
});

// Звонки (WebRTC сигналинг)
call.on('connection', (socket) => {
  socket.on('call:join', (roomId) => {
    if (!roomId) return;
    const room = call.adapter.rooms.get(roomId);
    if (room) {
      for (const peerId of room) {
        socket.emit('call:peer', { peerId, createOffer: true });
      }
    }
    socket.join(roomId);
    socket.to(roomId).emit('call:peer', { peerId: socket.id, createOffer: false });
    socket.data.roomId = roomId;
  });

  socket.on('call:offer', ({ to, sdp }) => {
    if (!to || !sdp) return;
    call.to(to).emit('call:offer', { from: socket.id, sdp });
  });
  socket.on('call:answer', ({ to, sdp }) => {
    if (!to || !sdp) return;
    call.to(to).emit('call:answer', { from: socket.id, sdp });
  });
  socket.on('call:ice', ({ to, candidate }) => {
    if (!to || !candidate) return;
    call.to(to).emit('call:ice', { from: socket.id, candidate });
  });

  socket.on('call:leave', () => {
    const roomId = socket.data.roomId;
    if (roomId) {
      socket.leave(roomId);
      socket.to(roomId).emit('call:peer-left', { peerId: socket.id });
      socket.data.roomId = null;
    }
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (roomId) {
      socket.to(roomId).emit('call:peer-left', { peerId: socket.id });
    }
  });
});

app.get('/health', (_, res) => res.send('ok'));

server.listen(PORT, () => {
  console.log(`Server on http://localhost:${PORT}`);
  console.log(`CORS ORIGIN: ${ORIGIN}`);
});
