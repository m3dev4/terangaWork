import React, { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Link as LinkIcon,
} from "lucide-react";

interface RealisationItem {
  title: string;
  description: string;
  link?: string;
}

interface StepRealisationsProps {
  initialData?: RealisationItem[];
  stepNumber: number;
  totalSteps: number;
  onBack: () => void;
  onSkip: () => void;
  onSubmit: (data: RealisationItem[]) => void;
  isLoading?: boolean;
}

export const StepRealisations: React.FC<StepRealisationsProps> = ({
  initialData = [],
  stepNumber,
  totalSteps,
  onBack,
  onSkip,
  onSubmit,
  isLoading = false,
}) => {
  const [realisations, setRealisations] = useState<RealisationItem[]>(
    initialData.length > 0
      ? initialData
      : [
          {
            title: "",
            description: "",
            link: "",
          },
        ]
  );

  const addRealisation = () => {
    setRealisations((prev) => [
      ...prev,
      {
        title: "",
        description: "",
        link: "",
      },
    ]);
  };

  const removeRealisation = (index: number) => {
    setRealisations((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRealisation = (
    index: number,
    field: keyof RealisationItem,
    value: string
  ) => {
    setRealisations((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = realisations.filter(
      (r) => r.title.trim() && r.description.trim()
    );
    if (valid.length === 0) {
      onSkip();
      return;
    }
    onSubmit(valid);
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col justify-center">
      <div className="mb-4">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-orange-50 text-brand-violet border border-orange-100">
          Étape {stepNumber} sur {totalSteps}
        </span>
      </div>

      <div className="flex items-start justify-between mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-ink tracking-tight">
          Vos réalisations & Portfolio
        </h1>
        <button
          type="button"
          onClick={onSkip}
          className="text-xs font-semibold text-muted-foreground hover:text-brand-ink underline cursor-pointer mt-1"
        >
          Passer
        </button>
      </div>
      <p className="text-muted-foreground text-sm mb-6">
        Partagez vos meilleurs projets pour séduire les annonceurs (optionnel).
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
          {realisations.map((item, index) => (
            <div
              key={index}
              className="p-4 rounded-2xl border border-border bg-white space-y-3 relative"
            >
              {realisations.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRealisation(index)}
                  className="absolute top-3 right-3 text-muted-foreground hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <div>
                <label className="block text-xs font-semibold text-brand-ink mb-1">
                  Titre du projet
                </label>
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) =>
                    updateRealisation(index, "title", e.target.value)
                  }
                  placeholder="Ex: Refonte SaaS Dashboard"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border focus:outline-none focus:border-brand-violet"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-ink mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={item.description}
                  onChange={(e) =>
                    updateRealisation(index, "description", e.target.value)
                  }
                  placeholder="Ce que vous avez apporté, technologies utilisées..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border focus:outline-none focus:border-brand-violet resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-ink mb-1 flex items-center gap-1">
                  <LinkIcon className="w-3 h-3" />
                  <span>Lien vers le projet (URL)</span>
                </label>
                <input
                  type="url"
                  value={item.link || ""}
                  onChange={(e) =>
                    updateRealisation(index, "link", e.target.value)
                  }
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border focus:outline-none focus:border-brand-violet"
                />
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addRealisation}
          className="w-full py-2.5 rounded-xl border border-dashed border-neutral-300 text-neutral-600 hover:text-brand-ink hover:border-neutral-400 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un autre projet</span>
        </button>

        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-white text-brand-ink font-medium hover:bg-brand-canvas transition-colors cursor-pointer text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-ink font-medium shadow-sm transition-all duration-150 disabled:opacity-50 cursor-pointer text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Chargement...</span>
              </>
            ) : (
              <>
                <span>Continuer</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
