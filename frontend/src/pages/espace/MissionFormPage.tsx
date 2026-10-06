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
  Sparkles,
  WalletCards,
  X,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createMission,
  generateMissionDescription,
  getMission,
  getMissionServices,
  type MissionPayload,
  type PaymentOperator,
  updateMission,
} from "../../api/missionsApi";
import { fetchTechnologies } from "../../api/freelanceApi";
import { getErrorMessage } from "../../utils/errorMessage";
import {
  getTodayDate,
  MissionValidation,
  MissionTitleValidation,
  type MissionFormErrors,
} from "../../validations/missionValidation";
import { omIcon, waveIcon } from "@/assets/images";

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
  "w-full rounded-md border border-border bg-white dark:bg-card px-3 py-2.5 text-[12px] text-[#252525] dark:text-foreground outline-none transition focus:border-brand-violet dark:focus:border-violet-300 focus:ring-2 focus:ring-brand-violet/10 dark:focus:ring-violet-300/40";

const MissionFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { missionId } = useParams();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<MissionPayload>(initialForm);
  const [selectedTechs, setSelectedTechs] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<MissionFormErrors>({});

  const fieldError = (field: keyof MissionFormErrors) =>
    fieldErrors[field] ? (
      <p
        id={`${field}-error`}
        role="alert"
        className="mt-1 text-[11px] text-red-600 dark:text-red-300"
      >
        {fieldErrors[field]}
      </p>
    ) : null;

  const fieldAccessibility = (field: keyof MissionFormErrors) => ({
    "aria-invalid": Boolean(fieldErrors[field]),
    "aria-describedby": fieldErrors[field] ? `${field}-error` : undefined,
  });

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

  const generateDescriptionMutation = useReactMutation({
    mutationFn: (title: string) => generateMissionDescription(title),
    onSuccess: (generatedDescription) => {
      updateField("description", generatedDescription);
    },
    onError: (mutationError) => {
      setError(
        getErrorMessage(
          mutationError,
          "La génération de la description a échoué."
        )
      );
    },
  });

  const updateField = <K extends keyof MissionPayload>(
    field: K,
    value: MissionPayload[K]
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setError("");
  };

  const toggleTech = (techId: number) => {
    setFieldErrors((current) => ({ ...current, technologies: undefined }));
    if (selectedTechs.includes(techId)) {
      setSelectedTechs(selectedTechs.filter((id) => id !== techId));
    } else {
      setSelectedTechs([...selectedTechs, techId]);
    }
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createMutation.isPending || generateDescriptionMutation.isPending)
      return;
    setError("");
    const result = MissionValidation.safeParse({
      ...form,
      technologies: selectedTechs,
    });
    if (!result.success) {
      const errors: MissionFormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof MissionFormErrors;
        if (!errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    createMutation.mutate(result.data);
  };

  return (
    <div className="mx-auto max-w-[760px] pb-8">
      <button
        type="button"
        onClick={() => navigate("/espace/mes-annonces")}
        className="mb-4 inline-flex items-center gap-2 text-[11px] font-medium text-muted-foreground hover:text-brand-ink dark:hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Retour à mes annonces
      </button>

      <form
        noValidate
        onSubmit={submit}
        className="overflow-hidden rounded-lg border border-brand-sand dark:border-border bg-white dark:bg-card shadow-[0_8px_30px_rgba(31,42,48,0.04)]"
      >
        <div className="border-b border-brand-sand dark:border-border px-5 py-4 sm:px-7">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-violet dark:text-violet-300">
            Nouvelle annonce
          </p>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[#20252a] dark:text-foreground">
            Détails de l'annonce
          </h1>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Présentez clairement votre besoin et les technologies requises pour
            attirer les bons profils.
          </p>
        </div>

        <div className="space-y-5 px-5 py-6 sm:px-7">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold text-brand-ink dark:text-foreground">
              Titre de l'annonce{" "}
              <span className="text-brand-violet dark:text-violet-300">*</span>
            </span>
            <input
              {...fieldAccessibility("title")}
              className={inputClass}
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Ex : Développeur Full-Stack pour refonte de site"
              maxLength={100}
            />
            {fieldError("title")}
          </label>

          <label className="block">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-brand-ink dark:text-foreground">
                Description{" "}
                <span className="text-brand-violet dark:text-violet-300">
                  *
                </span>
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={
                    generateDescriptionMutation.isPending || !form.title.trim()
                  }
                  onClick={() => {
                    const result = MissionTitleValidation.safeParse(form.title);
                    if (!result.success) {
                      setFieldErrors((current) => ({
                        ...current,
                        title: result.error.issues[0].message,
                      }));
                      return;
                    }
                    setError("");
                    generateDescriptionMutation.mutate(result.data);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-ink px-3 py-1 text-[10px] font-semibold text-brand-green transition hover:bg-brand-ink/85 dark:hover:bg-black/65 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-xs"
                  title={
                    !form.title.trim()
                      ? "Saisissez un titre pour générer une description par l'IA"
                      : "Générer la description automatiquement via l'IA"
                  }
                >
                  {generateDescriptionMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin text-brand-green" />
                  ) : (
                    <Sparkles className="h-3 w-3 text-brand-green" />
                  )}
                  <span>
                    {generateDescriptionMutation.isPending
                      ? "Génération en cours..."
                      : "Générer avec l'IA"}
                  </span>
                </button>
                <span className="text-[10px] text-muted-foreground">
                  {form.description.length} / 1000 caractères
                </span>
              </div>
            </div>
            <textarea
              {...fieldAccessibility("description")}
              className={`${inputClass} min-h-[140px] resize-y`}
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="Décrivez votre projet en détail... Ou saisissez un titre et cliquez sur 'Générer avec l'IA'."
              maxLength={1000}
            />
            {fieldError("description")}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold text-brand-ink dark:text-foreground">
                Budget estimé{" "}
                <span className="text-brand-violet dark:text-violet-300">
                  *
                </span>
              </span>
              <div className="relative">
                <input
                  className={`${inputClass} pr-16`}
                  type="number"
                  {...fieldAccessibility("budget")}
                  min="1"
                  step="1"
                  value={form.budget || ""}
                  onChange={(event) =>
                    updateField("budget", Number(event.target.value))
                  }
                  placeholder="0"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground">
                  FCFA
                </span>
              </div>
              {fieldError("budget")}
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold text-brand-ink dark:text-foreground">
                Date limite{" "}
                <span className="text-brand-violet dark:text-violet-300">
                  *
                </span>
              </span>
              <div className="relative">
                <input
                  className={`${inputClass} pr-9`}
                  type="date"
                  {...fieldAccessibility("date_deadline")}
                  min={getTodayDate()}
                  value={form.date_deadline}
                  onChange={(event) =>
                    updateField("date_deadline", event.target.value)
                  }
                />
                <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
              {fieldError("date_deadline")}
            </label>
          </div>

          {/* Service Requis */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-brand-ink dark:text-foreground">
                Service requis{" "}
                <span className="text-brand-violet dark:text-violet-300">
                  *
                </span>
              </span>
              <span className="text-[10px] text-muted-foreground">
                Un service par annonce
              </span>
            </div>
            {servicesQuery.isLoading ? (
              <div className="text-[11px] text-muted-foreground">
                Chargement des services...
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {servicesQuery.data?.map((service) => (
                  <button
                    key={service.id}
                    {...fieldAccessibility("service")}
                    type="button"
                    onClick={() => updateField("service", service.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-medium transition cursor-pointer ${
                      form.service === service.id
                        ? "border-brand-violet dark:border-violet-300 bg-brand-violet text-white"
                        : "border-border bg-white dark:bg-card text-neutral-600 dark:text-muted-foreground hover:border-brand-violet dark:hover:border-violet-300"
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
            {fieldError("service")}
          </div>

          {/* Technologies Requises */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-brand-ink dark:text-foreground">
                Technologies & Stack Requis
              </span>
              <span className="text-[10px] text-muted-foreground">
                Sélectionnez les technologies utiles (facultatif)
              </span>
            </div>
            {techsQuery.isLoading ? (
              <div className="text-[11px] text-muted-foreground">
                Chargement des technologies...
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {techsQuery.data?.map((tech) => {
                  const isSelected = selectedTechs.includes(tech.id);
                  return (
                    <button
                      key={tech.id}
                      {...fieldAccessibility("technologies")}
                      type="button"
                      onClick={() => toggleTech(tech.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold transition cursor-pointer ${
                        isSelected
                          ? "border-brand-violet dark:border-violet-300 bg-brand-violet text-white shadow-xs"
                          : "border-border bg-white dark:bg-card text-brand-ink dark:text-foreground hover:border-neutral-400 dark:hover:border-border"
                      }`}
                    >
                      {tech.imgUrl ? (
                        <img
                          src={tech.imgUrl}
                          alt={tech.name}
                          className="h-3 w-3 object-contain"
                        />
                      ) : (
                        <Code2 className="h-3 w-3 text-brand-violet dark:text-violet-300" />
                      )}
                      {tech.name}
                      {isSelected ? (
                        <X className="h-3 w-3 ml-0.5 text-white/80" />
                      ) : (
                        <Plus className="h-3 w-3 ml-0.5 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {fieldError("technologies")}
          </div>

          <div>
            <span className="mb-2 block text-[11px] font-semibold text-brand-ink dark:text-foreground">
              Mode de paiement souhaité
            </span>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["WAVE", "Wave", "bg-brand-canvas dark:bg-background"],
                  [
                    "OM",
                    "Orange Money",
                    "bg-brand-peach dark:bg-brand-peach/10",
                  ],
                ] as const
              ).map(([value, label, color]) => (
                <button
                  key={value}
                  {...fieldAccessibility("operateurMobileMoney")}
                  type="button"
                  onClick={() =>
                    updateField(
                      "operateurMobileMoney",
                      value as PaymentOperator
                    )
                  }
                  className={`relative flex items-center gap-3 rounded-md border p-3 text-left transition cursor-pointer ${
                    form.operateurMobileMoney === value
                      ? "border-brand-violet dark:border-violet-300 ring-1 ring-brand-violet dark:ring-violet-300"
                      : "border-border hover:border-border"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center relative rounded-full ${color}`}
                  >
                    {value === "WAVE" ? (
                      <img
                        src={waveIcon}
                        alt={label}
                        className="h-full w-full object-contain"
                      />
                    ) : value === "OM" ? (
                      <img
                        src={omIcon}
                        alt={label}
                        className="h-full w-full object-contain"
                      />
                    ) : null}
                  </span>
                  <span className="text-[11px] font-semibold text-brand-ink dark:text-foreground">
                    {label}
                  </span>
                  {form.operateurMobileMoney === value && (
                    <Check className="absolute right-3 h-3.5 w-3.5 text-brand-ink dark:text-foreground" />
                  )}
                </button>
              ))}
            </div>
            {fieldError("operateurMobileMoney")}
          </div>

          {(error || servicesQuery.isError) && (
            <p
              role="alert"
              className="rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-[11px] text-red-600 dark:text-red-300"
            >
              {error || "Impossible de charger les services."}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-brand-sand dark:border-border bg-brand-canvas dark:bg-background px-5 py-4 sm:flex-row sm:items-center sm:px-7">
          <button
            type="button"
            onClick={() => navigate("/espace/mes-annonces")}
            className="text-[11px] font-medium text-muted-foreground hover:text-brand-ink dark:hover:text-foreground cursor-pointer"
          >
            Annuler
          </button>
          <button
            disabled={
              createMutation.isPending || generateDescriptionMutation.isPending
            }
            className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-green px-5 py-2.5 text-[11px] font-semibold text-brand-ink dark:text-primary-foreground shadow-sm transition hover:bg-brand-green-hover disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
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
