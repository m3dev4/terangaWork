import React from 'react';
import type { Conversation } from '../../api/message';
import { getMediaUrl } from "../../utils/getMediaUrl";
import { formatRelativeTime } from './utils';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick,
}) => {
  const user = conversation.autre_utlisateur;
  const lastMessage = conversation.dernier_message;
  const unread = conversation.nb_non_lus;

  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 cursor-pointer text-left group
        ${isActive
          ? 'bg-brand-violet/8 dark:bg-violet-400/15 border border-brand-violet/15 dark:border-violet-300/40'
          : 'hover:bg-brand-canvas dark:hover:bg-background border border-transparent'
        }
      `}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center overflow-hidden
          ${user.profile_picture ? '' : 'bg-gradient-to-br from-brand-violet to-brand-violet'}
        `}>
          {user.profile_picture ? (
            <img
              src={getMediaUrl(user.profile_picture)}
              alt={`${user.first_name} ${user.last_name}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white text-xs font-semibold">{initials}</span>
          )}
        </div>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-brand-green rounded-full border-2 border-white dark:border-card" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[13px] truncate ${unread > 0 ? 'font-semibold text-brand-ink dark:text-foreground' : 'font-medium text-brand-ink dark:text-foreground'}`}>
            {user.first_name} {user.last_name}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
            {lastMessage ? formatRelativeTime(lastMessage.date_envoi) : ''}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={`text-[11.5px] truncate leading-snug ${unread > 0 ? 'text-neutral-600 dark:text-muted-foreground font-medium' : 'text-muted-foreground'}`}>
            {lastMessage?.content || 'Aucun message'}
          </p>
          {unread > 0 && (
            <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-green text-brand-ink dark:text-primary-foreground text-[9px] font-bold flex items-center justify-center">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default ConversationItem;
