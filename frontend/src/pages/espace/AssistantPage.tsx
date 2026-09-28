import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  useChatConversations,
  useCreateChatConversation,
  useDeleteChatConversation,
  useChatMessages,
  useSendChatMessage,
} from '../../hooks/useChat';
import type { ChatConversation, ChatMessage } from '../../api/chatApi';

import { toast } from '../../components/ui/toast';
import AssistantConversationList from '../../components/chatbot/AssistantConversationList';
import AssistantChatPanel from '../../components/chatbot/AssistantChatPanel';
import EmptyAssistant from '../../components/chatbot/EmptyAssistant';


// ── Page ──────────────────────────────────────────────────────────────────
const AssistantPage: React.FC = () => {
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [optimisticUserMessage, setOptimisticUserMessage] = useState<string | undefined>(undefined);

  const { data: conversations = [], isLoading: isLoadingConversations } = useChatConversations();
  const {
    data: conversationDetail,
    isLoading: isLoadingMessages,
    error: messagesError,
  } = useChatMessages(activeConversationId);

  const createMutation = useCreateChatConversation();
  const deleteMutation = useDeleteChatConversation();
  const sendMutation = useSendChatMessage();

  useEffect(() => {
    if (messagesError) {
      toast.add({
        title: 'Conversation inaccessible',
        description: 'Impossible de charger cette conversation.',
        type: 'error',
      });
      setActiveConversationId(null);
      setMobileShowChat(false);
    }
  }, [messagesError]);

  const handleCreate = useCallback(async () => {
    try {
      const conv = await createMutation.mutateAsync();
      setActiveConversationId(conv.id);
      setMobileShowChat(true);
    } catch {
      toast.add({ title: 'Erreur', description: 'Impossible de créer une conversation.', type: 'error' });
    }
  }, [createMutation]);

  const handleSelect = useCallback((conv: ChatConversation) => {
    setActiveConversationId(conv.id);
    setMobileShowChat(true);
  }, []);

  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteMutation.mutateAsync(id);
        if (activeConversationId === id) {
          setActiveConversationId(null);
          setMobileShowChat(false);
        }
        toast.add({ title: 'Conversation supprimée', type: 'success' });
      } catch {
        toast.add({ title: 'Erreur', description: 'Impossible de supprimer.', type: 'error' });
      }
    },
    [deleteMutation, activeConversationId]
  );

  const handleSend = useCallback(
    async (content: string) => {
      if (!activeConversationId) return;
      setOptimisticUserMessage(content);
      try {
        const res = await sendMutation.mutateAsync({
          conversationId: activeConversationId,
          payload: { content },
        });
        if (!res.assistant_message || (res as any).detail) {
          throw new Error((res as any).detail || "L'assistant n'a pas pu répondre.");
        }
      } catch (err: any) {
        toast.add({ title: 'Échec', description: err?.message || "Erreur lors de l'envoi.", type: 'error' });
      } finally {
        setOptimisticUserMessage(undefined);
      }
    },
    [activeConversationId, sendMutation]
  );

  return (

    <div className="flex h-full relative min-h-0 w-full overflow-hidden border border-[#111118]/8 bg-white">
      <div
        className={`min-h-0 w-full flex justify-center items-center  border-r border-[#111118]/8  lg:w-[320px] ${
          mobileShowChat ? 'hidden sm:flex' : 'flex'
        }`}
      >
        <AssistantConversationList
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={handleSelect}
          onCreate={handleCreate}
          onDelete={handleDelete}
          isCreating={createMutation.isPending}
          isLoading={isLoadingConversations}
        />
      </div>

      <div className={`min-h-0 min-w-0 flex-1 ${!mobileShowChat ? 'hidden sm:flex' : 'flex'}`}>
        {activeConversationId ? (
          <AssistantChatPanel
            conversationId={activeConversationId}
            messages={conversationDetail?.messages || []}
            isLoadingMessages={isLoadingMessages}
            isSending={sendMutation.isPending}
            sendError={sendMutation.error}
            onSend={handleSend}
            onBack={() => setMobileShowChat(false)}
            mobile={mobileShowChat}
            optimisticMessage={optimisticUserMessage}
          />
        ) : (
          <EmptyAssistant onCreate={handleCreate} isCreating={createMutation.isPending} />
        )}
      </div>
    </div>
  );
};

export default AssistantPage;