import React from 'react';

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 p-1">
      <style>{`
        @keyframes chatBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-3px); opacity: 1; }
        }
        .chat-dot {
          width: 5px;
          height: 5px;
          background-color: #AFA9EC;
          border-radius: 50%;
          animation: chatBounce 1.4s infinite ease-in-out both;
        }
        .chat-dot:nth-child(1) { animation-delay: -0.32s; }
        .chat-dot:nth-child(2) { animation-delay: -0.16s; }
      `}</style>
      <div className="chat-dot"></div>
      <div className="chat-dot"></div>
      <div className="chat-dot"></div>
    </div>
  );
}
