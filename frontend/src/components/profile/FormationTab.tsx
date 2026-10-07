import React, { useState } from "react";
import {
  GraduationCap,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  Calendar,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchEducations,
  createEducation,
  deleteEducation,
  type EducationData,
} from "../../api/freelanceApi";

export const FormationTab: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: educations = [], isLoading } = useQuery<EducationData[]>({
    queryKey: ["educations"],
    queryFn: fetchEducations,
  });

  const [isAdding, setIsAdding] = useState(false);
  const [role, setRole] = useState<
    "UNIVERSITAIRE" | "FORMATION_PROFESSIONNELLE" | "EN_LIGNE"
  >("UNIVERSITAIRE");
  const [nom, setNom] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [current, setCurrent] = useState(false);
  const [description, setDescription] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: Omit<EducationData, "id">) => createEducation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["educations"] });
      queryClient.invalidateQueries({ queryKey: ["freelanceProfile"] });
      setNom("");
      setStartDate("");
      setEndDate("");
      setCurrent(false);
      setDescription("");
      setIsAdding(false);
      setSuccessMsg("Formation ajoutée avec succès !");
      setTimeout(() => setSuccessMsg(""), 3000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEducation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["educations"] });
      queryClient.invalidateQueries({ queryKey: ["freelanceProfile"] });
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !startDate) return;

    createMutation.mutate({
      role,
      nom: nom.trim(),
      startDate,
      endDate: current ? null : endDate || null,
      current,
      description: description.trim(),
    });
  };

  const getRoleLabel = (r: string) => {
    switch (r) {
      case "UNIVERSITAIRE":
        return "Cursus Universitaire";
      case "FORMATION_PROFESSIONNELLE":
        return "Formation Professionnelle";
      case "EN_LIGNE":
        return "Certification En Ligne";
      default:
        return r;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-brand-ink dark:text-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-sand dark:border-border bg-white dark:bg-card p-6 sm:p-8 shadow-xs max-w-3xl space-y-6 text-[11px]">
      <div className="flex items-center justify-between border-b border-brand-sand dark:border-border pb-4">
        <div>
          <h3 className="font-heading text-xs font-bold text-brand-ink dark:text-foreground flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4 text-brand-ink dark:text-foreground" />{" "}
            Formations & Diplômes
          </h3>
          <p className="text-muted-foreground mt-0.5">
            Vos formations enregistrées en base de données backend.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-violet px-3.5 py-2 text-[11px] font-semibold text-white hover:bg-brand-violet cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter une formation
        </button>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-3 font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
          {successMsg}
        </div>
      )}

      {isAdding && (
        <form
          onSubmit={handleAdd}
          className="rounded-xl bg-brand-canvas dark:bg-background border border-border p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-600 dark:text-muted-foreground mb-1">
                Type de formation *
              </label>
              <select
                value={role}
                onChange={(e: any) => setRole(e.target.value)}
                className="w-full rounded-md border border-border bg-white dark:bg-card p-2 outline-none focus:border-brand-violet dark:focus:border-violet-300"
              >
                <option value="UNIVERSITAIRE">Universitaire</option>
                <option value="FORMATION_PROFESSIONNELLE">
                  Formation professionnelle
                </option>
                <option value="EN_LIGNE">En ligne / Certification</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-neutral-600 dark:text-muted-foreground mb-1">
                Intitulé / Diplôme *
              </label>
              <input
                type="text"
                required
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="ex: Master en Génie Logiciel"
                className="w-full rounded-md border border-border bg-white dark:bg-card p-2 outline-none focus:border-brand-violet dark:focus:border-violet-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-600 dark:text-muted-foreground mb-1">
                Date de début *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-border bg-white dark:bg-card p-2 outline-none focus:border-brand-violet dark:focus:border-violet-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-600 dark:text-muted-foreground mb-1">
                Date de fin
              </label>
              <input
                type="date"
                disabled={current}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border border-border bg-white dark:bg-card p-2 outline-none focus:border-brand-violet dark:focus:border-violet-300 disabled:bg-neutral-100 dark:disabled:bg-muted"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="currentEdu"
              checked={current}
              onChange={(e) => setCurrent(e.target.checked)}
              className="rounded border-border"
            />
            <label
              htmlFor="currentEdu"
              className="text-[11px] font-medium text-brand-ink dark:text-foreground cursor-pointer"
            >
              Formation en cours
            </label>
          </div>

          <div>
            <label className="block font-semibold text-neutral-600 dark:text-muted-foreground mb-1">
              Description (optionnelle)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Détails du programme..."
              className="w-full rounded-md border border-border bg-white dark:bg-card p-2 outline-none focus:border-brand-violet dark:focus:border-violet-300"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-md border border-neutral-300 dark:border-border px-3.5 py-1.5 font-semibold text-neutral-600 dark:text-muted-foreground cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-violet px-4 py-1.5 font-semibold text-white hover:bg-brand-violet cursor-pointer disabled:opacity-50"
            >
              {createMutation.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              Enregistrer
            </button>
          </div>
        </form>
      )}

      {/* List from DB */}
      {educations.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          Aucune formation enregistrée. Cliquez sur "Ajouter une formation" pour
          commencer.
        </div>
      ) : (
        <div className="space-y-3">
          {educations.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-brand-sand dark:border-border bg-brand-canvas dark:bg-background p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10 text-brand-ink dark:text-foreground">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-heading text-xs font-bold text-brand-ink dark:text-foreground">
                    {item.nom}
                  </h4>
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-brand-ink dark:text-foreground">
                      {getRoleLabel(item.role)}
                    </span>{" "}
                    •{" "}
                    <span className="inline-flex items-center gap-1 text-[10px]">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {item.startDate}{" "}
                      {item.current
                        ? " - En cours"
                        : item.endDate
                          ? ` à ${item.endDate}`
                          : ""}
                    </span>
                  </p>
                  {item.description && (
                    <p className="mt-1 text-neutral-600 dark:text-muted-foreground text-[10.5px] leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(item.id)}
                className="text-muted-foreground hover:text-red-500 dark:hover:text-red-300 cursor-pointer p-1"
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FormationTab;
