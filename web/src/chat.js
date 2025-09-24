import { io } from 'socket.io-client';

const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SOCKET_URL) || 'http://localhost:4000';

export class ChatClient {
  constructor() {
    this.socket = io(`${BASE_URL}/chat`, { auth: { token: '' } });
  }
  joinConversation(id) { this.socket.emit('conversation:join', id); }
  leaveConversation(id) { this.socket.emit('conversation:leave', id); }
  sendMessage(conversationId, content) {
    const tempId = (globalThis.crypto && globalThis.crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
    this.socket.emit('message:send', { tempId, conversationId, type: 'text', content });
  }
  onNewMessage(cb) { this.socket.on('message:new', cb); }
}
