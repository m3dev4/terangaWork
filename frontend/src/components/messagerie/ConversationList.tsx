import React from "react";
import { Search } from "lucide-react";
import type { Conversation } from "../../api/message";
import ConversationItem from "./ConversationItem";

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (conversation: Conversation) => void;
  isLoading: boolean;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredConversations = React.useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((conv) => {
      const fullName =
        `${conv.autre_utlisateur.first_name} ${conv.autre_utlisateur.last_name}`.toLowerCase();
      return (
        fullName.includes(q) ||
        conv.mission_titre.toLowerCase().includes(q) ||
        conv.dernier_message?.content.toLowerCase().includes(q)
      );
    });
  }, [conversations, searchQuery]);

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Search Bar */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400"
            strokeWidth={1.8}
          />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-[12px] rounded-lg border border-neutral-200 bg-neutral-50/60 placeholder:text-neutral-400 text-neutral-700 focus:outline-none focus:ring-1.5 focus:ring-[#1b4b6b]/20 focus:border-[#1b4b6b]/30 transition-all"
          />
        </div>
      </div>

      {/* Conversation Items */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5 scrollbar-thin">
        {isLoading ? (
          // Skeleton loaders
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-3 animate-pulse"
            >
              <div className="w-10 h-10 rounded-full bg-neutral-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <div className="h-3 bg-neutral-200 rounded w-24" />
                  <div className="h-2.5 bg-neutral-100 rounded w-10" />
                </div>
                <div className="h-2.5 bg-neutral-100 rounded w-40" />
              </div>
            </div>
          ))
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
              <Search className="w-5 h-5 text-neutral-300" />
            </div>
            <p className="text-[12px] text-neutral-600 font-medium">
              {searchQuery
                ? "Aucun résultat trouvé"
                : "Aucune conversation pour le moment"}
            </p>
            {!searchQuery && (
              <p className="text-[10.5px] text-neutral-400 mt-1 leading-relaxed">
                Les échanges s'ouvrent dès que vous contactez un membre depuis
                vos candidatures ou vos projets.
              </p>
            )}
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <ConversationItem
              key={conv.mission_id}
              conversation={conv}
              isActive={activeConversationId === conv.mission_id}
              onClick={() => onSelectConversation(conv)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;
