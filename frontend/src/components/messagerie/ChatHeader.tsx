import React from 'react';
import { Phone, Video, MoreVertical } from 'lucide-react';
import type { UserMinimal } from '../../api/message';

interface ChatHeaderProps {
  user: UserMinimal;
  missionTitle: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ user, missionTitle }) => {
  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="h-14 px-4 flex items-center justify-between border-b border-neutral-200/80 bg-[#1b4b6b] shrink-0">
      {/* Left: User info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 ring-2 ring-white/20">
          {user.profile_picture ? (
            <img
              src={user.profile_picture}
              alt={`${user.first_name} ${user.last_name}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#f2994a] to-[#e87b2d] flex items-center justify-center">
              <span className="text-white text-xs font-semibold">{initials}</span>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-white truncate">
            {user.first_name} {user.last_name}
          </h3>
          <p className="text-[10.5px] text-white/60 truncate">
            {missionTitle}
          </p>
        </div>
      </div>

      {/* Right: Action icons */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Appel audio"
        >
          <Phone className="w-4 h-4" strokeWidth={1.8} />
        </button>
        <button
          type="button"
          className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Appel vidéo"
        >
          <Video className="w-4 h-4" strokeWidth={1.8} />
        </button>
        <button
          type="button"
          className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Plus d'options"
        >
          <MoreVertical className="w-4 h-4" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
