import { Bot, Plus } from "lucide-react";

// ── État vide (aucune conversation sélectionnée) ─────────────────────────
interface EmptyAssistantProps {
  onCreate: () => void;
  isCreating: boolean;
}

const EmptyAssistant: React.FC<EmptyAssistantProps> = ({ onCreate, isCreating }) => {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-y-auto bg-white px-6 py-12 text-center">
      <div className="mb-5 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#111118]">
        <Bot className="h-8 w-8 text-[#E7B84B]" />
      </div>
      <h2 className="mb-2 text-base font-bold text-[#111118]">Discutez avec votre assistant</h2>
      <p className="mb-6 max-w-md text-sm text-[#111118]/50">
        L'assistant est connecté à vos données Malaw : candidatures, missions, paiements et recommandations personnalisées.
      </p>
      <button
        type="button"
        onClick={onCreate}
        disabled={isCreating}
        className="inline-flex items-center gap-2 rounded-xl bg-[#D95C38] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c14f2f] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        {isCreating ? 'Création…' : 'Démarrer une conversation'}
      </button>
    </div>
  );
};

export default EmptyAssistant;
