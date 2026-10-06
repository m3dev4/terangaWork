import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { instance } from "../../../api/axios";
import { toast } from "../../../components/ui/toast";
import { getErrorMessage } from "../../../utils/errorMessage";
import {
  Cpu,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
} from "lucide-react";

// ── Palette commune au dashboard (annonceur / freelance / admin) ───────────
// Encre #111118 · Terracotta #D95C38 · Jaune #E7B84B · Crème #F3EBDD

interface Technologie {
  id: number;
  name: string;
  imgUrl: string;
  created_at?: string;
  updated_at?: string;
}

export const AdminTechnologiesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<Technologie | null>(null);
  const [deletingTech, setDeletingTech] = useState<Technologie | null>(null);

  const [name, setName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imgUrlInput, setImgUrlInput] = useState("");

  const {
    data: technologies = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Technologie[]>({
    queryKey: ["adminTechnologies"],
    queryFn: async () => {
      const response = await instance.get<Technologie[]>("technologies/");
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await instance.post<Technologie>(
        "technologies/",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTechnologies"] });
      toast.add({
        title: "Technologie ajoutée",
        description: "La technologie a été ajoutée avec succès au catalogue.",
        type: "success",
      });
      closeModal();
    },
    onError: (error) => {
      toast.add({
        title: "Création impossible",
        description: getErrorMessage(
          error,
          "Impossible de créer la technologie."
        ),
        type: "error",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      formData,
    }: {
      id: number;
      formData: FormData;
    }) => {
      const response = await instance.patch<Technologie>(
        `technologies/${id}/`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTechnologies"] });
      toast.add({
        title: "Technologie modifiée",
        description: "Les modifications ont été enregistrées.",
        type: "success",
      });
      closeModal();
    },
    onError: (error) => {
      toast.add({
        title: "Modification impossible",
        description: getErrorMessage(
          error,
          "Impossible de modifier la technologie."
        ),
        type: "error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await instance.delete(`technologies/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTechnologies"] });
      toast.add({
        title: "Technologie supprimée",
        description: "La technologie a été retirée du catalogue.",
        type: "success",
      });
      setDeletingTech(null);
    },
    onError: (error) => {
      toast.add({
        title: "Suppression impossible",
        description: getErrorMessage(
          error,
          "La technologie ne peut pas être supprimée."
        ),
        type: "error",
      });
    },
  });

  const openCreateModal = () => {
    setEditingTech(null);
    setName("");
    setImageFile(null);
    setPreviewUrl(null);
    setImgUrlInput("");
    setIsModalOpen(true);
  };

  const openEditModal = (tech: Technologie) => {
    setEditingTech(tech);
    setName(tech.name);
    setImageFile(null);
    setPreviewUrl(tech.imgUrl || null);
    setImgUrlInput(tech.imgUrl || "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTech(null);
    setName("");
    setImageFile(null);
    setPreviewUrl(null);
    setImgUrlInput("");
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.add({
        title: "Champ requis",
        description: "Le nom de la technologie est obligatoire.",
        type: "error",
      });
      return;
    }

    const formData = new FormData();
    formData.append("name", name.trim());

    if (imageFile) {
      formData.append("image", imageFile);
    } else if (imgUrlInput.trim()) {
      formData.append("imgUrl", imgUrlInput.trim());
    }

    if (editingTech) {
      updateMutation.mutate({ id: editingTech.id, formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredTechs = technologies.filter((tech) =>
    tech.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 pb-8">
      {/* ── En-tête ── */}
      <div className="relative overflow-hidden rounded-[28px] bg-brand-ink text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 text-brand-green rounded-2xl">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Gestion des technologies
            </h1>
            <p className="text-xs text-white/75 mt-0.5">
              Gérez le catalogue des langages, frameworks et outils disponibles
              sur Teranga Work.
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-green hover:bg-brand-green-hover text-brand-ink dark:text-primary-foreground font-semibold rounded-2xl text-xs transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Créer une technologie</span>
        </button>
      </div>

      {/* ── Grille des technologies ── */}
      <div className="bg-white dark:bg-card rounded-[24px] border border-brand-ink/8 dark:border-border p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-brand-ink/6 dark:border-border">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher une technologie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-brand-sand/40 dark:bg-muted/40 border border-brand-ink/10 dark:border-border rounded-xl focus:outline-none focus:border-brand-green focus:bg-white dark:focus:bg-card transition"
            />
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {filteredTechs.length} technologie(s) répertoriée(s)
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand-violet dark:text-violet-300" />
            <p className="text-xs text-muted-foreground">
              Chargement des technologies...
            </p>
          </div>
        ) : isError ? (
          <div className="p-4 bg-brand-green/10 text-brand-violet dark:text-violet-300 rounded-xl text-xs text-center">
            Erreur de chargement.{" "}
            <button
              onClick={() => refetch()}
              className="underline font-semibold cursor-pointer"
            >
              Réessayer
            </button>
          </div>
        ) : filteredTechs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
            <Cpu className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm font-semibold text-brand-ink dark:text-foreground">
              Aucune technologie trouvée
            </p>
            <p className="text-xs text-muted-foreground">
              {searchTerm
                ? "Aucun résultat pour cette recherche."
                : "Ajoutez la première technologie au catalogue."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredTechs.map((tech) => (
              <div
                key={tech.id}
                className="group bg-brand-sand/30 dark:bg-muted/30 hover:bg-white dark:hover:bg-card rounded-2xl border border-brand-ink/8 dark:border-border p-3.5 flex flex-col items-center justify-between text-center transition hover:shadow-md hover:border-brand-ink/15 dark:hover:border-border relative"
              >
                <div className="w-12 h-12 rounded-xl bg-white dark:bg-card border border-brand-ink/6 dark:border-border flex items-center justify-center p-2 mb-2 overflow-hidden">
                  {tech.imgUrl ? (
                    <img
                      src={tech.imgUrl}
                      alt={tech.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>

                <span className="font-bold text-xs text-brand-ink dark:text-foreground truncate w-full">
                  {tech.name}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  ID : #{tech.id}
                </span>

                <div className="flex items-center gap-1 mt-3">
                  <button
                    onClick={() => openEditModal(tech)}
                    className="p-1 rounded-md text-muted-foreground hover:text-brand-violet dark:hover:text-violet-300 hover:bg-brand-sand dark:hover:bg-muted transition cursor-pointer"
                    title="Modifier"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingTech(tech)}
                    className="p-1 rounded-md text-muted-foreground hover:text-brand-violet dark:hover:text-violet-300 hover:bg-brand-green/10 transition cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal créer / modifier ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-ink/50 dark:bg-black/65 backdrop-blur-xs">
          <div className="bg-white dark:bg-card w-full max-w-md rounded-[28px] shadow-xl border border-brand-ink/8 dark:border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-brand-ink/6 dark:border-border bg-brand-sand/40 dark:bg-muted/40">
              <h3 className="text-sm font-bold text-brand-ink dark:text-foreground">
                {editingTech
                  ? "Modifier la technologie"
                  : "Créer une technologie"}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 rounded-lg text-muted-foreground hover:text-brand-ink dark:hover:text-foreground hover:bg-white dark:hover:bg-card transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Nom de la technologie{" "}
                  <span className="text-brand-violet dark:text-violet-300">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex : React.js, Python, Flutter"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-brand-sand/40 dark:bg-muted/40 border border-brand-ink/10 dark:border-border rounded-xl focus:outline-none focus:border-brand-green focus:bg-white dark:focus:bg-card transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Icône / logo (image)
                </label>

                {previewUrl && (
                  <div className="flex items-center gap-3 p-3 bg-brand-sand/40 dark:bg-muted/40 border border-brand-ink/8 dark:border-border rounded-xl mb-2">
                    <img
                      src={previewUrl}
                      alt="Aperçu"
                      className="w-10 h-10 object-contain rounded-lg bg-white dark:bg-card p-1 border border-brand-ink/6 dark:border-border"
                    />
                    <div className="flex-1 truncate">
                      <span className="text-xs font-semibold text-brand-ink dark:text-foreground block truncate">
                        Aperçu image
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Prêt à être envoyé au serveur
                      </span>
                    </div>
                  </div>
                )}

                <label className="flex flex-col items-center justify-center border-2 border-dashed border-brand-ink/15 dark:border-border hover:border-brand-green rounded-2xl p-4 bg-brand-sand/30 dark:bg-muted/30 hover:bg-brand-sand/50 dark:hover:bg-muted/50 transition cursor-pointer text-center space-y-1">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Téléverser une image
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Format PNG, SVG, JPG (max 5 Mo)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </label>

                <div className="pt-2">
                  <span className="text-[10px] text-muted-foreground font-medium block mb-1">
                    Ou saisir une URL d'image :
                  </span>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={imgUrlInput}
                    onChange={(e) => {
                      setImgUrlInput(e.target.value);
                      if (e.target.value) setPreviewUrl(e.target.value);
                    }}
                    className="w-full px-3 py-1.5 text-xs bg-brand-sand/40 dark:bg-muted/40 border border-brand-ink/10 dark:border-border rounded-xl focus:outline-none focus:border-brand-green focus:bg-white dark:focus:bg-card transition"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-brand-sand/60 dark:hover:bg-muted/60 rounded-xl transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-brand-ink hover:bg-brand-ink/85 dark:hover:bg-black/65 text-white rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>
                    {editingTech ? "Enregistrer" : "Créer la technologie"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal confirmation suppression ── */}
      {deletingTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-ink/50 dark:bg-black/65 backdrop-blur-xs">
          <div className="bg-white dark:bg-card w-full max-w-sm rounded-[28px] shadow-xl border border-brand-ink/8 dark:border-border p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-green/10 text-brand-violet dark:text-violet-300 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-brand-ink dark:text-foreground">
              Supprimer cette technologie ?
            </h3>
            <p className="text-xs text-muted-foreground">
              Voulez-vous vraiment supprimer{" "}
              <strong className="text-brand-ink dark:text-foreground">
                « {deletingTech.name} »
              </strong>{" "}
              du catalogue ?
            </p>

            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={() => setDeletingTech(null)}
                className="px-4 py-2 text-xs font-medium text-muted-foreground bg-brand-sand/60 dark:bg-muted/60 hover:bg-brand-sand dark:hover:bg-muted rounded-xl transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletingTech.id)}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-brand-green hover:bg-brand-green-hover text-brand-ink dark:text-primary-foreground rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                {deleteMutation.isPending && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>Confirmer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTechnologiesPage;
