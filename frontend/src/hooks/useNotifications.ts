import { useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotifications,
  getNotificationStats,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  type Notification,
  type NotificationStats,
  type NotificationListResponse,
} from "../api/notificationApi";
import { notifMp3 } from "../assets/mp3";
import { WebSocketManager } from "./useWebSocket";
import type { WebSocketMessage } from "./useWebSocket";

export const useNotifications = () => {
  const queryClient = useQueryClient();
  const prevUnreadCountRef = useRef<number | null>(null);

  // Fetch notification stats
  const statsQuery = useQuery<NotificationStats, Error>({
    queryKey: ["notificationStats"],
    queryFn: getNotificationStats,
    refetchOnWindowFocus: true,
  });

  // Fetch notifications list
  const notificationsQuery = useQuery<NotificationListResponse, Error>({
    queryKey: ["notifications"],
    queryFn: () => getNotifications({ page_size: 30 }),
    refetchOnWindowFocus: true,
  });

  const unreadCount = statsQuery.data?.non_lues ?? 0;

  // Listen for WebSocket notification events to play sound immediately
  useEffect(() => {
    const manager = WebSocketManager.getInstance();

    const handler = (msg: WebSocketMessage) => {
      if (msg.type === "notification") {
        // Play notification sound immediately on each new notification
        try {
          const audio = new Audio(notifMp3);
          audio.play().catch((err) => {
            console.warn("Audio play prevented by browser policy:", err);
          });
        } catch (e) {
          console.error("Audio playback error:", e);
        }
      }
    };

    manager.addHandler(handler);
    return () => {
      manager.removeHandler(handler);
    };
  }, []);

  // Track unread count changes for fallback sound (in case of REST refetch)
  useEffect(() => {
    if (statsQuery.data !== undefined) {
      if (
        prevUnreadCountRef.current !== null &&
        unreadCount > prevUnreadCountRef.current
      ) {
        // Sound is already triggered via WebSocket handler above,
        // this is a safety fallback
      }
      prevUnreadCountRef.current = unreadCount;
    }
  }, [unreadCount, statsQuery.data]);

  // Mutation to mark single notification as read
  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notificationStats"] });
    },
  });

  // Mutation to mark all notifications as read
  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notificationStats"] });
    },
  });

  // Mutation to delete a notification
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notificationStats"] });
    },
  });

  return {
    notifications: notificationsQuery.data?.notifications ?? [],
    totalCount: notificationsQuery.data?.total ?? 0,
    unreadCount,
    isLoading: notificationsQuery.isLoading || statsQuery.isLoading,
    isError: notificationsQuery.isError || statsQuery.isError,
    markRead: markReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
    deleteNotif: deleteMutation.mutate,
    refetch: () => {
      notificationsQuery.refetch();
      statsQuery.refetch();
    },
  };
};
