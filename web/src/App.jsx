import React, { useEffect, useRef, useState } from 'react';
import { ChatClient } from './chat';
import { CallClient } from './webrtc';

function App() {
  const [conversationId, setConversationId] = useState('test');
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const chatRef = useRef(null);
  const callRef = useRef(null);
  const localVideoRef = useRef(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [inCall, setInCall] = useState(false);

  useEffect(() => {
    chatRef.current = new ChatClient();
    chatRef.current.onNewMessage((msg) => setMessages((prev) => [...prev, msg]));

    callRef.current = new CallClient();
    callRef.current.onRemoteStream = (peerId, stream) => {
      setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
    };
    callRef.current.onPeerLeft = (peerId) => {
      setRemoteStreams((prev) => {
        const copy = { ...prev };
        delete copy[peerId];
        return copy;
      });
    };

    return () => callRef.current?.leave();
  }, []);

  const joinChat = () => {
    chatRef.current.joinConversation(conversationId);
    setJoined(true);
  };

  const send = () => {
    if (!input.trim()) return;
    chatRef.current.sendMessage(conversationId, input.trim());
    setInput('');
  };

  const startCall = async () => {
    const stream = await callRef.current.enableMedia('both');
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch(() => {});
    }
    callRef.current.join(conversationId);
    setInCall(true);
  };

  const leaveCall = () => {
    callRef.current.leave();
    setRemoteStreams({});
    setInCall(false);
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  };

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: 16, fontFamily: 'system-ui' }}>
      <h2>Web Messenger MVP</h2>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input value={conversationId} onChange={(e) => setConversationId(e.target.value)} placeholder="ID беседы (например, test)" />
        <button onClick={joinChat} disabled={joined}>Войти в чат</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, height: 360, display: 'flex', flexDirection: 'column' }}>
          <b>Чат</b>
          <div style={{ flex: 1, overflow: 'auto', marginTop: 8, paddingRight: 4 }}>
            {messages.map(m => (
              <div key={m.id} style={{ marginBottom: 6 }}>
                <span style={{ color: '#666', fontSize: 12 }}>{new Date(m.createdAt).toLocaleTimeString()}</span>{' '}
                <span>{m.content}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Сообщение..."
              style={{ flex: 1 }}
            />
            <button onClick={send}>Отправить</button>
          </div>
        </div>

        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
          <b>Звонок</b>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {!inCall ? (
              <button onClick={startCall}>Начать звонок</button>
            ) : (
              <button onClick={leaveCall} style={{ background: '#f44', color: '#fff' }}>Завершить</button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <video ref={localVideoRef} autoPlay playsInline style={{ width: '100%', background: '#000', borderRadius: 8 }} />
            {Object.entries(remoteStreams).map(([peerId, stream]) => (
              <Video key={peerId} stream={stream} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Video({ stream }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
      ref.current.play().catch(() => {});
    }
  }, [stream]);
  return <video ref={ref} autoPlay playsInline style={{ width: '100%', background: '#000', borderRadius: 8 }} />;
}

export default App;
