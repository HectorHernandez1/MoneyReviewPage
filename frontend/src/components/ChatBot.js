import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/budget/api' : 'http://localhost:8000';

const STATIC_SUGGESTIONS = [
  "What are my top spending categories?",
  "Am I over budget anywhere?",
  "Which credit cards did I use this month?",
  "Compare this month to last month"
];

// Suggestions generated from the dashboard's live data, so the chips point
// at what's actually happening (over-budget categories, subscriptions, pace)
const buildSuggestions = (overview, recurring) => {
  const suggestions = [];

  const cats = overview?.categories || [];
  cats
    .filter(c => c.status === 'over')
    .sort((a, b) => (b.percent_used || 0) - (a.percent_used || 0))
    .slice(0, 2)
    .forEach(c => suggestions.push(`Why is ${c.category} over budget this month?`));

  const totals = overview?.totals;
  if (overview?.pacing?.is_partial && totals?.total_limit > 0 &&
      totals?.projected != null && totals.projected > totals.total_limit) {
    suggestions.push("Am I going to stay under budget this month?");
  }

  if (recurring?.recurring?.length > 0) {
    suggestions.push("Which subscriptions could I cut?");
  }

  suggestions.push("Explain this month in a few sentences");

  for (const s of STATIC_SUGGESTIONS) {
    if (suggestions.length >= 5) break;
    if (!suggestions.includes(s)) suggestions.push(s);
  }
  return suggestions.slice(0, 5);
};

const CHAT_STORAGE_KEY = 'budget-chat-conversation';

// Restore a cached conversation so the chat survives page reloads.
// Close (X) and the trash button clear it; minimize keeps it.
const loadStoredChat = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY));
    if (stored && Array.isArray(stored.messages) && Array.isArray(stored.history)) {
      return stored;
    }
  } catch (e) { /* corrupt or unavailable storage — start fresh */ }
  return { messages: [], history: [] };
};

function ChatBot({ filters, overview, recurring, externalPrompt }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => loadStoredChat().messages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState(() => loadStoredChat().history);
  const [chatSize, setChatSize] = useState({ width: 400, height: 520 });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const resizingRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Cache the conversation (capped at the 40 most recent messages)
  useEffect(() => {
    try {
      if (messages.length === 0) {
        localStorage.removeItem(CHAT_STORAGE_KEY);
      } else {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({
          messages: messages.slice(-40),
          history: conversationHistory
        }));
      }
    } catch (e) { /* storage full or unavailable — skip caching */ }
  }, [messages, conversationHistory]);

  // Auto-grow the input with its content, up to the CSS max-height
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [input, isOpen]);

  // Resize handlers
  const startResize = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = chatSize.width;
    const startHeight = chatSize.height;
    const maxHeight = window.innerHeight * 0.85;

    resizingRef.current = { direction, startX, startY, startWidth, startHeight };

    const onMouseMove = (e) => {
      if (!resizingRef.current) return;
      const { direction, startX, startY, startWidth, startHeight } = resizingRef.current;

      let newWidth = startWidth;
      let newHeight = startHeight;

      if (direction === 'corner' || direction === 'left') {
        // Dragging left edge: moving mouse left = bigger width
        newWidth = Math.min(700, Math.max(320, startWidth + (startX - e.clientX)));
      }
      if (direction === 'corner' || direction === 'top') {
        // Dragging top edge: moving mouse up = bigger height
        newHeight = Math.min(maxHeight, Math.max(350, startHeight + (startY - e.clientY)));
      }

      setChatSize({ width: newWidth, height: newHeight });
    };

    const onMouseUp = () => {
      resizingRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;

    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/chat`, {
        message: text,
        conversation_history: conversationHistory,
        filters: {
          period: filters.period,
          year: filters.year,
          month: filters.month,
          user: filters.user
        }
      });

      const assistantMessage = { role: 'assistant', content: response.data.response };
      setMessages(prev => [...prev, assistantMessage]);
      setConversationHistory(response.data.conversation_history || []);
    } catch (error) {
      const errorMsg = error.response?.status === 503
        ? "The AI assistant is not configured yet. Please add your API key to the backend .env file."
        : "Sorry, I couldn't process that request. Please try again.";
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
    }

    setLoading(false);
  };

  // "Ask why" links on the dashboard open the chat and send their question
  const lastExternalTs = useRef(null);
  useEffect(() => {
    if (!externalPrompt || !externalPrompt.text) return;
    if (externalPrompt.ts === lastExternalTs.current) return;
    lastExternalTs.current = externalPrompt.ts;
    setIsOpen(true);
    sendMessage(externalPrompt.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalPrompt]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleClear = () => {
    setMessages([]);
    setConversationHistory([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating bubble */}
      {!isOpen && (
        <button className="chat-bubble" onClick={() => setIsOpen(true)} title="Ask about your spending">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="chat-window" style={{ width: chatSize.width, height: chatSize.height }}>
          {/* Resize handles */}
          <div className="chat-resize-handle" onMouseDown={(e) => startResize(e, 'corner')} />
          <div className="chat-resize-edge-top" onMouseDown={(e) => startResize(e, 'top')} />
          <div className="chat-resize-edge-left" onMouseDown={(e) => startResize(e, 'left')} />

          <div className="chat-header">
            <span className="chat-title">Budget Assistant</span>
            <div className="chat-header-actions">
              <button className="chat-header-btn" onClick={handleClear} title="Clear conversation">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
              <button className="chat-header-btn" onClick={() => setIsOpen(false)} title="Minimize">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="18" x2="19" y2="18" />
                </svg>
              </button>
              <button className="chat-header-btn chat-close-btn" onClick={() => { handleClear(); setIsOpen(false); }} title="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          <div className="chat-messages">
                {messages.length === 0 && !loading && (
                  <div className="chat-welcome">
                    <p>Hi! I can help you understand your spending. Try asking:</p>
                    <div className="chat-suggestions">
                      {buildSuggestions(overview, recurring).map((s, i) => (
                        <button key={i} className="chat-suggestion" onClick={() => sendMessage(s)}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`chat-message chat-message-${msg.role}`}>
                    <div className="chat-message-content">
                      {msg.role === 'assistant' ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            table: ({ node, ...props }) => (
                              <div className="chat-table-wrap">
                                <table {...props} />
                              </div>
                            ),
                            a: ({ node, ...props }) => (
                              <a {...props} target="_blank" rel="noopener noreferrer" />
                            )
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="chat-message chat-message-assistant">
                    <div className="chat-typing">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <form className="chat-input-area" onSubmit={handleSubmit}>
                <textarea
                  ref={inputRef}
                  className="chat-input"
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your spending... (Shift+Enter for new line)"
                  disabled={loading}
                />
                <button type="submit" className="chat-send-btn" disabled={!input.trim() || loading}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </form>
        </div>
      )}
    </>
  );
}

export default ChatBot;
