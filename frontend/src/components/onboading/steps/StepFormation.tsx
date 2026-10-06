import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';

interface FormationItem {
  nom: string;
  role: 'universitaire' | 'formation_professionnelle' | 'en_ligne';
  etablissement?: string;
  intitule?: string;
  date_obtention: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  lien_verification?: string;
}

interface StepFormationProps {
  initialData?: FormationItem[];
  stepNumber: number;
  totalSteps: number;
  onBack: () => void;
  onSkip: () => void;
  onSubmit: (data: FormationItem[]) => void;
  isLoading?: boolean;
}

export const StepFormation: React.FC<StepFormationProps> = ({
  initialData = [],
  stepNumber,
  totalSteps,
  onBack,
  onSkip,
  onSubmit,
  isLoading = false,
}) => {
  const [formations, setFormations] = useState<FormationItem[]>(
    initialData.length > 0
      ? initialData
      : [
          {
            nom: '',
            role: 'universitaire',
            etablissement: '',
            intitule: '',
            date_obtention: '',
            startDate: '',
            current: false,
          },
        ]
  );

  const addFormation = () => {
    setFormations((prev) => [
      ...prev,
      {
        nom: '',
        role: 'universitaire',
        etablissement: '',
        intitule: '',
        date_obtention: '',
        startDate: '',
        current: false,
      },
    ]);
  };

  const removeFormation = (index: number) => {
    setFormations((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFormation = (index: number, field: keyof FormationItem, value: any) => {
    setFormations((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = formations.filter((f) => f.nom && f.role && f.date_obtention);
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
          Éducation & Formations
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
        Ajoutez vos diplômes ou certifications (optionnel).
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
          {formations.map((item, index) => (
            <div
              key={index}
              className="p-4 rounded-2xl border border-border bg-white space-y-3 relative"
            >
              {formations.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeFormation(index)}
                  className="absolute top-3 right-3 text-muted-foreground hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <div>
                <label className="block text-xs font-semibold text-brand-ink mb-1">
                  Type de formation
                </label>
                <select
                  value={item.role}
                  onChange={(e) => updateFormation(index, 'role', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border focus:outline-none focus:border-brand-violet bg-white"
                >
                  <option value="universitaire">Universitaire</option>
                  <option value="formation_professionnelle">Formation Professionnelle</option>
                  <option value="en_ligne">En ligne / Certification</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-ink mb-1">
                    Nom du diplôme / formation
                  </label>
                  <input
                    type="text"
                    value={item.nom}
                    onChange={(e) => {
                      updateFormation(index, 'nom', e.target.value);
                      updateFormation(index, 'intitule', e.target.value);
                    }}
                    placeholder="Ex: Master Informatique"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-border focus:outline-none focus:border-brand-violet"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-ink mb-1">
                    Établissement
                  </label>
                  <input
                    type="text"
                    value={item.etablissement || ''}
                    onChange={(e) => updateFormation(index, 'etablissement', e.target.value)}
                    placeholder="Ex: Université de Paris"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-border focus:outline-none focus:border-brand-violet"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-brand-ink mb-1">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={item.startDate || ''}
                    onChange={(e) => updateFormation(index, 'startDate', e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-border focus:outline-none focus:border-brand-violet"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-brand-ink mb-1">
                    Date d'obtention
                  </label>
                  <input
                    type="date"
                    value={item.date_obtention}
                    onChange={(e) => updateFormation(index, 'date_obtention', e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-border focus:outline-none focus:border-brand-violet"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addFormation}
          className="w-full py-2.5 rounded-xl border border-dashed border-neutral-300 text-neutral-600 hover:text-brand-ink hover:border-neutral-400 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter une autre formation</span>
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
