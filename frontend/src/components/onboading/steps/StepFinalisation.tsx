import React, { useState, useRef } from "react";
import {
  Upload,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  User as UserIcon,
} from "lucide-react";
import { getMediaUrl } from "../../../utils/getMediaUrl";

interface StepFinalisationProps {
  role?: "freelance" | "annonceur" | null;
  initialData?: {
    githubUrl?: string;
    profile_picture?: string | null;
  };
  stepNumber: number;
  totalSteps: number;
  onBack: () => void;
  onSubmit: (data: {
    profile_picture?: File | null;
    githubUrl?: string;
  }) => void;
  isLoading?: boolean;
}

export const StepFinalisation: React.FC<StepFinalisationProps> = ({
  role = "freelance",
  initialData,
  stepNumber,
  totalSteps,
  onBack,
  onSubmit,
  isLoading = false,
}) => {
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialData?.profile_picture
      ? getMediaUrl(initialData.profile_picture)
      : null
  );
  const [githubUrl, setGithubUrl] = useState(initialData?.githubUrl || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      profile_picture: photo,
      githubUrl: githubUrl.trim(),
    });
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col justify-center">
      <div className="mb-4">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-orange-50 text-brand-violet border border-orange-100">
          Étape {stepNumber} sur {totalSteps}
        </span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-brand-ink tracking-tight mb-2">
        {role === "annonceur"
          ? "Dernière étape : logo ou photo"
          : "Dernière étape : votre photo de profil"}
      </h1>
      <p className="text-muted-foreground text-sm sm:text-base mb-8">
        {role === "annonceur"
          ? "Ajoutez le logo de votre entreprise ou votre photo de profil pour inspirer confiance aux freelances."
          : "Ajoutez une photo professionnelle pour humaniser vos échanges sur la plateforme."}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo Upload Card */}
        <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl border border-border bg-white">
          <div className="relative w-24 h-24 rounded-full overflow-hidden bg-neutral-100 border-2 border-border flex items-center justify-center shrink-0">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Aperçu profil"
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-10 h-10 text-muted-foreground" />
            )}
          </div>

          <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-brand-ink text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>
                {previewUrl ? "Changer la photo" : "Importer une photo"}
              </span>
            </button>
            <p className="text-xs text-muted-foreground">
              JPG, PNG ou WEBP. Max 5 Mo.
            </p>
          </div>
        </div>

        {/* GitHub link for Freelance */}
        {role === "freelance" && (
          <div>
            <label className="block text-sm font-semibold text-brand-ink mb-2">
              Lien GitHub / Portfolio (optionnel)
            </label>
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/mon-profil"
              className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet transition-all placeholder:text-neutral-300 text-brand-ink text-sm"
            />
          </div>
        )}

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
                <span>Finalisation...</span>
              </>
            ) : (
              <>
                <span>Terminer</span>
                <CheckCircle2 className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
