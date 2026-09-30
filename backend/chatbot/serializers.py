from rest_framework import serializers
from .models import ChatConversation, ChatMessage, ChatRole


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ["id", "role", "content", "created_at"]
        read_only_fields = ["id", "created_at"]


class ChatConversationSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatConversation
        fields = [
            "id",
            "title",
            "created_at",
            "updated_at",
            "last_message",
            "message_count",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_last_message(self, obj: ChatConversation):
        last = obj.messages.order_by("-created_at").first()
        if not last:
            return None
        return ChatMessageSerializer(last).data

    def get_message_count(self, obj: ChatConversation) -> int:
        return obj.messages.count()


class ChatConversationDetailSerializer(ChatConversationSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta(ChatConversationSerializer.Meta):
        fields = ChatConversationSerializer.Meta.fields + ["messages"]


class SendChatMessageSerializer(serializers.Serializer):
    content = serializers.CharField(
        required=True,
        allow_blank=False,
        min_length=1,
        max_length=2000,
        error_messages={
            "required": "Le contenu du message est obligatoire.",
            "blank": "Le message ne peut pas être vide.",
            "min_length": "Le message ne peut pas être vide.",
            "max_length": "Le message ne peut pas dépasser 2000 caractères.",
        },
    )

    def validate_content(self, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise serializers.ValidationError("Le message ne peut pas être vide.")
        return stripped
