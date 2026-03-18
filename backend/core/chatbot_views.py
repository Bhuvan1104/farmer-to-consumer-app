"""
Views for chatbot API endpoints.
"""

import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from .chatbot_service import FarmerChatbot
from .serializers import ChatbotConversationSerializer, ChatbotMessageSerializer

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chatbot_message(request):
    """
    Send a message to the chatbot and get a response.
    
    Expected payload:
    {
        "message": "How do I price my products?"
    }
    
    Returns:
    {
        "response": "Our dynamic pricing system...",
        "intent": "pricing",
        "confidence": 0.95,
        "user_message": "How do I price my products?",
        "timestamp": "2026-02-23T10:30:00"
    }
    """
    try:
        serializer = ChatbotMessageSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": "Invalid request", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        message = serializer.validated_data["message"].strip()
        preferred_language = serializer.validated_data.get("language", "en")

        chatbot = FarmerChatbot()
        response = chatbot.get_response(message, preferred_language=preferred_language)
        
        return Response(response, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"Error in chatbot_message: {str(e)}")
        return Response(
            {
                "error": "Error processing message",
                "detail": str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def chatbot_intents(request):
    """
    Get list of available chatbot intents and example patterns.
    
    Returns:
    {
        "greeting": {
            "description": "Greeting related queries",
            "patterns": ["hello", "hi", "hey"],
            "num_patterns": 9
        },
        ...
    }
    """
    try:
        chatbot = FarmerChatbot()
        intents = chatbot.get_available_intents()
        
        return Response(
            {
                "available_intents": intents,
                "total_intents": len(intents)
            },
            status=status.HTTP_200_OK
        )
    
    except Exception as e:
        logger.error(f"Error in chatbot_intents: {str(e)}")
        return Response(
            {
                "error": "Error retrieving intents",
                "detail": str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def chatbot_info(request):
    """
    Get chatbot model information.
    
    Returns:
    {
        "status": "Ready",
        "model_type": "TF-IDF + Naive Bayes",
        "num_intents": 14,
        "total_patterns": 120,
        ...
    }
    """
    try:
        chatbot = FarmerChatbot()
        info = chatbot.get_model_info()
        
        return Response(info, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"Error in chatbot_info: {str(e)}")
        return Response(
            {
                "error": "Error retrieving chatbot info",
                "detail": str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chatbot_conversation(request):
    """
    Handle multi-turn conversation.
    
    Expected payload:
    {
        "messages": [
            {"role": "user", "content": "How do I price products?"},
            {"role": "user", "content": "What about seasonal factors?"}
        ]
    }
    
    Returns:
    {
        "responses": [
            {...response 1...},
            {...response 2...}
        ]
    }
    """
    try:
        serializer = ChatbotConversationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": "Invalid request", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        messages = serializer.validated_data.get("messages", [])
        preferred_language = request.data.get("language", "en")

        if len(messages) > 10:
            return Response(
                {"error": "Too many messages (max 10)"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get responses
        chatbot = FarmerChatbot()
        responses = chatbot.handle_conversation(messages, preferred_language=preferred_language)
        
        return Response(
            {"responses": responses},
            status=status.HTTP_200_OK
        )
    
    except Exception as e:
        logger.error(f"Error in chatbot_conversation: {str(e)}")
        return Response(
            {
                "error": "Error processing conversation",
                "detail": str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
