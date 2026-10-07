import { instance } from "../api/axios";
import type { AuthUser } from "../interfaces/authInterface";

const getCurrentUser = async (): Promise<AuthUser | null> => {
  const token = localStorage.getItem("access_token");
  if (!token) return null;

  try {
    const response = await instance.get<AuthUser>("me/");
    return response.data;
  } catch (error) {
    return null;
  }
};

export default getCurrentUser;
