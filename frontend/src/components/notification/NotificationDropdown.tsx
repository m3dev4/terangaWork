import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Trash2,
  MessageSquare,
  Briefcase,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CreditCard,
  Sparkles,
} from "lucide-react";
import { useNotifications } from "../../hooks/useNotifications";
import type { Notification, NotificationType } from "../../api/notificationApi";

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "À l'instant";
  if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)} h`;
  if (diffInSeconds < 604800) return `Il y a ${Math.floor(diffInSeconds / 86400)} j`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "NOUVEAU_MESSAGE":
      return <MessageSquare className="w-4 h-4 text-blue-500" />;
    case "PROPOSITION_ACCEPTEE":
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case "PROPOSITION_REJETEE":
      return <XCircle className="w-4 h-4 text-rose-500" />;
    case "MISSION_DEMARREE":
    case "MISSION_LIVREE":
    case "MISSION_COMPLETEE":
      return <Briefcase className="w-4 h-4 text-indigo-500" />;
    case "MISSION_ANNULEE":
      return <XCircle className="w-4 h-4 text-neutral-400" />;
    case "MISSION_LITIGE":
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case "PAIEMENT_REUSSI":
    case "PAIEMENT_ECHOUE":
      return <CreditCard className="w-4 h-4 text-emerald-600" />;
    default:
      return <Sparkles className="w-4 h-4 text-amber-500" />;
  }
}

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    deleteNotif,
    isLoading,
  } = useNotifications();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.lue) {
      markRead(notif.id);
    }
    setIsOpen(false);

    // Navigation logic
    if (notif.type === "NOUVEAU_MESSAGE" && notif.mission) {
      navigate(`/espace/messages?mission=${notif.mission}`);
    } else if (notif.mission) {
      navigate(`/espace/missions`);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 transition-colors cursor-pointer focus:outline-none"
        title="Notifications"
      >
        <Bell className="w-4 h-4" strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#f2994a] text-white text-[9px] font-bold flex items-center justify-center border-2 border-white animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-neutral-100 z-50 overflow-hidden text-xs">
          {/* Header */}
          <div className="p-3.5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-800 text-sm">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium text-[10px]">
                  {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="text-[11px] text-[#1b4b6b] hover:text-[#133750] font-medium flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Tout marquer lu
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-neutral-100/60">
            {isLoading && notifications.length === 0 ? (
              <div className="p-6 text-center text-neutral-400">
                Chargement...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center gap-2 text-neutral-400">
                <Bell className="w-8 h-8 stroke-1 text-neutral-300" />
                <p className="text-xs">Aucune notification pour le moment.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors group relative ${
                    !notif.lue ? "bg-amber-50/30 hover:bg-amber-50/60" : "hover:bg-neutral-50"
                  }`}
                >
                  {/* Type Icon */}
                  <div className="p-2 rounded-lg bg-neutral-100 shrink-0 mt-0.5">
                    {getNotificationIcon(notif.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p
                        className={`text-xs truncate ${
                          !notif.lue
                            ? "font-semibold text-neutral-900"
                            : "font-medium text-neutral-700"
                        }`}
                      >
                        {notif.titre}
                      </p>
                    </div>
                    <p className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed mb-1">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-neutral-400">
                      {formatRelativeTime(notif.date_creation)}
                    </span>
                  </div>

                  {/* Actions / Unread dot */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {!notif.lue && (
                      <span className="w-2 h-2 rounded-full bg-[#f2994a]" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotif(notif.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-rose-500 transition-opacity"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2 text-center border-t border-neutral-100 bg-neutral-50/40">
              <span className="text-[10px] text-neutral-400">
                Temps réel activé • Jëfly Notifications
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
