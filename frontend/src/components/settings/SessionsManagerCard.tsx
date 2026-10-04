import React from 'react';
import { Laptop, Smartphone, Monitor, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchSessions,
  revokeSession,
  revokeAllOtherSessions,
  type SessionData,
} from '../../api/userApi';

/**
 * Parses the raw User-Agent string to extract a human-readable device name
 * and an icon type for display.
 */
function parseDevice(rawDevice: string): {
  label: string;
  iconType: 'laptop' | 'mobile' | 'desktop';
} {
  const ua = rawDevice.toLowerCase();

  if (/iphone|android|mobile/i.test(ua)) {
    const match = ua.match(/(iphone|samsung|pixel|xiaomi|huawei|android)/i);
    return {
      label: match ? match[1].charAt(0).toUpperCase() + match[1].slice(1) : 'Mobile',
      iconType: 'mobile',
    };
  }

  if (/macintosh|mac os/i.test(ua)) {
    return { label: 'Mac', iconType: 'laptop' };
  }

  if (/windows/i.test(ua)) {
    return { label: 'Windows PC', iconType: 'desktop' };
  }

  if (/linux/i.test(ua)) {
    return { label: 'Linux PC', iconType: 'desktop' };
  }

  return { label: 'Appareil inconnu', iconType: 'laptop' };
}

/**
 * Extracts browser name from a User-Agent string.
 */
function parseBrowser(rawDevice: string): string {
  if (/edg/i.test(rawDevice)) return 'Edge';
  if (/opr|opera/i.test(rawDevice)) return 'Opera';
  if (/firefox/i.test(rawDevice)) return 'Firefox';
  if (/safari/i.test(rawDevice) && !/chrome/i.test(rawDevice)) return 'Safari';
  if (/chrome/i.test(rawDevice)) return 'Chrome';
  return 'Navigateur';
}

/**
 * Formats the last active date into a human-readable French string.
 */
function formatLastActive(dateStr: string, isCurrent: boolean): string {
  if (isCurrent) return 'Actif maintenant';

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "À l'instant";
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export const SessionsManagerCard: React.FC = () => {
  const queryClient = useQueryClient();

  const {
    data: sessions = [],
    isLoading,
    isError,
  } = useQuery<SessionData[]>({
    queryKey: ['sessions'],
    queryFn: fetchSessions,
  });

  const revokeMutation = useMutation({
    mutationFn: (sessionId: number) => revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const revokeAllMutation = useMutation({
    mutationFn: () => revokeAllOtherSessions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="h-5 w-5 text-neutral-600" />;
      case 'desktop':
        return <Monitor className="h-5 w-5 text-neutral-600" />;
      default:
        return <Laptop className="h-5 w-5 text-neutral-600" />;
    }
  };

  // The first session (ordered by -date_last_used) with the current refresh token is the current one
  const currentRefreshToken = localStorage.getItem('refresh_token');

  return (
    <div className="rounded-2xl border border-brand-sand bg-white p-6 sm:p-7 shadow-xs">
      <div className="mb-5 border-b border-brand-sand pb-4">
        <h2 className="font-heading text-sm font-bold text-brand-ink">
          Gérer ses sessions ouvertes
        </h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Consultez et gérez les appareils connectés à votre compte.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="py-6 text-center text-[11px] text-red-500">
          Impossible de charger les sessions.
        </div>
      ) : sessions.length === 0 ? (
        <div className="py-6 text-center text-[11px] text-muted-foreground">
          Aucune session active.
        </div>
      ) : (
        <>
          {/* List matching Mockup */}
          <div className="space-y-3">
            {sessions.map((s, index) => {
              const { label: deviceLabel, iconType } = parseDevice(s.device || '');
              const browser = parseBrowser(s.device || '');
              // First session in the list (most recent) is considered "current"
              const isCurrent = index === 0;

              return (
                <div
                  key={s.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-canvas border border-border">
                      {getIcon(iconType)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading text-[12px] font-bold text-brand-ink">
                          {deviceLabel} • {browser}
                        </span>
                        {isCurrent && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[8.5px] font-bold text-emerald-700 uppercase tracking-wide">
                            CET APPAREIL
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-muted-foreground">
                        {s.location || 'Localisation inconnue'} •{' '}
                        {formatLastActive(s.date_last_used, isCurrent)}
                      </p>
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      type="button"
                      disabled={revokeMutation.isPending}
                      onClick={() => revokeMutation.mutate(s.id)}
                      className="text-[11px] font-semibold text-red-500 hover:text-red-700 cursor-pointer self-start sm:self-auto disabled:opacity-50"
                    >
                      Déconnecter
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Disconnect all others action */}
          {sessions.length > 1 && (
            <div className="mt-4 pt-2 text-center">
              <button
                type="button"
                disabled={revokeAllMutation.isPending}
                onClick={() => revokeAllMutation.mutate()}
                className="text-[11px] font-semibold text-brand-ink hover:underline cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {revokeAllMutation.isPending && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
                Déconnecter toutes les autres sessions
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SessionsManagerCard;
