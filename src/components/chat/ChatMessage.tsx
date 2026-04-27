import React from "react";
import { ChatMessage as IChatMessage } from "@/contexts/ChatContext";

export default function ChatMessage({ message }: { message: IChatMessage }) {
  const isUser = message.role === "user";
  
  return (
    <div className={`flex w-full mb-3 ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[85%] px-4 py-2.5 text-[13px] leading-relaxed shadow-sm"
        style={{
          background: isUser ? "#534AB7" : "rgba(255,255,255,0.03)",
          color: isUser ? "#fff" : "rgba(220,217,245,0.88)",
          border: isUser ? "none" : "0.5px solid rgba(175,169,236,0.08)",
          borderRadius: "16px",
          borderBottomRightRadius: isUser ? "4px" : "16px",
          borderBottomLeftRadius: isUser ? "16px" : "4px"
        }}
      >
        {message.content}
      </div>
    </div>
  );
}
