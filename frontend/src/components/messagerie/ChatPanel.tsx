import React from "react";
import type { Conversation } from "../../api/message";
import type { AuthUser } from "../../interfaces/authInterface";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { useMessage } from "../../hooks/useMessage";
import { useSendMessage } from "../../hooks/useSendMessage";
import { mark_read } from "../../api/message";
import { useQueryClient } from "@tanstack/react-query";

interface ChatPanelProps {
  conversation: Conversation;
  currentUser: AuthUser;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ conversation, currentUser }) => {
  const queryClient = useQueryClient();
  const { data: messages = [], isLoading } = useMessage(
    conversation.mission_id
  );
  const sendMessageMutation = useSendMessage();

  // Mark messages as read when conversation opens
  React.useEffect(() => {
    if (conversation.nb_non_lus > 0) {
      mark_read(conversation.mission_id).then(() => {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      });
    }
  }, [conversation.mission_id, conversation.nb_non_lus, queryClient]);

  const handleSendMessage = (content: string) => {
    sendMessageMutation.mutate({
      mission: conversation.mission_id,
      destinataire: conversation.autre_utlisateur.id,
      type: "TEXTE",
      content,
      audio_url: null,
    });
  };

  const handleSendAudioMessage = (audioUrl: string) => {
    sendMessageMutation.mutate({
      mission: conversation.mission_id,
      destinataire: conversation.autre_utlisateur.id,
      type: "VOCAL",
      content: "Message vocal",
      audio_url: audioUrl,
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAFAF8]">
      <ChatHeader
        user={conversation.autre_utlisateur}
        missionTitle={conversation.mission_titre}
      />

      <MessageList
        messages={messages}
        currentUserId={currentUser.id}
        isLoading={isLoading}
      />

      <MessageInput
        onSendMessage={handleSendMessage}
        onSendAudioMessage={handleSendAudioMessage}
        isSending={sendMessageMutation.isPending}
        disabled={conversation.is_linked === false}
      />
    </div>
  );
};

export default ChatPanel;
