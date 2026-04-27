import React from "react";
import { MessageSquare } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";

export default function ChatToggleButton() {
  const { isOpen, toggle, unreadCount } = useChat();

  return (
    <button
      onClick={toggle}
      className="relative flex items-center justify-center rounded-lg transition-all h-8 px-3 gap-2 shrink-0"
      style={{
        background: isOpen ? "#EEEDFE" : "rgba(255,255,255,0.04)",
        border: isOpen ? "1px solid #AFA9EC" : "1px solid rgba(255,255,255,0.07)",
        color: isOpen ? "#3C3489" : "rgba(148,140,195,0.65)",
      }}
    >
      <MessageSquare style={{ width: 14, height: 14 }} />
      <span className="hidden lg:inline text-xs font-medium">Lastra Chat</span>
      
      {unreadCount > 0 && !isOpen && (
        <div 
          className="absolute -top-1 -right-1 h-4 min-w-[16px] flex items-center justify-center rounded-full text-[9px] font-bold text-white px-1 shadow-sm"
          style={{ background: "#F59E0B" }}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </div>
      )}
    </button>
  );
}
