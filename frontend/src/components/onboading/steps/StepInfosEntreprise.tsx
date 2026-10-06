import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Loader2, Globe } from 'lucide-react';

interface StepInfosEntrepriseProps {
  initialData?: {
    company_name?: string;
    company_secteur?: string;
    company_website?: string;
  };
  stepNumber: number;
  totalSteps: number;
  onBack: () => void;
  onSubmit: (data: { company_name: string; company_secteur: string; company_website?: string }) => void;
  isLoading?: boolean;
}

export const StepInfosEntreprise: React.FC<StepInfosEntrepriseProps> = ({
  initialData,
  stepNumber,
  totalSteps,
  onBack,
  onSubmit,
  isLoading = false,
}) => {
  const [name, setName] = useState(initialData?.company_name || '');
  const [secteur, setSecteur] = useState(initialData?.company_secteur || '');
  const [website, setWebsite] = useState(initialData?.company_website || '');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (initialData?.company_name) setName(initialData.company_name);
    if (initialData?.company_secteur) setSecteur(initialData.company_secteur);
    if (initialData?.company_website) setWebsite(initialData.company_website);
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !secteur.trim()) {
      setError('Veuillez renseigner le nom et le secteur de votre entreprise.');
      return;
    }
    setError('');
    onSubmit({
      company_name: name.trim(),
      company_secteur: secteur.trim(),
      company_website: website.trim(),
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
        Informations sur votre entreprise
      </h1>
      <p className="text-muted-foreground text-sm sm:text-base mb-8">
        Présentez brièvement votre structure pour donner confiance aux freelances.
      </p>

      {error && (
        <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-brand-ink mb-2">
            Nom de l'entreprise / structure
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Teranga Work Studio SAS"
            className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet transition-all placeholder:text-neutral-300 text-brand-ink text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-brand-ink mb-2">
            Secteur d'activité
          </label>
          <input
            type="text"
            value={secteur}
            onChange={(e) => setSecteur(e.target.value)}
            placeholder="Ex: Tech, E-commerce, Santé, Finance..."
            className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet transition-all placeholder:text-neutral-300 text-brand-ink text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-brand-ink mb-2 flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <span>Site internet de l'entreprise (optionnel)</span>
          </label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://mon-entreprise.com"
            className="w-full px-4 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet transition-all placeholder:text-neutral-300 text-brand-ink text-sm"
          />
        </div>

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
