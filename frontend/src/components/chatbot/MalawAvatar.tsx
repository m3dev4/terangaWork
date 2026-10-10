import malaw from "../../assets/images/malaw.jpg";

/**
 * Avatar de l'assistant Malaw.
 * Remplace l'icône Bot dans tout le chat (sauf la sidebar).
 * La taille s'adapte au contexte : en-tête, bulle de message, écran vide…
 */
const TAILLES = {
  xs: "h-7 w-7 rounded-lg",
  sm: "h-9 w-9 rounded-xl",
  md: "h-12 w-12 rounded-xl",
  lg: "h-14 w-14 rounded-2xl sm:h-16 sm:w-16",
} as const;

type Props = {
  size?: keyof typeof TAILLES;
  className?: string;
};

const MalawAvatar: React.FC<Props> = ({ size = "sm", className = "" }) => (
  <div
    className={`relative shrink-0 overflow-hidden bg-brand-ink ring-1 ring-brand-ink/10 dark:ring-border ${TAILLES[size]} ${className}`}
  >
    <img
      src={malaw}
      alt="Malaw, l'assistant TerangaWork"
      loading="lazy"
      draggable={false}
      className="h-full w-full object-cover object-center select-none"
    />
  </div>
);

export default MalawAvatar;
