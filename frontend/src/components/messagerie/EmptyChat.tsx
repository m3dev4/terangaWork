import React from 'react';
import { MessageSquare } from 'lucide-react';

/**
 * Displayed when no conversation is selected.
 */
const EmptyChat: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#FAFAF8]">
      <div className="flex flex-col items-center gap-4 text-center px-8 max-w-sm">
        {/* Icon */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#1b4b6b]/8 to-[#1b4b6b]/4 flex items-center justify-center">
          <MessageSquare className="w-8 h-8 text-[#1b4b6b]/30" strokeWidth={1.5} />
        </div>

        {/* Text */}
        <div className="space-y-1.5">
          <h3 className="text-[15px] font-semibold text-neutral-700 font-[var(--font-heading)]">
            Messagerie
          </h3>
          <p className="text-[12px] text-neutral-400 leading-relaxed">
            Sélectionnez une conversation dans la liste pour commencer à discuter avec vos collaborateurs.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmptyChat;
