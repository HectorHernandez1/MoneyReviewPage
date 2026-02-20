import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/budget/api' : 'http://localhost:8000';

const SUGGESTIONS = [
  "What are my top spending categories?",
  "Am I over budget anywhere?",
  "How much did I spend on dining?",
  "Compare this month to last month"
];

function ChatBot({ filters }) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatUser, setChatUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen && chatUser && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, chatUser]);

  // Sync chatUser with dashboard filter
  useEffect(() => {
    if (filters.user && filters.user.toLowerCase() !== 'all') {
      // Specific user selected in dashboard — auto-set and skip "Who are you?"
      setChatUser(filters.user);
    } else {
      // "All Users" selected — reset so user selection screen shows
      setChatUser(null);
    }
  }, [filters.user]);

  // Fetch users when chat is opened and "All Users" is selected
  useEffect(() => {
    if (isOpen && users.length === 0 && !chatUser) {
      setLoadingUsers(true);
      axios.get(`${API_BASE_URL}/users`)
        .then(res => {
          const userList = res.data.users || [];
          setUsers(userList);
          // If only one user, auto-select them
          if (userList.length === 1) {
            setChatUser(userList[0]);
          }
        })
        .catch(() => setUsers([]))
        .finally(() => setLoadingUsers(false));
    }
  }, [isOpen, users.length, chatUser]);

  const handleSelectUser = (selectedUser) => {
    setChatUser(selectedUser);
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
          user: chatUser
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

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleClear = () => {
    setMessages([]);
    setConversationHistory([]);
    setChatUser(null);
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
        <div className="chat-window">
          <div className="chat-header">
            <span className="chat-title">
              Budget Assistant{chatUser ? ` — ${chatUser}` : ''}
            </span>
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

          {/* User selection screen */}
          {!chatUser ? (
            <div className="chat-messages">
              <div className="chat-user-select">
                <div className="chat-user-select-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <p className="chat-user-select-title">Who are you?</p>
                <p className="chat-user-select-subtitle">Select your name to get started</p>
                {loadingUsers ? (
                  <div className="chat-typing" style={{ justifyContent: 'center', padding: '16px 0' }}>
                    <span></span><span></span><span></span>
                  </div>
                ) : (
                  <div className="chat-user-buttons">
                    {users.map((u) => (
                      <button
                        key={u}
                        className="chat-user-btn"
                        onClick={() => handleSelectUser(u)}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="chat-messages">
                {messages.length === 0 && !loading && (
                  <div className="chat-welcome">
                    <p>Hi {chatUser}! I can help you understand your spending. Try asking:</p>
                    <div className="chat-suggestions">
                      {SUGGESTIONS.map((s, i) => (
                        <button key={i} className="chat-suggestion" onClick={() => sendMessage(s)}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`chat-message chat-message-${msg.role}`}>
                    <div className="chat-message-content">{msg.content}</div>
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
                <input
                  ref={inputRef}
                  type="text"
                  className="chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your spending..."
                  disabled={loading}
                />
                <button type="submit" className="chat-send-btn" disabled={!input.trim() || loading}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}

export default ChatBot;
