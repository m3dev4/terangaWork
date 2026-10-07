import { instance } from "./axios";

export interface ProjectMeeting {
  id: number;
  mission: number;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  room_name?: string;
  link?: string;
  created_by?: number;
  created_by_name?: string;
  created_at?: string;
}

export interface CreateMeetingPayload {
  mission: number;
  title: string;
  date: string;
  time: string;
  room_name?: string;
  link?: string;
}

export const getProjectMeetings = async (
  missionId?: number
): Promise<ProjectMeeting[]> => {
  const url = missionId ? `meetings/?mission=${missionId}` : "meetings/";
  const response = await instance.get<
    ProjectMeeting[] | { results: ProjectMeeting[] }
  >(url);
  const data = response.data;
  return Array.isArray(data) ? data : data.results;
};

export const createProjectMeeting = async (
  payload: CreateMeetingPayload
): Promise<ProjectMeeting> => {
  const response = await instance.post<ProjectMeeting>("meetings/", payload);
  return response.data;
};

export interface LiveKitTokenResponse {
  token: string;
  url: string;
  room_name: string;
  title: string;
}

export const getMeetingToken = async (
  meetingId: number
): Promise<LiveKitTokenResponse> => {
  const response = await instance.get<LiveKitTokenResponse>(
    `meetings/${meetingId}/token/`
  );
  return response.data;
};
