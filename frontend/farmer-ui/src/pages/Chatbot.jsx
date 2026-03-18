import { useCallback, useEffect, useRef, useState } from "react";
import API from "../services/api";
import "../styles/Chatbot.css";

const SUGGESTIONS_BY_LANGUAGE = {
  en: [
    "How do I price my vegetables?",
    "How can I check freshness score?",
    "How long does delivery take?",
    "How do I add a new product?",
  ],
  hi: [
    "\u092e\u0948\u0902 \u0905\u092a\u0928\u0940 \u0938\u092c\u094d\u091c\u093f\u092f\u094b\u0902 \u0915\u093e \u0926\u093e\u092e \u0915\u0948\u0938\u0947 \u0924\u092f \u0915\u0930\u0942\u0902?",
    "\u092b\u094d\u0930\u0947\u0936\u0928\u0947\u0938 \u0938\u094d\u0915\u094b\u0930 \u0915\u0948\u0938\u0947 \u091a\u0947\u0915 \u0915\u0930\u0942\u0902?",
    "\u0921\u093f\u0932\u0940\u0935\u0930\u0940 \u092e\u0947\u0902 \u0915\u093f\u0924\u0928\u093e \u0938\u092e\u092f \u0932\u0917\u0947\u0917\u093e?",
    "\u0928\u092f\u093e \u092a\u094d\u0930\u094b\u0921\u0915\u094d\u091f \u0915\u0948\u0938\u0947 \u091c\u094b\u0921\u093c\u0947\u0902?",
  ],
  te: [
    "\u0c28\u0c3e \u0c15\u0c42\u0c30\u0c17\u0c3e\u0c2f\u0c32 \u0c27\u0c30\u0c32\u0c28\u0c41 \u0c0e\u0c32\u0c3e \u0c28\u0c3f\u0c30\u0c4d\u0c23\u0c2f\u0c3f\u0c02\u0c1a\u0c3e\u0c32\u0c3f?",
    "\u0c24\u0c3e\u0c1c\u0c3e\u0c24\u0c28\u0c02 \u0c38\u0c4d\u0c15\u0c4b\u0c30\u0c4d \u0c0e\u0c32\u0c3e \u0c1a\u0c42\u0c21\u0c3e\u0c32\u0c3f?",
    "\u0c21\u0c46\u0c32\u0c3f\u0c35\u0c30\u0c40\u0c15\u0c3f \u0c0e\u0c02\u0c24 \u0c38\u0c2e\u0c2f\u0c02 \u0c2a\u0c1f\u0c4d\u0c1f\u0c41\u0c24\u0c41\u0c02\u0c26\u0c3f?",
    "\u0c15\u0c4a\u0c24\u0c4d\u0c24 \u0c09\u0c24\u0c4d\u0c2a\u0c24\u0c4d\u0c24\u0c3f\u0c28\u0c3f \u0c0e\u0c32\u0c3e \u0c1c\u0c4b\u0c21\u0c3f\u0c02\u0c1a\u0c3e\u0c32\u0c3f?",
  ],
  ta: [
    "\u0b8e\u0ba9\u0bcd \u0b95\u0bbe\u0baf\u0bcd\u0b95\u0bb1\u0bbf\u0b95\u0bb3\u0bc1\u0b95\u0bcd\u0b95\u0bc1 \u0bb5\u0bbf\u0bb2\u0bc8\u0baf\u0bc8 \u0b8e\u0baa\u0bcd\u0baa\u0b9f\u0bbf \u0ba8\u0bbf\u0bb0\u0bcd\u0ba3\u0baf\u0bbf\u0baa\u0bcd\u0baa\u0ba4\u0bc1?",
    "\u0baa\u0bc1\u0ba4\u0bc1\u0ba9\u0bbf\u0bb2\u0bc8 \u0bae\u0ba4\u0bbf\u0baa\u0bcd\u0baa\u0bc6\u0ba3\u0bcd\u0ba3\u0bc8 \u0b8e\u0baa\u0bcd\u0baa\u0b9f\u0bbf \u0baa\u0bbe\u0bb0\u0bcd\u0baa\u0bcd\u0baa\u0ba4\u0bc1?",
    "\u0b9f\u0bc6\u0bb2\u0bbf\u0bb5\u0bb0\u0bbf\u0b95\u0bcd\u0b95\u0bc1 \u0b8e\u0bb5\u0bcd\u0bb5\u0bb3\u0bb5\u0bc1 \u0ba8\u0bc7\u0bb0\u0bae\u0bcd \u0b86\u0b95\u0bc1\u0bae\u0bcd?",
    "\u0baa\u0bc1\u0ba4\u0bbf\u0baf \u0baa\u0bca\u0bb0\u0bc1\u0bb3\u0bc8 \u0b8e\u0baa\u0bcd\u0baa\u0b9f\u0bbf \u0b9a\u0bc7\u0bb0\u0bcd\u0baa\u0bcd\u0baa\u0ba4\u0bc1?",
  ],
};

const SUGGESTION_LABEL = {
  en: "Quick Prompts",
  hi: "\u0924\u0941\u0930\u0902\u0924 \u0938\u0941\u091d\u093e\u0935",
  te: "\u0c24\u0c15\u0d4d\u0c37\u0c23 \u0c38\u0c42\u0c1a\u0c28\u0c32\u0c41",
  ta: "\u0bb5\u0bbf\u0bb0\u0bc8\u0bb5\u0bbe\u0ba9 \u0baa\u0bb0\u0bbf\u0ba8\u0bcd\u0ba4\u0bc1\u0bb0\u0bc8\u0b95\u0bb3\u0bcd",
};

