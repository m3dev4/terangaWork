import React from "react";
import { Phone, Video, MoreVertical } from "lucide-react";
import { getMediaUrl } from "../../utils/getMediaUrl";
import type { UserMinimal } from "../../api/message";

interface ChatHeaderProps {
  user: UserMinimal;
  missionTitle: string;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ user, missionTitle }) => {
  const initials =
    `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase();

  return (
    <div className="h-14 px-3 sm:px-4 gap-2 flex items-center justify-between border-b border-border/80 bg-brand-violet shrink-0">
      {/* Left: User info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 ring-2 ring-white/20">
          {user.profile_picture ? (
            <img
              src={getMediaUrl(user.profile_picture)}
              alt={`${user.first_name} ${user.last_name}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-green to-brand-green flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-semibold">
                {initials}
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-white truncate">
            {user.first_name} {user.last_name}
          </h3>
          <p className="text-[10.5px] text-white/75 truncate">{missionTitle}</p>
        </div>
      </div>

      {/* Right: Action icons */}
      <div className="flex shrink-0 items-center gap-1">
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
