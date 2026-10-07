import { instance } from "./axios";

/**
 * API service for user profile and session management.
 * All endpoints connect to the real Django backend.
 */

// ─── Profile ────────────────────────────────────────────────────────────────

export const fetchProfile = async () => {
  const res = await instance.get("me/");
  return res.data;
};

export const updateProfile = async (data: {
  first_name?: string;
  last_name?: string;
  number_phone?: string;
}) => {
  // ProfileViewSet ignores pk in get_object(), returns request.user.
  // We pass 'me' as a placeholder pk.
  const res = await instance.patch("profile/me/", data);
  return res.data;
};

export const uploadProfilePhoto = async (file: File) => {
  const formData = new FormData();
  formData.append("photo", file);
  const res = await instance.post("profile/photo/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const deleteProfilePhoto = async () => {
  const res = await instance.delete("profile/photo/");
  return res.data;
};

// ─── Password ───────────────────────────────────────────────────────────────

export const changePassword = async (data: {
  old_password: string;
  new_password: string;
}) => {
  const res = await instance.post("auth/change-password/", data);
  return res.data;
};

// ─── Sessions ───────────────────────────────────────────────────────────────

export interface SessionData {
  id: number;
  device: string;
  location: string;
  is_active: boolean;
  date_created: string;
  date_last_used: string;
}

export const fetchSessions = async (): Promise<SessionData[]> => {
  const res = await instance.get("auth/get-all-sessions/");
  return res.data;
};

export const revokeSession = async (sessionId: number) => {
  const res = await instance.post("auth/revoke-session/", {
    session_id: sessionId,
  });
  return res.data;
};

export const revokeAllOtherSessions = async () => {
  const refreshToken = localStorage.getItem("refresh_token") || "";
  const res = await instance.post("auth/revoke-all-other-sessions/", {
    current_refresh_token: refreshToken,
  });
  return res.data;
};

// ─── Account Deletion ───────────────────────────────────────────────────────

export const deleteAccount = async (password: string) => {
  // ProfileViewSet.destroy() expects password + confirm_deletion
  const res = await instance.delete("profile/me/", {
    data: { password, confirm_deletion: true },
  });
  return res.data;
};
