import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

export default function FloatingChat() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const openChat = () => {
    navigate("/chatbot");
  };

  return (
    <div className="floating-chat" onClick={openChat} title={t("floatingChatTitle", "Chat with assistant")}>
      <div className="chat-bubble">💬</div>
    </div>
  );
}

