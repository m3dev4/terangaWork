import React from 'react';
import type { Message } from '../../api/message';
import { getMediaUrl } from "../../utils/getMediaUrl";
import { formatMessageTime } from './utils';
import { Check, CheckCheck } from 'lucide-react';

import AudioPlayer from './AudioPlayer';

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  showAvatar: boolean;
  senderInfo: {
    first_name: string;
    last_name: string;
    profile_picture?: string | null;
  };
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isMine,
  showAvatar,
  senderInfo,
}) => {
  const initials = `${senderInfo.first_name?.[0] ?? ''}${senderInfo.last_name?.[0] ?? ''}`.toUpperCase();
  const isVocal = message.type === 'VOCAL' || Boolean(message.audio_url);

  return (
    <div className={`flex gap-2.5 ${isMine ? 'flex-row-reverse' : 'flex-row'} items-end group`}>
      {/* Avatar */}
      <div className={`shrink-0 ${showAvatar ? 'visible' : 'invisible'}`}>
        <div className="w-7 h-7 rounded-full overflow-hidden">
          {senderInfo.profile_picture ? (
            <img
              src={getMediaUrl(senderInfo.profile_picture)}
              alt={`${senderInfo.first_name}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${
              isMine 
                ? 'bg-gradient-to-br from-[#f2994a] to-[#e87b2d]' 
                : 'bg-gradient-to-br from-[#1b4b6b] to-[#2d6f9a]'
            }`}>
              <span className="text-white text-[9px] font-semibold">{initials}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bubble */}
      <div className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
        <div
          className={`
            px-3.5 py-2.5 text-[12.5px] leading-relaxed
            ${isMine
              ? 'bg-[#1b4b6b] text-white rounded-2xl rounded-br-md'
              : 'bg-white text-neutral-800 rounded-2xl rounded-bl-md border border-neutral-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
            }
          `}
        >
          {isVocal && message.audio_url ? (
            <AudioPlayer audioUrl={message.audio_url} isMine={isMine} />
          ) : (
            message.content
          )}
        </div>
        
        {/* Time + read receipt */}
        <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[9.5px] text-neutral-400 font-medium">
            {formatMessageTime(message.date_envoi)}
          </span>
          {isMine && (
            message.est_lu ? (
              <CheckCheck className="w-3 h-3 text-[#1b4b6b]" strokeWidth={2.5} />
            ) : (
              <Check className="w-3 h-3 text-neutral-400" strokeWidth={2.5} />
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
