import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { instance } from "../../../api/axios";
import { toast } from "../../../components/ui/toast";
import { getErrorMessage } from "../../../utils/errorMessage";
import {
  Layers,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  FolderPlus,
} from "lucide-react";

interface Service {
  id: number;
  name: string;
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

export const AdminServicesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);

  const [formData, setFormData] = useState({ name: "", description: "" });

  const {
    data: services = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Service[]>({
    queryKey: ["adminServices"],
    queryFn: async () => {
      const response = await instance.get<Service[]>("services/");
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; description: string }) => {
      const response = await instance.post<Service>("services/", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminServices"] });
      toast.add({
        title: "Service créé",
        description: "Le nouveau service a été ajouté avec succès.",
        type: "success",
      });
      closeModal();
    },
    onError: (error) => {
      toast.add({
        title: "Création échouée",
        description: getErrorMessage(error, "Impossible de créer le service."),
        type: "error",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: { name: string; description: string };
    }) => {
      const response = await instance.patch<Service>(
        `services/${id}/`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminServices"] });
      toast.add({
        title: "Service modifié",
        description: "Les modifications ont été enregistrées.",
        type: "success",
      });
      closeModal();
    },
    onError: (error) => {
      toast.add({
        title: "Modification échouée",
        description: getErrorMessage(
          error,
          "Impossible de modifier le service."
        ),
        type: "error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await instance.delete(`services/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminServices"] });
      toast.add({
        title: "Service supprimé",
        description: "Le service a été supprimé du catalogue.",
        type: "success",
      });
      setDeletingService(null);
    },
    onError: (error) => {
      toast.add({
        title: "Suppression impossible",
        description: getErrorMessage(
          error,
          "Le service ne peut pas être supprimé (peut-être lié à des missions)."
        ),
        type: "error",
      });
    },
  });

  const openCreateModal = () => {
    setEditingService(null);
    setFormData({ name: "", description: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setFormData({ name: service.name, description: service.description || "" });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
    setFormData({ name: "", description: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.add({
        title: "Champ requis",
        description: "Le nom du service est obligatoire.",
        type: "error",
      });
      return;
    }

    if (editingService) {
      updateMutation.mutate({ id: editingService.id, payload: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredServices = services.filter(
    (svc) =>
      svc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (svc.description &&
        svc.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 pb-8">
      {/* ── En-tête ── */}
      <div className="relative overflow-hidden rounded-[28px] bg-brand-ink text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 text-brand-green rounded-2xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Gestion des services
            </h1>
            <p className="text-xs text-white/75 mt-0.5">
              Gérez les catégories de services disponibles pour les annonceurs
              et développeurs.
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-green hover:bg-brand-green-hover text-brand-ink dark:text-primary-foreground font-semibold rounded-2xl text-xs transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Créer un service</span>
        </button>
      </div>

      {/* ── Table des services ── */}
      <div className="bg-white dark:bg-card rounded-[24px] border border-brand-ink/8 dark:border-border p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-brand-ink/6 dark:border-border">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher un service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-brand-sand/40 dark:bg-muted/40 border border-brand-ink/10 dark:border-border rounded-xl focus:outline-none focus:border-brand-green focus:bg-white dark:focus:bg-card transition"
            />
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {filteredServices.length} service(s) trouvé(s)
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand-violet dark:text-violet-300" />
            <p className="text-xs text-muted-foreground">
              Chargement des services...
            </p>
          </div>
        ) : isError ? (
          <div className="p-4 bg-brand-green/10 text-brand-violet dark:text-violet-300 rounded-xl text-xs text-center">
            Erreur lors du chargement des services.{" "}
            <button
              onClick={() => refetch()}
              className="underline font-semibold cursor-pointer"
            >
              Réessayer
            </button>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
            <FolderPlus className="w-10 h-10 text-muted-foreground" />
            <p className="text-sm font-semibold text-brand-ink dark:text-foreground">
              Aucun service trouvé
            </p>
            <p className="text-xs text-muted-foreground">
              {searchTerm
                ? "Aucun service ne correspond à la recherche."
                : "Commencez par ajouter un premier service."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-brand-ink/6 dark:border-border bg-brand-sand/40 dark:bg-muted/40 text-muted-foreground font-semibold text-[10px]">
                  <th className="py-3 px-4 rounded-l-xl">ID</th>
                  <th className="py-3 px-4">Nom du service</th>
                  <th className="py-3 px-4">Descriptif</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#111118]/6 dark:divide-border">
                {filteredServices.map((svc) => (
                  <tr
                    key={svc.id}
                    className="hover:bg-brand-sand/30 dark:hover:bg-muted/30 transition group"
                  >
                    <td className="py-3.5 px-4 font-bold text-muted-foreground">
                      #{svc.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-brand-ink dark:text-foreground text-xs">
                        {svc.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground max-w-md truncate">
                      {svc.description || (
                        <span className="text-muted-foreground italic">
                          Sans description
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(svc)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-brand-violet dark:hover:text-violet-300 hover:bg-brand-sand dark:hover:bg-muted transition cursor-pointer"
                          title="Modifier le service"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingService(svc)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-brand-violet dark:hover:text-violet-300 hover:bg-brand-green/10 transition cursor-pointer"
                          title="Supprimer le service"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal créer / modifier ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-ink/50 dark:bg-black/65 backdrop-blur-xs">
          <div className="bg-white dark:bg-card w-full max-w-md rounded-[28px] shadow-xl border border-brand-ink/8 dark:border-border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-brand-ink/6 dark:border-border bg-brand-sand/40 dark:bg-muted/40">
              <h3 className="text-sm font-bold text-brand-ink dark:text-foreground">
                {editingService
                  ? "Modifier le service"
                  : "Créer un nouveau service"}
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
                  Nom du service{" "}
                  <span className="text-brand-violet dark:text-violet-300">
                    *
                  </span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex : Développement mobile"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs bg-brand-sand/40 dark:bg-muted/40 border border-brand-ink/10 dark:border-border rounded-xl focus:outline-none focus:border-brand-green focus:bg-white dark:focus:bg-card transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Descriptif du service
                </label>
                <textarea
                  rows={3}
                  placeholder="Décrivez brièvement le rôle de ce service..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs bg-brand-sand/40 dark:bg-muted/40 border border-brand-ink/10 dark:border-border rounded-xl focus:outline-none focus:border-brand-green focus:bg-white dark:focus:bg-card transition resize-none"
                />
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
                    {editingService ? "Enregistrer" : "Créer le service"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal confirmation suppression ── */}
      {deletingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-ink/50 dark:bg-black/65 backdrop-blur-xs">
          <div className="bg-white dark:bg-card w-full max-w-sm rounded-[28px] shadow-xl border border-brand-ink/8 dark:border-border p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-green/10 text-brand-violet dark:text-violet-300 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-brand-ink dark:text-foreground">
              Supprimer ce service ?
            </h3>
            <p className="text-xs text-muted-foreground">
              Voulez-vous vraiment supprimer le service{" "}
              <strong className="text-brand-ink dark:text-foreground">
                « {deletingService.name} »
              </strong>{" "}
              ? Cette action est irréversible.
            </p>

            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={() => setDeletingService(null)}
                className="px-4 py-2 text-xs font-medium text-muted-foreground bg-brand-sand/60 dark:bg-muted/60 hover:bg-brand-sand dark:hover:bg-muted rounded-xl transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletingService.id)}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-brand-green hover:bg-brand-green-hover text-brand-ink dark:text-primary-foreground rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                {deleteMutation.isPending && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>Confirmer la suppression</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminServicesPage;
