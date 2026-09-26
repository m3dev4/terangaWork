import React, { useRef, useEffect, useMemo } from 'react';
import type { Message } from '../../api/message';
import MessageBubble from './MessageBubble';
import { formatDateSeparator, getDateKey } from './utils';
import { Loader2 } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  currentUserId: number;
  isLoading: boolean;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  isLoading,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { dateKey: string; dateLabel: string; messages: Message[] }[] = [];
    let currentDateKey = '';

    for (const msg of messages) {
      const dk = getDateKey(msg.date_envoi);
      if (dk !== currentDateKey) {
        currentDateKey = dk;
        groups.push({
          dateKey: dk,
          dateLabel: formatDateSeparator(msg.date_envoi),
          messages: [msg],
        });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }

    return groups;
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-[#1b4b6b] animate-spin" />
          <p className="text-[12px] text-neutral-400">Chargement des messages...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-center px-8">
          <div className="w-14 h-14 rounded-2xl bg-[#1b4b6b]/5 flex items-center justify-center mb-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#1b4b6b]/40">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-[13px] font-medium text-neutral-500">Aucun message</p>
          <p className="text-[11px] text-neutral-400">Envoyez votre premier message pour démarrer la conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1 scrollbar-thin">
      {groupedMessages.map((group) => (
        <div key={group.dateKey}>
          {/* Date Separator */}
          <div className="flex items-center justify-center my-4">
            <span className="px-3 py-1 text-[10px] font-semibold text-neutral-400 bg-neutral-100/80 rounded-full uppercase tracking-wider">
              {group.dateLabel}
            </span>
          </div>

          {/* Messages */}
          <div className="space-y-3">
            {group.messages.map((msg, idx) => {
              const isMine = msg.expediteur === currentUserId;
              const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
              const showAvatar = !prevMsg || prevMsg.expediteur !== msg.expediteur;

              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isMine={isMine}
                  showAvatar={showAvatar}
                  senderInfo={isMine ? msg.expediteur_info : msg.expediteur_info}
                />
              );
            })}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
