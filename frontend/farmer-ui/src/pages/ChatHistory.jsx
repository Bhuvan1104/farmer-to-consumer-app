import { useEffect, useMemo, useRef, useState } from "react";
import API from "../services/api";
import "../styles/ChatHistory.css";

const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "te", label: "Telugu" },
  { code: "ta", label: "Tamil" },
];

function ChatHistory() {
  const [contacts, setContacts] = useState([]);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [composeLanguage, setComposeLanguage] = useState("en");
  const [displayLanguage, setDisplayLanguage] = useState("en");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [actionMenuMessageId, setActionMenuMessageId] = useState(null);

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptBufferRef = useRef("");

  const selectedContact = useMemo(
    () => contacts.find((item) => item.id === selectedContactId) || null,
    [contacts, selectedContactId]
  );

  const formatTime = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleString([], {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const resolveSpeechLocale = (langCode) => {
    const map = { en: "en-IN", hi: "hi-IN", te: "te-IN", ta: "ta-IN" };
    return map[langCode] || "en-IN";
  };

  const fetchContacts = async () => {
    const res = await API.get("users/chat/contacts/");
    const data = Array.isArray(res.data) ? res.data : [];
    setContacts(data);
    if (!selectedContactId && data.length > 0) setSelectedContactId(data[0].id);
  };

  const fetchMessages = async (contactId) => {
    if (!contactId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    try {
      const res = await API.get("users/chat/messages/", {
        params: { with_user_id: contactId, language: displayLanguage },
      });
      setMessages(Array.isArray(res.data) ? res.data : []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to fetch messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initProfile = async () => {
      try {
        const res = await API.get("auth/profile/");
        const lang = res.data?.preferred_language || "en";
        if (res.data?.id) setCurrentUserId(Number(res.data.id));
        setComposeLanguage(lang);
        setDisplayLanguage(lang);
      } catch {
        // Keep defaults
      }
    };
    initProfile();
    fetchContacts();
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return undefined;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = resolveSpeechLocale(composeLanguage);

    recognition.onstart = () => {
      transcriptBufferRef.current = "";
      setListening(true);
      setError("");
    };

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript || "";
        if (event.results[i].isFinal) finalChunk += ` ${transcript}`;
        else interimChunk += ` ${transcript}`;
      }
      if (finalChunk.trim()) {
        transcriptBufferRef.current = `${transcriptBufferRef.current} ${finalChunk}`.trim();
      }
      setText(`${transcriptBufferRef.current} ${interimChunk}`.trim());
    };

    recognition.onerror = () => {
      setListening(false);
      setError("Voice input failed. Please type or try again.");
    };

    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setSpeechSupported(true);

    return () => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    };
  }, [composeLanguage]);

  useEffect(() => {
    if (selectedContactId) fetchMessages(selectedContactId);
  }, [selectedContactId, displayLanguage]);

  useEffect(() => {
    const timer = setInterval(() => {
      fetchContacts();
      if (selectedContactId) fetchMessages(selectedContactId);
    }, 7000);
    return () => clearInterval(timer);
  }, [selectedContactId, displayLanguage]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const sendMessage = async () => {
    if (!text.trim() || !selectedContactId || sending) return;
    setSending(true);
    setError("");
    try {
      await API.post("users/chat/messages/", {
        receiver_id: selectedContactId,
        message: text.trim(),
        sender_language: composeLanguage,
      });
      setText("");
      await fetchMessages(selectedContactId);
      await fetchContacts();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const startEdit = (msg) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.source_text || "");
    setActionMenuMessageId(null);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  const saveEdit = async (messageId) => {
    const payload = editingText.trim();
    if (!payload) return;
    try {
      await API.post(`users/chat/messages/${messageId}/edit/`, {
        message: payload,
        sender_language: composeLanguage,
      });
      cancelEdit();
      setActionMenuMessageId(null);
      await fetchMessages(selectedContactId);
      await fetchContacts();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update message");
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      await API.post(`users/chat/messages/${messageId}/delete/`);
      if (editingMessageId === messageId) cancelEdit();
      setActionMenuMessageId(null);
      await fetchMessages(selectedContactId);
      await fetchContacts();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete message");
    }
  };

  const toggleMic = () => {
    if (!speechSupported || !recognitionRef.current) return;
    recognitionRef.current.lang = resolveSpeechLocale(composeLanguage);
    if (listening) recognitionRef.current.stop();
    else {
      try {
        recognitionRef.current.start();
      } catch {
        setError("Unable to start microphone. Allow mic permission and try again.");
      }
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat2-wrapper">
      <div className="chat2-header">
        <h1>Regional Language Messages</h1>
        <p>Type or speak in your language. View in any selected language.</p>
      </div>

      {error && <div className="chat2-error">{error}</div>}

      <div className="chat2-layout">
        <aside className="chat2-contacts">
          <div className="chat2-sidebar-head">
            <h3>People</h3>
            <div className="chat2-lang-controls">
              <label>
                My input language
                <select value={composeLanguage} onChange={(e) => setComposeLanguage(e.target.value)}>
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Translate thread to
                <select value={displayLanguage} onChange={(e) => setDisplayLanguage(e.target.value)}>
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="chat2-contact-list">
            {contacts.length === 0 && <div className="chat2-empty">No contacts yet. Place or receive an order first.</div>}
            {contacts.map((contact) => (
              <button
                key={contact.id}
                type="button"
                className={`chat2-contact ${selectedContactId === contact.id ? "active" : ""}`}
                onClick={() => setSelectedContactId(contact.id)}
              >
                <div className="chat2-contact-main">
                  <div className="chat2-contact-avatar">{(contact.username || "U").charAt(0).toUpperCase()}</div>
                  <div>
                    <strong>{contact.username}</strong>
                    <p>{contact.role}</p>
                  </div>
                </div>
                {contact.unread_count > 0 && <span className="chat2-unread">{contact.unread_count}</span>}
              </button>
            ))}
          </div>
        </aside>

        <section className="chat2-thread">
          <div className="chat2-thread-head">
            <h3>{selectedContact ? selectedContact.username : "Select a contact"}</h3>
            {selectedContact && (
              <span>
                Receiver preference: {selectedContact.preferred_language || "en"} | Viewing: {displayLanguage}
              </span>
            )}
          </div>

          <div className="chat2-messages">
            {loading && <div className="chat2-empty">Loading messages...</div>}
            {!loading && messages.length === 0 && <div className="chat2-empty">No messages yet. Start the conversation.</div>}
            {messages.map((msg) => {
              const isMine =
                currentUserId !== null
                  ? Number(msg.sender) === Number(currentUserId)
                  : Number(msg.sender) !== Number(selectedContactId);
              return (
                <div key={msg.id} className={`chat2-row ${isMine ? "mine" : "other"}`}>
                  <div className="chat2-bubble">
                    {editingMessageId === msg.id ? (
                      <div className="chat2-edit-wrap">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="chat2-edit-input"
                        />
                        <div className="chat2-edit-actions">
                          <button type="button" onClick={() => saveEdit(msg.id)}>Save</button>
                          <button type="button" onClick={cancelEdit}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div>{msg.display_text || msg.source_text}</div>
                    )}
                    <small>{formatTime(msg.created_at)}</small>
                    {isMine && editingMessageId !== msg.id && (
                      <div className="chat2-msg-menu">
                        <button
                          type="button"
                          className="chat2-msg-menu-trigger"
                          onClick={() =>
                            setActionMenuMessageId((prev) => (prev === msg.id ? null : msg.id))
                          }
                          aria-label="Open message options"
                          title="Message options"
                        >
                          ▾
                        </button>
                        {actionMenuMessageId === msg.id && (
                          <div className="chat2-msg-menu-popover">
                            <button type="button" onClick={() => startEdit(msg)}>
                              Edit
                            </button>
                            <button type="button" onClick={() => deleteMessage(msg.id)}>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          <div className="chat2-input">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type your message..."
              disabled={!selectedContact}
            />
            <div className="chat2-input-actions">
              <button
                type="button"
                className={`chat2-mic-btn ${listening ? "listening" : ""}`}
                onClick={toggleMic}
                disabled={!selectedContact || !speechSupported}
                aria-label={listening ? "Stop microphone" : "Start microphone"}
                title={speechSupported ? "Use microphone" : "Speech input not supported"}
              >
                {listening ? "■" : "🎤"}
              </button>
              <button type="button" onClick={sendMessage} disabled={!selectedContact || !text.trim() || sending}>
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ChatHistory;
