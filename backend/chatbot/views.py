import logging
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import get_object_or_404

from .models import ChatConversation, ChatMessage, ChatRole
from .serializers import (
    ChatConversationSerializer,
    ChatConversationDetailSerializer,
    ChatMessageSerializer,
    SendChatMessageSerializer,
)
from .services import call_fastapi_chat, ChatbotServiceUnavailableError

logger = logging.getLogger(__name__)


def _auto_generate_title(first_message_content: str) -> str:
    stripped = first_message_content.strip()
    if not stripped:
        return "Nouvelle conversation"
    title = stripped.splitlines()[0][:50].strip()
    if len(stripped.splitlines()[0]) > 50:
        title += "..."
    return title or "Nouvelle conversation"


class ConversationListView(APIView):
    """
    GET /api/chat/conversations/ : liste les conversations de l'utilisateur.
    POST /api/chat/conversations/ : crée une conversation (titre optionnel).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request) -> Response:
        qs = (
            ChatConversation.objects.filter(owner=request.user)
            .prefetch_related("messages")
        )
        serializer = ChatConversationSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request) -> Response:
        title = (request.data.get("title") or "").strip()
        conv = ChatConversation.objects.create(
            owner=request.user,
            title=title,
        )
        return Response(
            ChatConversationSerializer(conv).data,
            status=status.HTTP_201_CREATED,
        )


class ConversationDetailView(APIView):
    """
    GET    /api/chat/conversations/<id>/messages/ : historique des messages.
    DELETE /api/chat/conversations/<id>/ : supprime la conversation.
    """

    permission_classes = [IsAuthenticated]

    def _get_owned_conversation(self, request, pk) -> ChatConversation:
        conv = get_object_or_404(ChatConversation, pk=pk)
        if conv.owner_id != request.user.id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Cette conversation ne vous appartient pas.")
        return conv

    def get(self, request, pk=None) -> Response:
        conv = self._get_owned_conversation(request, pk)
        messages = conv.messages.select_related("conversation").order_by("created_at")
        data = ChatConversationDetailSerializer(conv).data
        data["messages"] = ChatMessageSerializer(messages, many=True).data
        return Response(data)

    def delete(self, request, pk=None) -> Response:
        conv = self._get_owned_conversation(request, pk)
        conv.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SendChatMessageView(APIView):
    """
    POST /api/chat/conversations/<id>/send/ :
    Enregistre le message utilisateur, orchestre FastAPI, enregistre la réponse.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None) -> Response:
        conv = get_object_or_404(ChatConversation, pk=pk)
        if conv.owner_id != request.user.id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Cette conversation ne vous appartient pas.")

        serializer = SendChatMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        content = serializer.validated_data["content"]

        # 1. Enregistrer le message utilisateur
        user_msg = ChatMessage.objects.create(
            conversation=conv,
            role=ChatRole.UTILISATEUR,
            content=content,
        )

        # Auto-générer le titre si vide (1er message)
        if not conv.title.strip():
            conv.title = _auto_generate_title(content)
            conv.save(update_fields=["title", "updated_at"])
        else:
            conv.save(update_fields=["updated_at"])

        # 2. Construire l'historique récent (10 derniers messages avant l'actuel)
        history = list(
            conv.messages.exclude(pk=user_msg.pk)
            .order_by("-created_at")[:10]
        )[::-1]
        conversation_history = [
            {"role": m.role, "contenu": m.content} for m in history
        ]
        # Ajouter le message courant à l'historique transmis
        conversation_history.append({"role": "utilisateur", "contenu": content})

        # 3. Appeler FastAPI
        payload = {
            "user_id": request.user.id,
            "user_role": request.user.role,
            "user_prenom": request.user.first_name or "Utilisateur",
            "conversation_history": conversation_history,
            "question": content,
        }
        try:
            fastapi_res = call_fastapi_chat(payload)
        except ChatbotServiceUnavailableError as e:
            logger.error(
                f"Service chatbot indisponible (user={request.user.id}, conv={conv.id}): {e}"
            )
            return Response(
                {
                    "detail": (
                        "L'assistant est temporairement indisponible. "
                        "Veuillez réessayer dans quelques instants."
                    ),
                    "user_message": ChatMessageSerializer(user_msg).data,
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if fastapi_res.get("erreur"):
            logger.warning(
                f"FastAPI chat a signalé une erreur (user={request.user.id}): {fastapi_res}"
            )
            return Response(
                {
                    "detail": fastapi_res.get(
                        "message_user_fr",
                        "L'assistant est temporairement indisponible.",
                    ),
                    "user_message": ChatMessageSerializer(user_msg).data,
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # 4. Enregistrer la réponse assistant
        assistant_text = fastapi_res.get("reponse") or (
            "Désolé, je n'ai pas pu générer de réponse. Veuillez réessayer."
        )
        assistant_msg = ChatMessage.objects.create(
            conversation=conv,
            role=ChatRole.ASSISTANT,
            content=assistant_text,
        )
        conv.save(update_fields=["updated_at"])

        return Response(
            {
                "user_message": ChatMessageSerializer(user_msg).data,
                "assistant_message": ChatMessageSerializer(assistant_msg).data,
                "precision_demandee": fastapi_res.get("precision_demandee"),
            },
            status=status.HTTP_200_OK,
        )
