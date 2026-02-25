import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function FloatingChat(){
  const navigate = useNavigate();
  const openChat = () => {
    // route to chatbot page (protected)
    navigate('/chatbot');
  }

  return (
    <div className="floating-chat" onClick={openChat} title="Chat with assistant">
      <div className="chat-bubble">💬</div>
    </div>
  )
}
