import { instance } from "./axios";

/**
 * Types matching the Django backend models (Service, Technologie, Freelancee, Experience, Education, Realisation)
 */

export interface ServiceData {
  id: number;
  name: string;
  description?: string;
}

export interface TechnologieData {
  id: number;
  name: string;
  imgUrl: string;
}

export interface ExperienceData {
  id: number;
  entreprise: string;
  poste: string;
  startDate: string;
  endDate?: string | null;
  current: boolean;
  description?: string;
}

export interface EducationData {
  id: number;
  role: "UNIVERSITAIRE" | "FORMATION_PROFESSIONNELLE" | "EN_LIGNE";
  nom: string;
  startDate: string;
  endDate?: string | null;
  current: boolean;
  description?: string;
}

export interface RealisationData {
  id: number;
  title: string;
  link?: string;
  created_at?: string;
}

export interface FreelanceProfileData {
  id: number;
  title: string;
  description: string;
  githubUrl?: string;
  linkedinUrl?: string;
  services: number[];
  services_detail?: ServiceData[];
  technologies: number[];
  technologies_detail?: TechnologieData[];
  experiences: ExperienceData[];
  educations: EducationData[];
  realisations: RealisationData[];
  // Compatibilité ascendante
  service?: number | null;
  service_detail?: ServiceData | null;
}

// ─── Freelance Profile ──────────────
export async function fetchFreelanceProfile(): Promise<FreelanceProfileData> {
  const response = await instance.get<FreelanceProfileData>("freelance/me/");
  return response.data;
}

export async function updateFreelanceProfile(
  data: Partial<{
    title: string;
    description: string;
    githubUrl: string;
    linkedinUrl: string;
    services: number[];
    technologies: number[];
    // Compatibilité ascendante
    service?: number | null;
  }>
): Promise<FreelanceProfileData> {
  const response = await instance.patch<FreelanceProfileData>(
    "freelance/me/",
    data
  );
  return response.data;
}

// ─── Global Catalogue (Services & Technologies) ──────────────
export async function fetchServices(): Promise<ServiceData[]> {
  const response = await instance.get<ServiceData[]>("services/");
  return response.data;
}

export async function proposeService(data: {
  name: string;
  description?: string;
}): Promise<ServiceData> {
  const response = await instance.post<ServiceData>("services/", data);
  return response.data;
}

export async function fetchTechnologies(): Promise<TechnologieData[]> {
  const response = await instance.get<TechnologieData[]>("technologies/");
  return response.data;
}

export async function addTechnology(data: {
  name: string;
  imgUrl?: string;
}): Promise<TechnologieData> {
  const response = await instance.post<TechnologieData>("technologies/", data);
  return response.data;
}

// ─── Experiences ──────────────
export async function fetchExperiences(): Promise<ExperienceData[]> {
  const response = await instance.get<ExperienceData[]>("experiences/");
  return response.data;
}

export async function createExperience(
  data: Omit<ExperienceData, "id">
): Promise<ExperienceData> {
  const response = await instance.post<ExperienceData>("experiences/", data);
  return response.data;
}

export async function deleteExperience(id: number): Promise<void> {
  await instance.delete(`experiences/${id}/`);
}

// ─── Educations ──────────────
export async function fetchEducations(): Promise<EducationData[]> {
  const response = await instance.get<EducationData[]>("educations/");
  return response.data;
}

export async function createEducation(
  data: Omit<EducationData, "id">
): Promise<EducationData> {
  const response = await instance.post<EducationData>("educations/", data);
  return response.data;
}

export async function deleteEducation(id: number): Promise<void> {
  await instance.delete(`educations/${id}/`);
}

// ─── Realisations ──────────────
export async function fetchRealisations(): Promise<RealisationData[]> {
  const response = await instance.get<RealisationData[]>("realisations/");
  return response.data;
}

export async function createRealisation(
  data: Omit<RealisationData, "id">
): Promise<RealisationData> {
  const response = await instance.post<RealisationData>("realisations/", data);
  return response.data;
}

export async function deleteRealisation(id: number): Promise<void> {
  await instance.delete(`realisations/${id}/`);
}
