"""
Serializers for chatbot API endpoints.
"""

from rest_framework import serializers


class ChatbotMessageSerializer(serializers.Serializer):
    """Serializer for chatbot message input."""
    message = serializers.CharField(
        required=True,
        max_length=500,
        help_text="User's message to the chatbot"
    )
    language = serializers.ChoiceField(
        required=False,
        choices=["en", "hi", "te", "ta"],
        help_text="Preferred response language",
        default="en",
    )
    input_mode = serializers.ChoiceField(
        required=False,
        choices=["text", "voice"],
        default="text",
        help_text="Whether the message came from typed input or voice input",
    )


class ChatbotResponseSerializer(serializers.Serializer):
    """Serializer for chatbot responses."""
    response = serializers.CharField(help_text="Chatbot's response")
    intent = serializers.CharField(help_text="Classified intent")
    confidence = serializers.FloatField(help_text="Confidence in classification (0-1)")
    user_message = serializers.CharField(help_text="The user's original message")
    timestamp = serializers.CharField(help_text="Response timestamp")


class ChatbotConversationSerializer(serializers.Serializer):
    """Serializer for multi-turn conversation."""
    messages = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of messages with 'role' and 'content' fields"
    )
    language = serializers.ChoiceField(
        required=False,
        choices=["en", "hi", "te", "ta"],
        default="en",
        help_text="Preferred response language for conversation",
    )


class IntentPatternsSerializer(serializers.Serializer):
    """Serializer for intent patterns."""
    description = serializers.CharField()
    patterns = serializers.ListField(child=serializers.CharField())
    num_patterns = serializers.IntegerField()


class ChatbotIntentsSerializer(serializers.Serializer):
    """Serializer for available intents."""
    pass  # Dynamic serialization


class ChatbotModelInfoSerializer(serializers.Serializer):
    """Serializer for chatbot model information."""
    status = serializers.CharField()
    model_type = serializers.CharField(required=False)
    num_intents = serializers.IntegerField(required=False)
    total_patterns = serializers.IntegerField(required=False)
    intents = serializers.ListField(child=serializers.CharField(), required=False)
    path = serializers.CharField(required=False)
