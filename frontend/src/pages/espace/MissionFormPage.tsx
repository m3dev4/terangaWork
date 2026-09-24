import React, { useEffect, useState } from "react";
import {
  useQueryClient,
  useMutation as useReactMutation,
  useQuery as useReactQuery,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Code2,
  Loader2,
  Plus,
  WalletCards,
  X,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createMission,
  getMission,
  getMissionServices,
  type MissionPayload,
  type PaymentOperator,
  updateMission,
} from "../../api/missionsApi";
import { fetchTechnologies } from "../../api/freelanceApi";
import { getErrorMessage } from "../../utils/errorMessage";

const initialForm: MissionPayload = {
  title: "",
  description: "",
  date_deadline: "",
  operateurMobileMoney: "WAVE",
  budget: 0,
  service: 0,
  technologies: [],
};

const inputClass =
  "w-full rounded-md border border-[#e8e5df] bg-white px-3 py-2.5 text-[12px] text-[#252525] outline-none transition focus:border-[#1b4b6b] focus:ring-2 focus:ring-[#1b4b6b]/10";

const MissionFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { missionId } = useParams();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<MissionPayload>(initialForm);
  const [selectedTechs, setSelectedTechs] = useState<number[]>([]);
  const [error, setError] = useState("");

  const servicesQuery = useReactQuery({
    queryKey: ["mission-services"],
    queryFn: getMissionServices,
  });

  const techsQuery = useReactQuery({
    queryKey: ["technologiesList"],
    queryFn: fetchTechnologies,
  });

  const missionQuery = useReactQuery({
    queryKey: ["mission", missionId],
    queryFn: () => getMission(Number(missionId)),
    enabled: Boolean(missionId),
  });

  useEffect(() => {
    if (missionQuery.data) {
      setForm({
        title: missionQuery.data.title,
        description: missionQuery.data.description,
        date_deadline: missionQuery.data.date_deadline || "",
        operateurMobileMoney: missionQuery.data.operateurMobileMoney,
        budget: missionQuery.data.budget,
        service: missionQuery.data.service,
        technologies: missionQuery.data.technologies || [],
      });
      if (missionQuery.data.technologies) {
        setSelectedTechs(missionQuery.data.technologies);
      }
    }
  }, [missionQuery.data]);

  const createMutation = useReactMutation({
    mutationFn: (payload: MissionPayload) =>
      missionId
        ? updateMission({ id: Number(missionId), payload })
        : createMission(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      navigate("/espace/mes-annonces");
    },
    onError: (mutationError) => {
      setError(
        getErrorMessage(mutationError, "Impossible de publier l'annonce.")
      );
    },
  });

  const updateField = <K extends keyof MissionPayload>(
    field: K,
    value: MissionPayload[K]
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const toggleTech = (techId: number) => {
    if (selectedTechs.includes(techId)) {
      setSelectedTechs(selectedTechs.filter((id) => id !== techId));
    } else {
      setSelectedTechs([...selectedTechs, techId]);
    }
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.date_deadline ||
      !form.budget ||
      !form.service
    ) {
      setError("Complétez tous les champs obligatoires avant de publier.");
      return;
    }
    createMutation.mutate({
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      technologies: selectedTechs,
    });
  };

  return (
    <div className="mx-auto max-w-[760px] pb-8">
      <button
        type="button"
        onClick={() => navigate("/espace/mes-annonces")}
        className="mb-4 inline-flex items-center gap-2 text-[11px] font-medium text-neutral-500 hover:text-[#1b4b6b]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Retour à mes annonces
      </button>

      <form
        onSubmit={submit}
        className="overflow-hidden rounded-lg border border-[#ebe8e2] bg-white shadow-[0_8px_30px_rgba(31,42,48,0.04)]"
      >
        <div className="border-b border-[#f0ede8] px-5 py-4 sm:px-7">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f2994a]">
            Nouvelle annonce
          </p>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[#20252a]">
            Détails de l'annonce
          </h1>
          <p className="mt-1 text-[11px] text-neutral-400">
            Présentez clairement votre besoin et les technologies requises pour
            attirer les bons profils.
          </p>
        </div>

        <div className="space-y-5 px-5 py-6 sm:px-7">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold text-neutral-700">
              Titre de l'annonce <span className="text-[#f2994a]">*</span>
            </span>
            <input
              className={inputClass}
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Ex : Développeur Full-Stack pour refonte de site"
              maxLength={100}
            />
          </label>

          <label className="block">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-700">
                Description <span className="text-[#f2994a]">*</span>
              </span>
              <span className="text-[10px] text-neutral-400">
                {form.description.length} / 1000 caractères
              </span>
            </div>
            <textarea
              className={`${inputClass} min-h-[125px] resize-y`}
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="Décrivez votre projet en détail..."
              maxLength={1000}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold text-neutral-700">
                Budget estimé <span className="text-[#f2994a]">*</span>
              </span>
              <div className="relative">
                <input
                  className={`${inputClass} pr-16`}
                  type="number"
                  min="1"
                  value={form.budget || ""}
                  onChange={(event) =>
                    updateField("budget", Number(event.target.value))
                  }
                  placeholder="0"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-neutral-400">
                  FCFA
                </span>
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold text-neutral-700">
                Date limite <span className="text-[#f2994a]">*</span>
              </span>
              <div className="relative">
                <input
                  className={`${inputClass} pr-9`}
                  type="date"
                  value={form.date_deadline}
                  onChange={(event) =>
                    updateField("date_deadline", event.target.value)
                  }
                />
                <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              </div>
            </label>
          </div>

          {/* Service Requis */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-700">
                Service requis <span className="text-[#f2994a]">*</span>
              </span>
              <span className="text-[10px] text-neutral-400">
                Un service par annonce
              </span>
            </div>
            {servicesQuery.isLoading ? (
              <div className="text-[11px] text-neutral-400">
                Chargement des services...
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {servicesQuery.data?.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => updateField("service", service.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-medium transition cursor-pointer ${
                      form.service === service.id
                        ? "border-[#1b4b6b] bg-[#1b4b6b] text-white"
                        : "border-[#e7e3dc] bg-white text-neutral-600 hover:border-[#1b4b6b]"
                    }`}
                  >
                    {form.service === service.id && (
                      <Check className="h-3 w-3" />
                    )}
                    {service.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Technologies Requises */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-700">
                Technologies & Stack Requis
              </span>
              <span className="text-[10px] text-neutral-400">
                Sélectionnez 1 ou plusieurs technologies
              </span>
            </div>
            {techsQuery.isLoading ? (
              <div className="text-[11px] text-neutral-400">
                Chargement des technologies...
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {techsQuery.data?.map((tech) => {
                  const isSelected = selectedTechs.includes(tech.id);
                  return (
                    <button
                      key={tech.id}
                      type="button"
                      onClick={() => toggleTech(tech.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold transition cursor-pointer ${
                        isSelected
                          ? "border-[#1b4b6b] bg-[#1b4b6b] text-white shadow-xs"
                          : "border-[#e7e3dc] bg-white text-neutral-700 hover:border-neutral-400"
                      }`}
                    >
                      {tech.imgUrl ? (
                        <img
                          src={tech.imgUrl}
                          alt={tech.name}
                          className="h-3 w-3 object-contain"
                        />
                      ) : (
                        <Code2 className="h-3 w-3 text-[#f2994a]" />
                      )}
                      {tech.name}
                      {isSelected ? (
                        <X className="h-3 w-3 ml-0.5 text-white/80" />
                      ) : (
                        <Plus className="h-3 w-3 ml-0.5 text-neutral-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <span className="mb-2 block text-[11px] font-semibold text-neutral-700">
              Mode de paiement souhaité
            </span>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["WAVE", "Wave", "bg-[#e8f7fb]"],
                  ["OM", "Orange Money", "bg-[#fff0e9]"],
                ] as const
              ).map(([value, label, color]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    updateField(
                      "operateurMobileMoney",
                      value as PaymentOperator
                    )
                  }
                  className={`relative flex items-center gap-3 rounded-md border p-3 text-left transition cursor-pointer ${
                    form.operateurMobileMoney === value
                      ? "border-[#1b4b6b] ring-1 ring-[#1b4b6b]"
                      : "border-[#e7e3dc] hover:border-[#c9c2b9]"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${color}`}
                  >
                    <WalletCards className="h-4 w-4 text-[#1b4b6b]" />
                  </span>
                  <span className="text-[11px] font-semibold text-neutral-800">
                    {label}
                  </span>
                  {form.operateurMobileMoney === value && (
                    <Check className="absolute right-3 h-3.5 w-3.5 text-[#1b4b6b]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {(error || servicesQuery.isError) && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-[11px] text-red-600">
              {error || "Impossible de charger les services."}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-[#f0ede8] bg-[#fcfbf9] px-5 py-4 sm:flex-row sm:items-center sm:px-7">
          <button
            type="button"
            onClick={() => navigate("/espace/mes-annonces")}
            className="text-[11px] font-medium text-neutral-500 hover:text-neutral-800 cursor-pointer"
          >
            Annuler
          </button>
          <button
            disabled={createMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#f2994a] px-5 py-2.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#df853a] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {createMutation.isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}{" "}
            Publier l'annonce
          </button>
        </div>
      </form>
    </div>
  );
};

export default MissionFormPage;