const LANGUAGE_CONFIG = {
  en: {
    speech: "en-US",
    placeholder: "Ask your question in English...",
    label: "English",
  },
  hi: {
    speech: "hi-IN",
    placeholder: "Hindi mein apna sawal puchhiye...",
    label: "Hindi",
  },
  te: {
    speech: "te-IN",
    placeholder: "Mee prasna ni Telugu lo adagandi...",
    label: "Telugu",
  },
  ta: {
    speech: "ta-IN",
    placeholder: "Ungal kelviyai Tamil-il kelungal...",
    label: "Tamil",
  },
};

function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [selectedLang, setSelectedLang] = useState("en");

  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setMessages([
      {
        id: 1,
        text: "Hello. I am your AI farming assistant. You can type or speak in your selected language.",
        sender: "bot",
        timestamp: new Date(),
      },
    ]);
  }, []);
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);
  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speakText = useCallback(
    (text, langKey) => {
      if (!text) return;

      stopSpeaking();

      const speech = new SpeechSynthesisUtterance(text);
      speech.lang = LANGUAGE_CONFIG[langKey]?.speech || LANGUAGE_CONFIG[selectedLang].speech;
      speech.rate = 1;
      speech.pitch = 1;

      speech.onstart = () => setSpeaking(true);
      speech.onend = () => setSpeaking(false);
      speech.onerror = () => setSpeaking(false);

      window.speechSynthesis.speak(speech);
    },
    [selectedLang, stopSpeaking]
  );

  const sendMessage = useCallback(
    async (overrideText = null) => {
      const messageText = (overrideText ?? input).trim();
      if (!messageText) return;

      const userMessage = {
        id: Date.now(),
        text: messageText,
        sender: "user",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setLoading(true);

      try {
        const response = await API.post("chatbot/message/", {
          message: messageText,
          language: selectedLang,
          input_mode: overrideText ? "voice" : "text",
        });

        const botMessage = {
          id: Date.now() + 1,
          text: response.data.response,
          sender: "bot",
          intent: response.data.intent,
          confidence: response.data.confidence,
          language: response.data.language || selectedLang,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, botMessage]);
        speakText(botMessage.text, botMessage.language);
      } catch (err) {
        const reason = err?.response?.data?.detail || err?.response?.data?.error || "Something went wrong while contacting the assistant.";
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            text: reason,
            sender: "bot",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, selectedLang, speakText]
  );

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setTimeout(() => sendMessage(transcript), 350);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      window.speechSynthesis.cancel();
    };
  }, [selectedLang, sendMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const startListening = () => {
    if (!recognitionRef.current) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: "Voice input is not supported in this browser. You can continue with text chat.",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
      return;
    }

    if (listening) {
      recognitionRef.current.stop();
      return;
    }

    recognitionRef.current.lang = LANGUAGE_CONFIG[selectedLang].speech;
    recognitionRef.current.start();
  };

  const suggestions = SUGGESTIONS_BY_LANGUAGE[selectedLang] || [];

  return (
    <div className="chatbot-wrapper">
      <header className="chatbot-header">
        <div>
          <p className="chatbot-tag">Conversational AI</p>
          <h1>AI Farming Assistant</h1>
          <p>Multilingual guidance for pricing, freshness, delivery, and order workflows.</p>
        </div>

        <div className="chatbot-status">
          <span className={`status-pill ${loading ? "busy" : "ready"}`}>
            {loading ? "Thinking" : "Ready"}
          </span>
          <span className={`status-pill ${listening ? "live" : "off"}`}>
            {listening ? "Listening" : "Mic Off"}
          </span>
          <span className={`status-pill ${speaking ? "talk" : "off"}`}>
            {speaking ? "Speaking" : "Voice Idle"}
          </span>
        </div>
      </header>

      <div className="chat-container">

        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-bubble ${msg.sender}`}>
              <div className="bubble-content">
                {msg.text}
                {msg.intent && (
                  <div className="message-meta">
                    Intent: {msg.intent} | Confidence: {(msg.confidence * 100).toFixed(0)}%
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
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input">
          <div className="chat-suggestions chat-suggestions-inline">
            <div className="chat-suggestions-title">{SUGGESTION_LABEL[selectedLang] || "Quick Prompts"}</div>
            {suggestions.length === 0 ? (
              <div className="chat-suggestions-empty">No suggestions for selected language.</div>
            ) : (
              suggestions.map((q, index) => (
                <button key={`inline-${index}`} onClick={() => sendMessage(q)} disabled={loading}>
                  {q}
                </button>
              ))
            )}
          </div>

          <div className="chat-input-top">
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="lang-select"
              disabled={loading}
            >
              {Object.entries(LANGUAGE_CONFIG).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder={LANGUAGE_CONFIG[selectedLang].placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={loading}
            />
          </div>

          <div className="chat-input-actions">
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()} className="send-button">
              Send Message
            </button>

            <button
              onClick={startListening}
              className={`mic-button ${listening ? "active" : ""}`}
              title={listening ? "Stop listening" : "Start voice input"}
              aria-label={listening ? "Stop microphone" : "Start microphone"}
            >
              {listening ? "■" : "🎤"}
            </button>

            <button
              onClick={stopSpeaking}
              className="stop-voice-button"
              disabled={!speaking}
              title="Stop text to speech"
            >
              Stop Voice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chatbot;

