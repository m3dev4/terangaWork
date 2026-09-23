import React, { useState, useEffect } from "react";
import { useNotifications } from "../../hooks/useNotifications";
import {
  Bell,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  MessageSquare,
  Briefcase,
  AlertTriangle,
  DollarSign,
  ArrowRight,
  Clock,
} from "lucide-react";
import { NavLink } from "react-router-dom";

export const VerticalNotificationSlider: React.FC = () => {
  const { notifications, unreadCount, markRead, markAllRead, isLoading } =
    useNotifications();

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (notifications.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % notifications.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [notifications.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? notifications.length - 1 : prev - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % notifications.length);
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "NOUVEAU_MESSAGE":
        return <MessageSquare className="w-4.5 h-4.5 text-[#111118]" />;
      case "PROPOSITION_ACCEPTEE":
        return <CheckCircle className="w-4.5 h-4.5 text-emerald-600" />;
      case "PROPOSITION_REJETEE":
        return <AlertTriangle className="w-4.5 h-4.5 text-[#D95C38]" />;
      case "PAIEMENT_REUSSI":
        return <DollarSign className="w-4.5 h-4.5 text-emerald-600" />;
      case "MISSION_DEMARREE":
      case "MISSION_LIVREE":
      case "MISSION_COMPLETEE":
        return <Briefcase className="w-4.5 h-4.5 text-[#D95C38]" />;
      default:
        return <Bell className="w-4.5 h-4.5 text-[#D95C38]" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[340px] bg-white rounded-[28px] border border-[#111118]/8 p-8 animate-pulse">
        <div className="w-10 h-10 rounded-xl bg-[#F3EBDD] mb-3" />
        <div className="w-36 h-4 bg-[#F3EBDD] rounded mb-2" />
        <div className="w-24 h-3 bg-[#F3EBDD] rounded" />
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-full min-h-[340px] bg-white rounded-[28px] border border-[#111118]/8 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#F3EBDD] flex items-center justify-center text-[#D95C38] mb-4">
          <Bell className="w-7 h-7" />
        </div>
        <h4 className="text-base font-bold text-[#111118] font-heading">
          Aucune notification
        </h4>
        <p className="text-xs text-[#111118]/50 mt-1.5 max-w-[220px] leading-relaxed">
          Vos notifications et alertes d'activité apparaîtront en temps réel
          ici.
        </p>
      </div>
    );
  }

  const currentNotif = notifications[currentIndex] || notifications[0];

  return (
    <div className="flex flex-col justify-between h-full min-h-[360px] bg-white rounded-[28px] border border-[#111118]/8 p-6">
      {/* En-tête */}
      <div className="flex items-center justify-between pb-4 border-b border-[#111118]/8">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-[#F3EBDD] flex items-center justify-center text-[#111118]">
              <Bell className="w-5 h-5" />
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#D95C38] text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold font-heading text-[#111118]">
              Flux d'activité
            </h3>
            <p className="text-[11px] text-[#111118]/50 mt-0.5">
              {currentIndex + 1} / {notifications.length} alerte
              {notifications.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              className="text-[11px] font-semibold text-[#D95C38] hover:text-[#c14f2f] bg-[#F3EBDD] px-2.5 py-1 rounded-lg transition-colors cursor-pointer mr-1"
            >
              Tout lire
            </button>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg bg-[#F3EBDD] hover:bg-[#111118]/10 text-[#111118] transition-colors cursor-pointer"
              title="Notification précédente"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg bg-[#F3EBDD] hover:bg-[#111118]/10 text-[#111118] transition-colors cursor-pointer"
              title="Notification suivante"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Carte principale */}
      <div className="my-5 flex-1 flex flex-col justify-center">
        <div
          key={currentNotif.id}
          className="animate-in fade-in slide-in-from-top-3 duration-300 flex flex-col gap-3 p-5 rounded-2xl bg-[#F3EBDD]/60 hover:bg-[#F3EBDD] transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white border border-[#111118]/8">
                {getNotifIcon(currentNotif.type)}
              </div>
              <span className="text-xs font-bold text-[#111118] line-clamp-1">
                {currentNotif.titre}
              </span>
            </div>
            {!currentNotif.est_lu && (
              <button
                onClick={() => markRead(currentNotif.id)}
                className="shrink-0 w-2.5 h-2.5 rounded-full bg-[#D95C38] hover:bg-[#c14f2f] transition-colors cursor-pointer"
                title="Marquer comme lu"
              />
            )}
          </div>

          <p className="text-xs text-[#111118]/60 leading-relaxed line-clamp-3">
            {currentNotif.message}
          </p>

          <div className="flex items-center justify-between pt-3 border-t border-[#111118]/8 text-[11px] text-[#111118]/45">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(currentNotif.date_creation).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>

            {currentNotif.type === "NOUVEAU_MESSAGE" ? (
              <NavLink
                to="/espace/messages"
                className="inline-flex items-center gap-1 font-semibold text-[#111118] hover:underline"
              >
                Répondre
                <ArrowRight className="w-3.5 h-3.5" />
              </NavLink>
            ) : currentNotif.mission ? (
              <NavLink
                to={`/espace/missions/${currentNotif.mission}`}
                className="inline-flex items-center gap-1 font-semibold text-[#D95C38] hover:underline"
              >
                Consulter
                <ArrowRight className="w-3.5 h-3.5" />
              </NavLink>
            ) : null}
          </div>
        </div>
      </div>

      {/* Puces de progression */}
      <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-[#111118]/8">
        {notifications.slice(0, 8).map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${
              idx === currentIndex
                ? "w-6 bg-[#D95C38]"
                : "w-1.5 bg-[#111118]/15 hover:bg-[#111118]/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
};