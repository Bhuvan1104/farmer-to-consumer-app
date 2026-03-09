import { useState, useRef, useEffect } from "react";
import API from "../services/api";
import "../styles/ChatHistory.css";

function ChatHistory() {

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const chatEndRef = useRef(null);

  /* =========================
     AUTO SCROLL
  ========================= */

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* =========================
     SEND MESSAGE
  ========================= */

const sendMessage = async () => {
  if (!text.trim() || loading) return;

  const userMessage = {
    role: "user",
    content: text.trim(),
  };

  setMessages((prev) => [...prev, userMessage]);
  setText("");
  setLoading(true);
  setError("");

  try {
    const response = await API.post("chatbot/conversation/", {
      messages: [...messages, userMessage],
    });

    const botResponses = response.data.responses || [];

    if (botResponses.length > 0) {
      const botMessage = {
        role: "assistant",
        content:
          botResponses[0].response ||
          botResponses[0].text ||
          "No response",
      };

      setMessages((prev) => [...prev, botMessage]);
    }

  } catch (err) {
    setError(
      err.response?.data?.detail ||
      err.response?.data?.error ||
      "Failed to send message"
    );
  } finally {
    setLoading(false);
  }
};

  /* =========================
     CLEAR CHAT
  ========================= */

  const clearAll = () => {
    setMessages([]);
    setError("");
  };

  /* =========================
     HANDLE ENTER KEY
  ========================= */

  const handleKeyDown = (e) => {

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }

  };

  /* =========================
     FORMAT TIME
  ========================= */

  const formatTime = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="chat-wrapper">

      {/* HEADER */}

      <div className="chat-header">
        <h1>🤖 AI Conversation</h1>
        <p>Interactive multi-turn farming assistant</p>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      <div className="chat-container">

        {/* =========================
           CHAT MESSAGES
        ========================= */}

        <div className="chat-messages">

          {messages.map((msg, index) => (

            <div
              key={index}
              className={`chat-row ${
                msg.role === "user" ? "user" : "bot"
              }`}
            >

              <div className="avatar">
                {msg.role === "user" ? "🧑" : "🤖"}
              </div>

              <div className="message-content">

                <div className="chat-bubble">
                  {msg.content}
                </div>

                <div className="timestamp">
                  {formatTime(msg.time)}
                </div>

              </div>

            </div>

          ))}

          {/* Typing indicator */}

          {loading && (

            <div className="chat-row bot">

              <div className="avatar">🤖</div>

              <div className="message-content">
                <div className="chat-bubble typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>

            </div>

          )}

          <div ref={chatEndRef}></div>

        </div>

        {/* =========================
           INPUT SECTION
        ========================= */}

        <div className="chat-input">

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask about crops, pricing, logistics, demand..."
            onKeyDown={handleKeyDown}
          />

          <div className="chat-actions">

            <button
              className="send-button"
              onClick={sendMessage}
              disabled={loading || !text.trim()}
            >
              ➤ Send
            </button>

            <button
              className="danger-button"
              onClick={clearAll}
            >
              Clear
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}

export default ChatHistory;