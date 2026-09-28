import { AlertCircle, ArrowLeft, Bot, Send, UserIcon } from "lucide-react";
import { formatDate, truncate } from "../../utils/formatDate";
import TypingAssistantMessage from "./TypingAssistantMessage";
import { toast } from "../ui/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../../api/chatApi";
import { useQuery } from "@tanstack/react-query";
import getCurrentUser from "../../utils/getUser";
import { getMediaUrl } from "../../utils/getMediaUrl";

// ── Panneau de conversation ──────────────────────────────────────────────
interface AssistantChatPanelProps {
  conversationId: number;
  messages: ChatMessage[];
  isLoadingMessages: boolean;
  isSending: boolean;
  sendError: Error | null;
  onSend: (content: string) => void;
  onBack: () => void;
  mobile: boolean;
  optimisticMessage?: string;
}

const AssistantChatPanel: React.FC<AssistantChatPanelProps> = ({
  conversationId,
  messages,
  isLoadingMessages,
  isSending,
  sendError,
  onSend,
  onBack,
  mobile,
  optimisticMessage,
}) => {
  const [input, setInput] = useState('');
  const [localTypingId, setLocalTypingId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: user } = useQuery({
      queryKey: ["currentUser"],
      queryFn: getCurrentUser,
      retry: false,
    });

  const displayMessages: (ChatMessage & { _optimistic?: boolean })[] = [...messages];

  if (optimisticMessage && isSending) {
    displayMessages.push({
      id: -1,
      role: 'utilisateur',
      content: optimisticMessage,
      created_at: new Date().toISOString(),
      _optimistic: true,
    } as any);
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayMessages.length, isSending]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  useEffect(() => {
    if (!isSending && messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.role === 'assistant') {
        setLocalTypingId(last.id);
      }
    }
  }, [isSending, messages]);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;
    if (trimmed.length > 2000) {
      toast.add({
        title: 'Message trop long',
        description: 'Le message ne doit pas dépasser 2000 caractères.',
        type: 'error',
      });
      return;
    }
    onSend(trimmed);
    setInput('');
  }, [input, isSending, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isCoarsePointer =
      typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
    if (e.key === 'Enter' && !e.shiftKey && !isCoarsePointer) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const convTitle =
    displayMessages.find((m) => m.role === 'utilisateur')?.content ||
    `Conversation #${conversationId}`;

  return (
    <div className="flex h-full relative min-h-0 flex-col w-full bg-white">
      {mobile && (
        <button
          type="button"
          onClick={onBack}
          className="flex shrink-0 items-center gap-2 border-b border-[#111118]/8 bg-white px-4 py-3 text-sm font-medium text-[#111118]/70 hover:bg-[#F3EBDD]/40 sm:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>
      )}

      <div className="flex shrink-0 items-center gap-3 border-b border-[#111118]/8 bg-white px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#111118]">
          <Bot className="h-4.5 w-4.5 text-[#E7B84B]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-[#111118]">{truncate(convTitle, 60)}</h3>
          <p className="truncate text-xs text-[#111118]/45">
            {isSending ? 'Réflexion en cours…' : sendError ? 'Erreur' : 'Prêt à répondre'}
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {isLoadingMessages ? (
          <div className="flex justify-center py-12">
            <div className="flex items-center gap-2 text-sm text-[#111118]/45">
              <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#D95C38] border-t-transparent" />
              Chargement…
            </div>
          </div>
        ) : displayMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-2 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3EBDD]">
              <Bot className="h-7 w-7 text-[#D95C38]" />
            </div>
            <h4 className="mb-2 text-base font-bold text-[#111118]">Assistant Malaw</h4>
            <p className="mb-6 max-w-md text-sm text-[#111118]/50">
              Posez des questions sur vos candidatures, missions, paiements ou obtenez des conseils personnalisés.
            </p>
            <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                'Où en est ma candidature ?',
                'Quelles sont mes missions en cours ?',
                'Combien ai-je gagné ce mois-ci ?',
                'Des conseils pour mon profil ?',
              ].map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setInput(sug)}
                  className="rounded-xl border border-[#111118]/10 bg-[#F3EBDD]/40 p-3 text-left text-xs text-[#111118]/70 transition-colors hover:border-[#D95C38]/40 hover:bg-white"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        ) : (
          displayMessages.map((msg, idx) => {
            const isUser = msg.role === 'utilisateur';
            const showTypingAnimation =
              !isUser &&
              !isSending &&
              idx === displayMessages.length - 1 &&
              localTypingId === msg.id;

            return (
              <div
                key={msg.id + '-' + idx}
                className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#111118]">
                    <Bot className="h-3.5 w-3.5 text-[#E7B84B]" />
                  </div>
                )}

                <div
                  className={`min-w-0 max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm sm:max-w-[75%] ${
                    isUser
                      ? 'rounded-br-md bg-[#111118] text-white'
                      : 'rounded-bl-md border border-[#111118]/8 bg-[#F3EBDD]/40 text-[#111118]'
                  }`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  ) : showTypingAnimation ? (
                    <TypingAssistantMessage fullText={msg.content} />
                  ) : (
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  )}
                  <div className={`mt-1.5 text-xs ${isUser ? 'text-white/50' : 'text-[#111118]/35'}`}>
                    {formatDate(msg.created_at)}
                  </div>
                </div>

                {isUser && (
                  <div className="flex h-7 w-7 shrink-0 items-center relative overflow-hidden justify-center rounded-lg bg-[#D95C38]">
                    <img src={getMediaUrl(user.profile_picture)} alt={user.first_name} className="h-7 rounded-lg w-7 object-cover" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {isSending && !optimisticMessage && displayMessages.length > 0 && (
          <div className="flex items-start gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#111118]">
              <Bot className="h-3.5 w-3.5 text-[#E7B84B]" />
            </div>
            <div className="rounded-2xl rounded-bl-md border border-[#111118]/8 bg-[#F3EBDD]/40 px-4 py-3">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#111118]/30 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#111118]/30 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#111118]/30" />
              </div>
            </div>
          </div>
        )}

        {sendError && !isSending && (
          <div className="mx-auto flex max-w-md items-start gap-2 rounded-xl border border-[#D95C38]/25 bg-[#D95C38]/10 px-4 py-3 text-sm text-[#c14f2f]">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium">Erreur</p>
              <p className="mt-1 break-words text-xs">
                {sendError.message || "L'assistant n'a pas pu répondre."}
              </p>
            </div>
          </div>
        )}
      </div>

      <div
        className="shrink-0 border-t border-[#111118]/8 bg-white px-4 py-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isSending}
            placeholder="Posez votre question…"
            className="min-w-0 flex-1 resize-none rounded-xl border border-[#111118]/12 bg-[#F3EBDD]/30 px-3.5 py-2.5 text-sm text-[#111118] placeholder:text-[#111118]/35 focus:outline-none focus:ring-2 focus:ring-[#D95C38]/15 focus:border-[#D95C38] disabled:opacity-60"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || isSending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#D95C38] text-white transition-colors hover:bg-[#c14f2f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-[#111118]/35">{input.length}/2000 caractères</p>
      </div>
    </div>
  );
};

export default AssistantChatPanel;
