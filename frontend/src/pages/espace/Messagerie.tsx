import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import type { Conversation } from '../../api/message';
import getCurrentUser from '../../utils/getUser';
import { useConversions } from '../../hooks/useConversations';
import { ConversationList, ChatPanel, EmptyChat } from '../../components/messagerie';
import { ArrowLeft } from 'lucide-react';

const MessageriePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [syntheticConversation, setSyntheticConversation] = useState<Conversation | null>(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    retry: false,
  });

  const { data: fetchedConversations = [], isLoading: convLoading } = useConversions();

  // Combine fetched conversations with any synthetic conversation created via URL params
  const conversations = useMemo(() => {
    if (!syntheticConversation) return fetchedConversations;
    const exists = fetchedConversations.some(
      (c) => String(c.mission_id) === String(syntheticConversation.mission_id)
    );
    if (exists) return fetchedConversations;
    return [syntheticConversation, ...fetchedConversations];
  }, [fetchedConversations, syntheticConversation]);

  // Handle URL query parameters (e.g. /espace/messages?mission=12&title=Design&user_id=5&first_name=Marc)
  useEffect(() => {
    const missionId = searchParams.get('mission');
    if (!missionId) return;

    // 1. Check if conversation already exists in fetched list
    const existing = fetchedConversations.find(
      (c) => String(c.mission_id) === String(missionId)
    );

    if (existing) {
      setActiveConversation(existing);
      setMobileShowChat(true);
    } else if (missionId) {
      // 2. Synthesize a conversation from URL params so user can initiate chat immediately
      const title = searchParams.get('title') || 'Mission #' + missionId;
      const userId = Number(searchParams.get('user_id') || 0);
      const firstName = searchParams.get('first_name') || 'Collaborateur';
      const lastName = searchParams.get('last_name') || '';
      const profilePic = searchParams.get('profile_picture') || null;

      const newConv: Conversation = {
        mission_id: String(missionId),
        mission_titre: title,
        autre_utlisateur: {
          id: userId,
          first_name: firstName,
          last_name: lastName,
          profile_picture: profilePic,
        },
        dernier_message: null,
        nb_non_lus: 0,
        date_dernier_message: new Date().toISOString(),
        is_linked: true,
      };

      setSyntheticConversation(newConv);
      setActiveConversation(newConv);
      setMobileShowChat(true);
    }
  }, [searchParams, fetchedConversations]);

  const handleSelectConversation = useCallback((conv: Conversation) => {
    setActiveConversation(conv);
    setMobileShowChat(true);
  }, []);

  const handleBackToList = useCallback(() => {
    setMobileShowChat(false);
  }, []);

  return (
    <div
      className="flex overflow-hidden bg-white shadow-sm -m-4 sm:-m-5 lg:-m-6"
      style={{
        width: 'calc(100% + 2rem)',
        height: 'calc(100vh - 48px)',
      }}
    >
      {/* ─── Conversation List (left panel) ─── */}
      <div
        className={`
          w-full sm:w-[300px] lg:w-[320px] shrink-0 border-r border-neutral-200/60
          ${mobileShowChat ? 'hidden sm:flex' : 'flex'}
          flex-col
        `}
      >
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversation?.mission_id ?? null}
          onSelectConversation={handleSelectConversation}
          isLoading={convLoading}
        />
      </div>

      {/* ─── Chat Panel (right panel) ─── */}
      <div
        className={`
          flex-1 min-w-0 flex flex-col
          ${!mobileShowChat ? 'hidden sm:flex' : 'flex'}
        `}
      >
        {/* Mobile back button */}
        {mobileShowChat && (
          <button
            type="button"
            onClick={handleBackToList}
            className="sm:hidden flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-[#1b4b6b] bg-white border-b border-neutral-100 shrink-0 cursor-pointer hover:bg-neutral-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux conversations
          </button>
        )}

        {activeConversation && user ? (
          <ChatPanel
            conversation={activeConversation}
            currentUser={user}
          />
        ) : (
          <EmptyChat />
        )}
      </div>
    </div>
  );
};

export default MessageriePage;