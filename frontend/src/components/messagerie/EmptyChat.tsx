import React from 'react';
import { MessageSquare } from 'lucide-react';

/**
 * Displayed when no conversation is selected.
 */
const EmptyChat: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center bg-brand-canvas dark:bg-background">
      <div className="flex flex-col items-center gap-4 text-center px-8 max-w-sm">
        {/* Icon */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-violet/8 dark:from-violet-400/10 to-brand-violet/4 dark:to-violet-400/5 flex items-center justify-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground" strokeWidth={1.5} />
        </div>

        {/* Text */}
        <div className="space-y-1.5">
          <h3 className="text-[15px] font-semibold text-brand-ink dark:text-foreground font-[var(--font-heading)]">
            Messagerie
          </h3>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            Sélectionnez une conversation dans la liste pour commencer à discuter avec vos collaborateurs.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmptyChat;
