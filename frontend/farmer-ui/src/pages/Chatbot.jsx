import { useState, useEffect, useRef } from "react";
import API from "../services/api";
import "../styles/Chatbot.css";

function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [intents, setIntents] = useState([]);
  const [showIntents, setShowIntents] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchIntents();
    setMessages([
      {
        id: 1,
        text: "👋 Hello! I'm your AI farming assistant. Ask me anything about pricing, logistics, or demand.",
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
      if (response.data.available_intents) {
  const formattedIntents = Object.entries(response.data.available_intents)
    .map(([key, value]) => ({
      name: key,
      description: value.description,
    }));

  setIntents(formattedIntents);
}
    } catch (err) {
      console.error("Failed to fetch intents", err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: input,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await API.post("chatbot/message/", {
        message: userMessage.text,
      });

      const botMessage = {
        id: Date.now() + 1,
        text: response.data.response,
        sender: "bot",
        intent: response.data.intent,
        confidence: response.data.confidence,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: "⚠️ Sorry, something went wrong. Please try again.",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickMessages = [
    "How do I price my products?",
    "How do deliveries work?",
    "What is current demand?",
    "How to improve freshness score?",
  ];

  return (
    <div className="chatbot-wrapper">

      {/* HEADER */}
      <div className="chatbot-header">
        <h1>🤖 AI Farming Assistant</h1>
        <p>Your smart agriculture advisor</p>
      </div>

      <div className="chatbot-layout">

        {/* CHAT AREA */}
        <div className="chat-container">

          <div className="chat-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-bubble ${msg.sender}`}
              >
                <div className="bubble-content">
                  {msg.text}

                  {msg.intent && (
                    <div className="message-meta">
                      Intent: {msg.intent} | Confidence:{" "}
                      {(msg.confidence * 100).toFixed(0)}%
                    </div>
                  )}
                </div>

                <span className="timestamp">
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}

            {loading && (
              <div className="chat-bubble bot">
                <div className="bubble-content typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* QUICK SUGGESTIONS */}
          {messages.length <= 1 && (
            <div className="quick-suggestions">
              {quickMessages.map((q, idx) => (
                <button key={idx} onClick={() => setInput(q)}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* INPUT */}
          <div className="chat-input">
            <input
              type="text"
              placeholder="Ask your question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={loading}
            />

            <button onClick={sendMessage} disabled={loading || !input.trim()}>
              {loading ? "..." : "➤"}
            </button>

            <button
              className="intents-toggle"
              onClick={() => setShowIntents(!showIntents)}
            >
              📋
            </button>
          </div>
        </div>

        {/* INTENTS PANEL */}
        {showIntents && (
          <div className="intents-panel">
            <h3>Available Topics</h3>
            {intents.map((intent, idx) => (
              <div key={idx} className="intent-card">
                <strong>{intent.name}</strong>
                <p>{intent.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Chatbot;