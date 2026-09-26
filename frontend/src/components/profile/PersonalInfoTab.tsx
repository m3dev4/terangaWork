import React, { useState, useEffect } from "react";
import {
  Camera,
  Lock,
  User,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { getMediaUrl } from "../../utils/getMediaUrl";
import ChangePasswordModal from "./ChangePasswordModal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { updateProfile, uploadProfilePhoto } from "../../api/userApi";
import {
  fetchFreelanceProfile,
  updateFreelanceProfile,
} from "../../api/freelanceApi";

interface PersonalInfoTabProps {
  user: any;
}

export const PersonalInfoTab: React.FC<PersonalInfoTabProps> = ({ user }) => {
  const queryClient = useQueryClient();
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Freelance profile state
  const isFreelance = user?.role === "freelance";
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  const { data: freelanceProfile } = useQuery({
    queryKey: ["freelanceProfile"],
    queryFn: fetchFreelanceProfile,
    enabled: isFreelance,
  });

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state from user prop (real backend data)
  useEffect(() => {
    if (user) {
      setLastName(user.last_name || "");
      setFirstName(user.first_name || "");
      setEmail(user.email || "");
      setPhone(user.number_phone || "");
      setAvatarPreview(user.profile_picture ? getMediaUrl(user.profile_picture) : null);
    }
  }, [user]);

  useEffect(() => {
    if (freelanceProfile) {
      setTitle(freelanceProfile.title || "");
      setDescription(freelanceProfile.description || "");
      setGithubUrl(freelanceProfile.githubUrl || "");
      setLinkedinUrl(freelanceProfile.linkedinUrl || "");
    }
  }, [freelanceProfile]);

  // Avatar file upload handler
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      // 1. Upload photo if selected
      if (avatarFile) {
        await uploadProfilePhoto(avatarFile);
      }

      // 2. Update user basic info
      await updateProfile({
        first_name: firstName,
        last_name: lastName,
        number_phone: phone,
      });

      // 3. Update freelance profile info if role is freelance
      if (isFreelance) {
        await updateFreelanceProfile({
          title,
          description,
          githubUrl,
          linkedinUrl,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["freelanceProfile"] });
      setAvatarFile(null);
      setErrorMessage(null);
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 3000);
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Erreur lors de la mise à jour du profil.";
      setErrorMessage(typeof msg === "string" ? msg : JSON.stringify(msg));
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    updateProfileMutation.mutate();
  };

  return (
    <div className="rounded-2xl border border-[#ebe8e2] bg-white p-6 sm:p-8 shadow-xs max-w-3xl">
      {successMessage && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-[11px] font-semibold text-emerald-700">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          Modifications enregistrées avec succès !
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-[11px] font-semibold text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-[11px]">
        {/* Avatar Upload Section */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="relative group">
            <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-neutral-100 shadow-md flex items-center justify-center ring-1 ring-neutral-200">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={firstName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-12 w-12 text-neutral-400" />
              )}
            </div>

            <label
              htmlFor="avatar-upload"
              className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-[10px] font-semibold gap-1"
            >
              <Camera className="h-5 w-5" />
              <span>Modifier</span>
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>

        {/* Basic Inputs Grid */}
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Nom */}
          <div>
            <label className="mb-1.5 block font-semibold uppercase text-[9.5px] tracking-wider text-neutral-400">
              Nom
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Votre nom"
              className="w-full rounded-lg border border-[#e7e3dc] bg-[#faf9f7] px-3.5 py-2.5 text-[11.5px] font-medium text-neutral-800 outline-none focus:border-[#1b4b6b] focus:bg-white transition-all"
            />
          </div>

          {/* Prénom */}
          <div>
            <label className="mb-1.5 block font-semibold uppercase text-[9.5px] tracking-wider text-neutral-400">
              Prénom
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Votre prénom"
              className="w-full rounded-lg border border-[#e7e3dc] bg-[#faf9f7] px-3.5 py-2.5 text-[11.5px] font-medium text-neutral-800 outline-none focus:border-[#1b4b6b] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="mb-1.5 block font-semibold uppercase text-[9.5px] tracking-wider text-neutral-400">
            Adresse Email
          </label>
          <div className="relative">
            <input
              type="email"
              readOnly
              value={email}
              className="w-full rounded-lg border border-[#e7e3dc] bg-[#faf9f7] px-3.5 py-2.5 text-[11.5px] font-medium text-neutral-600 outline-none cursor-not-allowed"
            />
            <Lock className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          </div>
        </div>

        {/* Phone & Password */}
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Téléphone */}
          <div>
            <label className="mb-1.5 block font-semibold uppercase text-[9.5px] tracking-wider text-neutral-400">
              Téléphone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+221 77 000 00 00"
              className="w-full rounded-lg border border-[#e7e3dc] bg-white px-3.5 py-2.5 text-[11.5px] font-medium text-neutral-800 outline-none focus:border-[#1b4b6b] transition-all"
            />
          </div>

          {/* Mot de passe */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="font-semibold uppercase text-[9.5px] tracking-wider text-neutral-400">
                Mot de passe
              </label>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
                className="text-[10px] font-semibold text-[#1b4b6b] hover:underline cursor-pointer"
              >
                Modifier le mot de passe
              </button>
            </div>
            <input
              type="password"
              readOnly
              value="••••••••••••"
              className="w-full rounded-lg border border-[#e7e3dc] bg-[#faf9f7] px-3.5 py-2.5 text-[11.5px] text-neutral-400 outline-none cursor-not-allowed"
            />
          </div>
        </div>

        {/* Freelance Specific Section */}
        {isFreelance && (
          <div className="border-t border-[#f0ede8] pt-6 space-y-4">
            <h4 className="font-heading text-xs font-bold text-neutral-900">
              Profil Freelance & Portfolio Links
            </h4>

            {/* Title */}
            <div>
              <label className="mb-1.5 block font-semibold uppercase text-[9.5px] tracking-wider text-neutral-400">
                Titre Professionnel
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex: Développeur Lead Fullstack React & Python"
                className="w-full rounded-lg border border-[#e7e3dc] bg-white px-3.5 py-2.5 text-[11.5px] font-medium text-neutral-800 outline-none focus:border-[#1b4b6b]"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block font-semibold uppercase text-[9.5px] tracking-wider text-neutral-400">
                Présentation / Bio
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez votre expérience, vos spécialités et votre passion..."
                className="w-full rounded-lg border border-[#e7e3dc] bg-white px-3.5 py-2.5 text-[11.5px] font-medium text-neutral-800 outline-none focus:border-[#1b4b6b]"
              />
            </div>

            {/* GitHub & LinkedIn Links */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block font-semibold uppercase text-[9.5px] tracking-wider text-neutral-400 flex items-center gap-1">
                  Profil GitHub
                </label>
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/username"
                  className="w-full rounded-lg border border-[#e7e3dc] bg-white px-3.5 py-2.5 text-[11.5px] font-medium text-neutral-800 outline-none focus:border-[#1b4b6b]"
                />
              </div>

              <div>
                <label className="mb-1.5 block font-semibold uppercase text-[9.5px] tracking-wider text-neutral-400 flex items-center gap-1">
                  Profil LinkedIn
                </label>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full rounded-lg border border-[#e7e3dc] bg-white px-3.5 py-2.5 text-[11.5px] font-medium text-neutral-800 outline-none focus:border-[#1b4b6b]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="border-t border-[#f0ede8] pt-4 flex justify-end">
          <button
            type="submit"
            disabled={updateProfileMutation.isPending}
            className="rounded-lg bg-[#1b4b6b] px-6 py-2.5 text-[11px] font-semibold text-white hover:bg-[#143952] transition-all shadow-2xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {updateProfileMutation.isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            Enregistrer les modifications
          </button>
        </div>
      </form>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
};

export default PersonalInfoTab;
