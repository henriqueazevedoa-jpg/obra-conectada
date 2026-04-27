import React from "react";

interface ChatSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export default function ChatSuggestions({ suggestions, onSelect }: ChatSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto px-4 pb-3 pt-2 no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion)}
          className="whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors shrink-0"
          style={{
            background: "transparent",
            color: "rgba(148,140,195,0.7)",
            border: "0.5px solid rgba(175,169,236,0.15)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.color = "#818CF8";
            e.currentTarget.style.border = "0.5px solid rgba(175,169,236,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "rgba(148,140,195,0.7)";
            e.currentTarget.style.border = "0.5px solid rgba(175,169,236,0.15)";
          }}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
