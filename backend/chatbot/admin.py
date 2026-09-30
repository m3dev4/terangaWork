from django.contrib import admin
from .models import ChatConversation, ChatMessage


class ChatMessageInline(admin.TabularInline):
    model = ChatMessage
    extra = 0
    readonly_fields = ("role", "content", "created_at")
    ordering = ("-created_at",)


@admin.register(ChatConversation)
class ChatConversationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "owner",
        "title",
        "message_count",
        "created_at",
        "updated_at",
    )
    list_select_related = ("owner",)
    search_fields = ("owner__email", "owner__first_name", "owner__last_name", "title")
    list_filter = ("created_at", "updated_at")
    readonly_fields = ("created_at", "updated_at")
    inlines = [ChatMessageInline]

    def message_count(self, obj: ChatConversation) -> int:
        return obj.messages.count()

    message_count.short_description = "Nombre de messages"


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "conversation",
        "role",
        "short_content",
        "created_at",
    )
    list_select_related = ("conversation", "conversation__owner")
    list_filter = ("role", "created_at")
    search_fields = ("content", "conversation__title")
    readonly_fields = ("created_at",)

    def short_content(self, obj: ChatMessage) -> str:
        return (obj.content[:80] + "...") if len(obj.content) > 80 else obj.content

    short_content.short_description = "Contenu"
