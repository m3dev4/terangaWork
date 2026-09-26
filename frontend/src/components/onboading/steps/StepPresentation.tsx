import React, { useState } from "react";
import { Lightbulb, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";

// ── Palette commune au produit (annonceur / freelance / admin / onboarding) ─
// Encre #111118 · Terracotta #D95C38 · Jaune #E7B84B · Crème #F3EBDD

interface StepPresentationProps {
  initialData?: {
    title?: string;
    description?: string;
    githubUrl?: string;
    linkedinUrl?: string;
  };
  stepNumber: number;
  totalSteps: number;
  onBack: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    githubUrl?: string;
    linkedinUrl?: string;
  }) => void;
  isLoading?: boolean;
}

export const StepPresentation: React.FC<StepPresentationProps> = ({
  initialData,
  stepNumber,
  totalSteps,
  onBack,
  onSubmit,
  isLoading = false,
}) => {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (initialData?.title) setTitle(initialData.title);
    if (initialData?.description) setDescription(initialData.description);
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Le titre professionnel est obligatoire.");
      return;
    }
    if (description.trim().length < 20) {
      setError(
        "Veuillez fournir une description détaillée (au moins 20 caractères)."
      );
      return;
    }
    setError("");
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      githubUrl: initialData?.githubUrl || "",
      linkedinUrl: initialData?.linkedinUrl || "",
    });
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col justify-center">
      {/* Badge d'étape */}
      <div className="mb-4">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#F3EBDD] text-[#111118]/70">
          Étape {stepNumber} sur {totalSteps}
        </span>
      </div>

      {/* En-tête */}
      <h1 className="text-2xl sm:text-3xl font-bold text-[#111118] tracking-tight mb-2">
        Parlez-nous de vous
      </h1>
      <p className="text-[#111118]/50 text-sm sm:text-base mb-8">
        Présentez votre activité en quelques mots pour attirer les annonceurs.
      </p>

      {error && (
        <div className="mb-6 p-3.5 rounded-xl bg-[#D95C38]/10 border border-[#D95C38]/25 text-[#c14f2f] text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Titre du profil */}
        <div>
          <label className="block text-sm font-semibold text-[#111118]/80 mb-2">
            Titre du profil
          </label>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ex : Designer produit senior"
            className="w-full px-4 py-3 rounded-xl border border-[#111118]/12 focus:outline-none focus:ring-2 focus:ring-[#D95C38]/15 focus:border-[#D95C38] transition-all placeholder:text-[#111118]/25 text-[#111118] text-sm"
            required
          />
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-[#111118]/80">
              Description
            </label>
            <span className="text-[11px] font-semibold text-[#111118]/35">
              Min. 100 caractères
            </span>
          </div>
          <div className="relative">
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez votre parcours, vos points forts et ce que vous pouvez apporter à vos futurs clients..."
              className="w-full px-4 py-3 rounded-xl border border-[#111118]/12 focus:outline-none focus:ring-2 focus:ring-[#D95C38]/15 focus:border-[#D95C38] transition-all placeholder:text-[#111118]/25 text-[#111118] text-sm resize-none"
              maxLength={2000}
              required
            />
            <div className="absolute bottom-3 right-3 text-xs text-[#111118]/35">
              {description.length} / 2000
            </div>
          </div>
        </div>

        {/* Boutons de navigation */}
        <div className="flex items-center justify-between pt-4">
          <Button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#111118]/12 bg-white text-[#111118]/70 font-medium hover:bg-[#F3EBDD]/60 transition-colors cursor-pointer text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </Button>

          <Button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-[#D95C38] hover:bg-[#c14f2f] text-white font-medium transition-all duration-150 disabled:opacity-50 cursor-pointer text-sm"
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
          </Button>
        </div>

        {/* Conseil d'expert */}
        <div className="mt-8 p-4 rounded-2xl bg-[#F3EBDD]/50 border border-[#111118]/8 flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#D95C38] shrink-0">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-[#111118]">
              Conseil d'expert
            </h4>
            <p className="text-xs text-[#111118]/50">
              Les profils avec une description détaillée et un titre précis
              reçoivent en moyenne 4x plus de propositions directes.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};
