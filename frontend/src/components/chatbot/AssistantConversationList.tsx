import { Plus, Trash2 } from "lucide-react";
import MalawAvatar from "./MalawAvatar";
import type { ChatConversation } from "../../api/chatApi";
import { formatDate, truncate } from "../../utils/formatDate";

interface AssistantConversationListProps {
  conversations: ChatConversation[];
  activeId: number | null;
  onSelect: (conv: ChatConversation) => void;
  onCreate: () => void;
  onDelete: (id: number) => void;
  isCreating: boolean;
  isLoading: boolean;
}

const AssistantConversationList: React.FC<AssistantConversationListProps> = ({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  isCreating,
  isLoading,
}) => {
  return (
    <div className="flex h-full min-h-0 flex-col w-full overflow-x-hidden bg-brand-sand/25 dark:bg-muted/25">
      <div className="shrink-0 border-b border-brand-ink/8 dark:border-border bg-white dark:bg-card p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <MalawAvatar size="sm" />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-brand-ink dark:text-foreground">
              Assistant Malaw
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              Connecté à vos données
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCreate}
          disabled={isCreating}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-semibold text-brand-ink dark:text-primary-foreground transition-colors hover:bg-brand-green-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {isCreating ? "Création…" : "Nouvelle conversation"}
          </span>
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3">
        {isLoading && conversations.length === 0 ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-brand-ink/5 dark:bg-foreground/5"
              />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
            <MalawAvatar size="md" className="mb-3 opacity-70 grayscale" />
            <p className="text-sm font-medium text-muted-foreground">
              Aucune conversation
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Commencez une discussion
            </p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === activeId;
            return (
              <div
                key={conv.id}
                className={`group relative rounded-xl transition-colors ${
                  isActive
                    ? "bg-white dark:bg-card shadow-sm"
                    : "hover:bg-white/70 dark:hover:bg-card/70"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(conv)}
                  className="block w-full min-w-0 p-3 pr-10 text-left"
                >
                  <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
                    <span
                      className={`min-w-0 truncate text-sm font-medium ${
                        isActive
                          ? "text-brand-ink dark:text-foreground"
                          : "text-brand-ink/75 dark:text-foreground/75"
                      }`}
                    >
                      {truncate(conv.title || `Conversation #${conv.id}`, 32)}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(conv.updated)}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {conv.last_message
                      ? typeof conv.last_message === "string"
                        ? truncate(conv.last_message, 48)
                        : truncate(conv.last_message.content, 48)
                      : `${conv.message_count || 0} message${
                          conv.message_count && conv.message_count > 1
                            ? "s"
                            : ""
                        }`}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground opacity-100 transition-colors hover:bg-brand-green/10 hover:text-brand-violet dark:hover:text-violet-300 sm:opacity-0 sm:group-hover:opacity-100"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AssistantConversationList;
