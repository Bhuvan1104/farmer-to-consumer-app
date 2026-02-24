import { useState, useEffect, useRef } from "react";
import API from "../services/api";
import "../styles/Pages.css";

function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [intents, setIntents] = useState([]);
  const [showIntents, setShowIntents] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchIntents();
    // Add welcome message
    setMessages([
      {
        id: 1,
        text: "👋 Hello! I'm your farming assistant. How can I help you today?",
        sender: "bot",
        timestamp: new Date(),
      },
    ]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchIntents = async () => {
    try {
      const response = await API.get("chatbot/intents/");
      if (response.data.intents) {
        setIntents(response.data.intents);
      }
    } catch (err) {
      console.error("Failed to fetch intents", err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      text: input,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await API.post("chatbot/message/", {
        message: input,
      });

      const botMessage = {
        id: messages.length + 2,
        text: response.data.response,
        sender: "bot",
        intent: response.data.intent,
        confidence: response.data.confidence,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      const errorMessage = {
        id: messages.length + 2,
        text: "Sorry, I couldn't process your message. Please try again.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickMessage = (text) => {
    setInput(text);
  };

  const quickMessages = [
    "How do I price my products?",
    "How do deliveries work?",
    "What's today's market demand?",
    "How do I check product freshness?",
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>💬 Farming Assistant Chatbot</h1>
        <p>Get instant help with questions about farming, pricing, and logistics</p>
      </div>

      <div className="chatbot-container">
        <div className="chat-box">
          <div className="chat-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`message ${msg.sender === "user" ? "user" : "bot"}`}
              >
                <div className="message-content">
                  {msg.text}
                  {msg.intent && (
                    <div className="message-meta">
                      <small>Intent: {msg.intent} (Confidence: {(msg.confidence * 100).toFixed(0)}%)</small>
                    </div>
                  )}
                </div>
                <span className="message-time">
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
            {loading && (
              <div className="message bot loading">
                <div className="message-content">
                  <span className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-section">
            {messages.length <= 1 && (
              <div className="quick-messages">
                <p>Quick questions:</p>
                {quickMessages.map((msg, idx) => (
                  <button
                    key={idx}
                    className="quick-message-btn"
                    onClick={() => handleQuickMessage(msg)}
                  >
                    {msg}
                  </button>
                ))}
              </div>
            )}

            <div className="chat-input-wrapper">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
                placeholder="Type your question..."
                disabled={loading}
              />
              <button
                className="send-button"
                onClick={sendMessage}
                disabled={loading || !input.trim()}
              >
                {loading ? "..." : "Send"}
              </button>
              <button
                className="intents-button"
                onClick={() => setShowIntents(!showIntents)}
                title="View available topics"
              >
                📋
              </button>
            </div>
          </div>
        </div>

        {showIntents && (
          <div className="intents-panel">
            <h3>📚 Available Topics</h3>
            <div className="intents-grid">
              {intents.map((intent, idx) => (
                <div key={idx} className="intent-card">
                  <h4>{intent.name}</h4>
                  <p>{intent.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chatbot;
