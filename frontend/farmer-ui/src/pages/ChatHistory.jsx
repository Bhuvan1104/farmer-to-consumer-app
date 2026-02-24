import { useState } from "react";
import API from "../services/api";
import "../styles/Pages.css";

function ChatHistory() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addMessage = () => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", content: text.trim() }]);
    setText("");
  };

  const sendConversation = async () => {
    if (messages.length === 0) return setError("Add at least one message");
    setLoading(true);
    setError("");
    setResponses([]);
    try {
      const response = await API.post("chatbot/conversation/", { messages });
      setResponses(response.data.responses || []);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || "Failed to send conversation");
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setMessages([]);
    setResponses([]);
    setError("");
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🗂️ Chat Conversation</h1>
        <p>Compose multi-turn conversation and get batched responses</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="form-section">
        <div className="form-row">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a user message to add to the conversation"
            onKeyPress={(e) => { if (e.key === 'Enter') addMessage(); }}
          />
          <button className="primary-button" onClick={addMessage}>Add</button>
        </div>

        <div className="messages-list">
          <h3>Messages</h3>
          {messages.length === 0 ? (
            <p className="empty-message">No messages yet.</p>
          ) : (
            <ol>
              {messages.map((m, i) => (
                <li key={i}>{m.role}: {m.content}</li>
              ))}
            </ol>
          )}
        </div>

        <div className="form-actions">
          <button className="primary-button" onClick={sendConversation} disabled={loading || messages.length===0}>
            {loading ? "Sending..." : "Send Conversation"}
          </button>
          <button className="back-button" onClick={clearAll}>Clear</button>
        </div>
      </div>

      {responses.length > 0 && (
        <div className="result-card success">
          <h3>Responses</h3>
          <div className="result-grid">
            {responses.map((r, idx) => (
              <div className="result-item" key={idx}>
                <div className="label">Response {idx + 1}</div>
                <div className="value">
                  <p>{r.response || r.text || JSON.stringify(r)}</p>
                  {r.intent && <small>Intent: {r.intent} (conf {Math.round((r.confidence||0)*100)}%)</small>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatHistory;
