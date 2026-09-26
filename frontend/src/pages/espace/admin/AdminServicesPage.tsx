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
      <div className="relative overflow-hidden rounded-[28px] bg-[#111118] text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 text-[#E7B84B] rounded-2xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Gestion des services
            </h1>
            <p className="text-xs text-white/50 mt-0.5">
              Gérez les catégories de services disponibles pour les annonceurs
              et développeurs.
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D95C38] hover:bg-[#c14f2f] text-white font-semibold rounded-2xl text-xs transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Créer un service</span>
        </button>
      </div>

      {/* ── Table des services ── */}
      <div className="bg-white rounded-[24px] border border-[#111118]/8 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#111118]/6">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#111118]/35" />
            <input
              type="text"
              placeholder="Rechercher un service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#F3EBDD]/40 border border-[#111118]/10 rounded-xl focus:outline-none focus:border-[#D95C38] focus:bg-white transition"
            />
          </div>
          <span className="text-xs text-[#111118]/50 font-medium">
            {filteredServices.length} service(s) trouvé(s)
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#D95C38]" />
            <p className="text-xs text-[#111118]/40">
              Chargement des services...
            </p>
          </div>
        ) : isError ? (
          <div className="p-4 bg-[#D95C38]/10 text-[#c14f2f] rounded-xl text-xs text-center">
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
            <FolderPlus className="w-10 h-10 text-[#111118]/20" />
            <p className="text-sm font-semibold text-[#111118]">
              Aucun service trouvé
            </p>
            <p className="text-xs text-[#111118]/40">
              {searchTerm
                ? "Aucun service ne correspond à la recherche."
                : "Commencez par ajouter un premier service."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#111118]/6 bg-[#F3EBDD]/40 text-[#111118]/50 font-semibold text-[10px]">
                  <th className="py-3 px-4 rounded-l-xl">ID</th>
                  <th className="py-3 px-4">Nom du service</th>
                  <th className="py-3 px-4">Descriptif</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#111118]/6">
                {filteredServices.map((svc) => (
                  <tr
                    key={svc.id}
                    className="hover:bg-[#F3EBDD]/30 transition group"
                  >
                    <td className="py-3.5 px-4 font-bold text-[#111118]/35">
                      #{svc.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-[#111118] text-xs">
                        {svc.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#111118]/60 max-w-md truncate">
                      {svc.description || (
                        <span className="text-[#111118]/30 italic">
                          Sans description
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(svc)}
                          className="p-1.5 rounded-lg text-[#111118]/40 hover:text-[#D95C38] hover:bg-[#F3EBDD] transition cursor-pointer"
                          title="Modifier le service"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingService(svc)}
                          className="p-1.5 rounded-lg text-[#111118]/40 hover:text-[#c14f2f] hover:bg-[#D95C38]/10 transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111118]/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-[28px] shadow-xl border border-[#111118]/8 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#111118]/6 bg-[#F3EBDD]/40">
              <h3 className="text-sm font-bold text-[#111118]">
                {editingService
                  ? "Modifier le service"
                  : "Créer un nouveau service"}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 rounded-lg text-[#111118]/35 hover:text-[#111118] hover:bg-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#111118]/70">
                  Nom du service <span className="text-[#D95C38]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex : Développement mobile"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs bg-[#F3EBDD]/40 border border-[#111118]/10 rounded-xl focus:outline-none focus:border-[#D95C38] focus:bg-white transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#111118]/70">
                  Descriptif du service
                </label>
                <textarea
                  rows={3}
                  placeholder="Décrivez brièvement le rôle de ce service..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs bg-[#F3EBDD]/40 border border-[#111118]/10 rounded-xl focus:outline-none focus:border-[#D95C38] focus:bg-white transition resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-medium text-[#111118]/60 hover:bg-[#F3EBDD]/60 rounded-xl transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#111118] hover:bg-[#111118]/85 text-white rounded-xl transition cursor-pointer disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111118]/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-[28px] shadow-xl border border-[#111118]/8 p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#D95C38]/10 text-[#D95C38] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#111118]">
              Supprimer ce service ?
            </h3>
            <p className="text-xs text-[#111118]/50">
              Voulez-vous vraiment supprimer le service{" "}
              <strong className="text-[#111118]">
                « {deletingService.name} »
              </strong>{" "}
              ? Cette action est irréversible.
            </p>

            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={() => setDeletingService(null)}
                className="px-4 py-2 text-xs font-medium text-[#111118]/60 bg-[#F3EBDD]/60 hover:bg-[#F3EBDD] rounded-xl transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletingService.id)}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#D95C38] hover:bg-[#c14f2f] text-white rounded-xl transition cursor-pointer disabled:opacity-50"
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
