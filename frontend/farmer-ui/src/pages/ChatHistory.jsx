import { useState, useRef, useEffect } from "react";
import API from "../services/api";
import "../styles/ChatHistory.css";

function ChatHistory() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim()) return;

    const newMessage = { role: "user", content: text.trim() };

    // Add user message immediately
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setText("");
    setLoading(true);
    setError("");

    try {
      const response = await API.post("chatbot/conversation/", {
        messages: updatedMessages,
      });

      const botResponses = response.data.responses || [];

      // Append all bot replies
      const assistantMessages = botResponses.map((r) => ({
        role: "assistant",
        content: r.response || r.text || JSON.stringify(r),
      }));

      setMessages((prev) => [...prev, ...assistantMessages]);

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

  const clearAll = () => {
    setMessages([]);
    setError("");
  };

  return (
    <div className="chat-wrapper">

      <div className="chat-header">
        <h1>🤖 AI Conversation</h1>
        <p>Interactive multi-turn chatbot</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="chat-container">

        {/* Messages */}
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`chat-bubble ${
                m.role === "user" ? "user" : "bot"
              }`}
            >
              {m.content}
            </div>
          ))}

          {loading && (
            <div className="chat-bubble bot">
              Typing...
            </div>
          )}

          <div ref={chatEndRef}></div>
        </div>

        {/* Input */}
        <div className="chat-input">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your message..."
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
  className="send-button"
  onClick={sendMessage}
  disabled={loading}
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
  );
}

export default ChatHistory;