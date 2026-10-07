import { useEffect, useRef, useState } from "react";

// ── Effet de frappe pour les réponses de l'assistant ────────────────────
interface TypingAssistantMessageProps {
  fullText: string;
  onComplete?: () => void;
}

const TypingAssistantMessage: React.FC<TypingAssistantMessageProps> = ({
  fullText,
  onComplete,
}) => {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    if (!fullText) return;
    indexRef.current = 0;
    setDisplayed("");
    const timer = setInterval(() => {
      indexRef.current += 1;
      if (indexRef.current >= fullText.length) {
        setDisplayed(fullText);
        clearInterval(timer);
        onComplete?.();
      } else {
        setDisplayed(fullText.slice(0, indexRef.current));
      }
    }, 15);
    return () => clearInterval(timer);
  }, [fullText, onComplete]);

  return (
    <div className="whitespace-pre-wrap break-words">
      {displayed}
      {displayed.length < fullText.length && (
        <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-brand-green" />
      )}
    </div>
  );
};

export default TypingAssistantMessage;
