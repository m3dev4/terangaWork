import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Mic, Trash2, Square } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onSendAudioMessage?: (audioUrl: string) => void;
  isSending: boolean;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onSendAudioMessage,
  isSending,
  disabled = false,
}) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || isSending || disabled) return;
    onSendMessage(trimmed);
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const shouldSendRef = useRef(false);

  // ── Audio Recording Logic ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      shouldSendRef.current = false;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (shouldSendRef.current) {
          const mimeType = mediaRecorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const reader = new FileReader();

          reader.onloadend = () => {
            const base64Audio = reader.result as string;
            if (onSendAudioMessage && base64Audio) {
              onSendAudioMessage(base64Audio);
            }
          };

          reader.readAsDataURL(audioBlob);
        }

        // Clean up tracks
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        setRecordingSeconds(0);
        audioChunksRef.current = [];
        shouldSendRef.current = false;
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Accès au microphone refusé ou non supporté:", err);
      alert("Impossible d'accéder au microphone.");
    }
  };

  const cancelRecording = () => {
    shouldSendRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      setIsRecording(false);
      setRecordingSeconds(0);
      audioChunksRef.current = [];
    }
  };

  const stopAndSendRecording = () => {
    shouldSendRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const formatRecordingTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const canSend = message.trim().length > 0 && !isSending && !disabled;

  if (disabled) {
    return (
      <div className="px-4 py-3 bg-brand-canvas dark:bg-background border-t border-border/80 shrink-0">
        <div className="flex items-center justify-center gap-2 py-2 px-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-300 text-[12px]">
          <span className="font-medium">
            L'envoi de message est désactivé car aucune mission active ne vous lie à cet utilisateur.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 bg-white dark:bg-card border-t border-border shrink-0">
      {isRecording ? (
        /* ── Audio Recording UI ── */
        <div className="flex items-center gap-3 bg-red-50/80 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl px-4 py-2">
          {/* Pulsing red dot */}
          <div className="relative flex items-center justify-center shrink-0">
            <span className="absolute w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75" />
            <span className="w-2.5 h-2.5 bg-red-600 rounded-full" />
          </div>

          {/* Recording timer */}
          <span className="text-[12px] font-mono font-bold text-red-700 dark:text-red-300 shrink-0">
            {formatRecordingTime(recordingSeconds)}
          </span>

          {/* Animated sound wave bars */}
          <div className="flex-1 flex items-center justify-center gap-1 h-5 px-2 overflow-hidden">
            {[40, 80, 50, 90, 30, 70, 100, 60, 80, 40, 90, 50, 70, 30, 60].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-red-400/60 rounded-full animate-pulse"
                style={{
                  height: `${h}%`,
                  animationDuration: `${0.4 + (i % 5) * 0.1}s`,
                }}
              />
            ))}
          </div>

          {/* Cancel button */}
          <button
            type="button"
            onClick={cancelRecording}
            className="p-1.5 rounded-full text-muted-foreground hover:text-red-600 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
            title="Annuler l'enregistrement"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Send Audio button */}
          <button
            type="button"
            onClick={stopAndSendRecording}
            className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-transform active:scale-95 cursor-pointer shrink-0"
            title="Envoyer le message vocal"
          >
            <Send className="w-3.5 h-3.5" style={{ transform: 'translateX(1px)' }} />
          </button>
        </div>
      ) : (
        /* ── Standard Text Input UI ── */
        <div className="flex items-end gap-2">
          <div className="flex-1 flex items-end bg-brand-canvas/80 dark:bg-background/80 border border-border/80 rounded-2xl px-3.5 py-1.5 transition-all focus-within:border-brand-violet/30 dark:focus-within:border-violet-300/40 focus-within:ring-1.5 focus-within:ring-brand-violet/10 dark:focus-within:ring-violet-300/40">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ecrivez votre message..."
              rows={1}
              disabled={disabled}
              className="flex-1 bg-transparent text-[12.5px] text-brand-ink dark:text-foreground placeholder:text-muted-foreground resize-none focus:outline-none min-h-[28px] max-h-[120px] py-1 leading-snug"
            />

            {/* Emoji button */}
            <button
              type="button"
              className="p-1 text-muted-foreground hover:text-neutral-600 dark:hover:text-muted-foreground transition-colors cursor-pointer shrink-0 mb-0.5"
              title="Emoji"
            >
              <Smile className="w-4.5 h-4.5" strokeWidth={1.6} />
            </button>
          </div>

          {/* Microphone button (when message is empty) or Send button (when message is typed) */}
          {message.trim().length === 0 ? (
            <button
              type="button"
              onClick={startRecording}
              disabled={disabled}
              className="w-9 h-9 rounded-full bg-brand-violet hover:bg-brand-violet text-white flex items-center justify-center transition-all duration-200 shrink-0 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
              title="Enregistrer un message vocal"
            >
              <Mic className="w-4 h-4" strokeWidth={2} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={`
                w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 cursor-pointer
                ${canSend
                  ? 'bg-brand-green hover:bg-brand-green-hover text-brand-ink dark:text-primary-foreground shadow-md shadow-brand-green/20 hover:shadow-lg hover:shadow-brand-green/30 active:scale-95'
                  : 'bg-neutral-200 dark:bg-muted text-muted-foreground cursor-not-allowed'
                }
              `}
              title="Envoyer"
            >
              <Send className="w-4 h-4" strokeWidth={2} style={{ transform: 'translateX(1px)' }} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageInput;
