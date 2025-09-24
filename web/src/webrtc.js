import { io } from 'socket.io-client';

const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SOCKET_URL) || 'http://localhost:4000';

export class CallClient {
  constructor() {
    this.socket = io(`${BASE_URL}/call`, { auth: { token: '' } });
    this.peers = new Map();
    this.localStream = null;
    this.onRemoteStream = null;
    this.onPeerLeft = null;

    this.socket.on('call:peer', async ({ peerId, createOffer }) => {
      const pc = this._createPeer(peerId);
      if (this.localStream) this.localStream.getTracks().forEach(t => pc.addTrack(t, this.localStream));
      if (createOffer) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.socket.emit('call:offer', { to: peerId, sdp: offer });
      }
    });

    this.socket.on('call:offer', async ({ from, sdp }) => {
      const pc = this._createPeer(from);
      if (this.localStream) this.localStream.getTracks().forEach(t => pc.addTrack(t, this.localStream));
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.socket.emit('call:answer', { to: from, sdp: answer });
    });

    this.socket.on('call:answer', async ({ from, sdp }) => {
      const pc = this.peers.get(from);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    this.socket.on('call:ice', async ({ from, candidate }) => {
      const pc = this.peers.get(from);
      if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    this.socket.on('call:peer-left', ({ peerId }) => {
      this._closePeer(peerId);
      this.onPeerLeft && this.onPeerLeft(peerId);
    });
  }

  async enableMedia(kind = 'both') {
    const constraints = { audio: true, video: kind !== 'audio' ? { width: 1280, height: 720 } : false };
    this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    return this.localStream;
  }

  join(roomId) { this.socket.emit('call:join', roomId); }

  leave() {
    this.socket.emit('call:leave');
    for (const id of this.peers.keys()) this._closePeer(id);
    this.peers.clear();
    if (this.localStream) this.localStream.getTracks().forEach(t => t.stop());
  }

  _createPeer(peerId) {
    let pc = this.peers.get(peerId);
    if (pc) return pc;
    const iceServers = [{ urls: ['stun:stun.l.google.com:19302'] }];
    pc = new RTCPeerConnection({ iceServers });
    pc.onicecandidate = (e) => {
      if (e.candidate) this.socket.emit('call:ice', { to: peerId, candidate: e.candidate });
    };
    pc.ontrack = (e) => {
      const [stream] = e.streams;
      if (stream && this.onRemoteStream) this.onRemoteStream(peerId, stream);
    };
    this.peers.set(peerId, pc);
    return pc;
  }

  _closePeer(peerId) {
    const pc = this.peers.get(peerId);
    if (pc) {
      pc.getSenders().forEach(s => pc.removeTrack(s));
      pc.close();
      this.peers.delete(peerId);
    }
  }
}
