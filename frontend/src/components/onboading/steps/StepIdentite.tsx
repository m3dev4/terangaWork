import React, { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "../../ui/button";



interface StepIdentiteProps {
  initialData?: {
    first_name?: string;
    last_name?: string;
    number_phone?: string;
  };
  stepNumber: number;
  totalSteps: number;
  onSubmit: (data: {
    first_name: string;
    last_name: string;
    number_phone: string;
  }) => void;
  isLoading?: boolean;
}

export const StepIdentite: React.FC<StepIdentiteProps> = ({
  initialData,
  stepNumber,
  totalSteps,
  onSubmit,
  isLoading = false,
}) => {
  const [firstName, setFirstName] = useState(initialData?.first_name || "");
  const [lastName, setLastName] = useState(initialData?.last_name || "");
  const [phoneNumber, setPhoneNumber] = useState(
    initialData?.number_phone || ""
  );
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (initialData?.first_name) setFirstName(initialData.first_name);
    if (initialData?.last_name) setLastName(initialData.last_name);
    if (initialData?.number_phone) setPhoneNumber(initialData.number_phone);
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phoneNumber.trim()) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    setError("");
    onSubmit({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      number_phone: phoneNumber.trim(),
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
        Commençons par faire connaissance
      </h1>
      <p className="text-[#111118]/50 text-sm sm:text-base mb-8">
        Entrez vos informations personnelles pour créer votre compte.
      </p>

      {error && (
        <div className="mb-6 p-3.5 rounded-xl bg-[#D95C38]/10 border border-[#D95C38]/25 text-[#c14f2f] text-sm">
          {error}
        </div>
      )}

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#111118]/80 mb-2">
              Prénom
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="ex : Jean"
              className="w-full px-4 py-3 rounded-xl border border-[#111118]/12 focus:outline-none focus:ring-2 focus:ring-[#D95C38]/15 focus:border-[#D95C38] transition-all placeholder:text-[#111118]/25 text-[#111118]"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#111118]/80 mb-2">
              Nom
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="ex : Dupont"
              className="w-full px-4 py-3 rounded-xl border border-[#111118]/12 focus:outline-none focus:ring-2 focus:ring-[#D95C38]/15 focus:border-[#D95C38] transition-all placeholder:text-[#111118]/25 text-[#111118]"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#111118]/80 mb-2">
            Numéro de téléphone
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="ex : 07 12 34 56 78"
            className="w-full px-4 py-3 rounded-xl border border-[#111118]/12 focus:outline-none focus:ring-2 focus:ring-[#D95C38]/15 focus:border-[#D95C38] transition-all placeholder:text-[#111118]/25 text-[#111118]"
            required
          />
        </div>

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-[#D95C38] hover:bg-[#c14f2f] text-white font-medium transition-all duration-150 disabled:opacity-50 cursor-pointer"
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
      </form>
    </div>
  );
};
