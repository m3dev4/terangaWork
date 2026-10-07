import React, { useState } from "react";

interface NotificationOption {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

export const NotificationSettingsCard: React.FC = () => {
  const [options, setOptions] = useState<NotificationOption[]>([
    {
      id: "messages",
      title: "Nouveau message",
      description:
        "Recevoir une notification lorsqu’un client vous envoie un message.",
      enabled: true,
    },
    {
      id: "candidatures",
      title: "Candidature acceptée/refusée",
      description:
        "Être alerté dès qu’une décision est prise sur l’une de vos candidatures.",
      enabled: true,
    },
    {
      id: "paiements",
      title: "Paiement reçu",
      description:
        "Recevoir un justificatif dès qu’un versement est effectué sur votre compte.",
      enabled: true,
    },
    {
      id: "missions",
      title: "Nouvelle mission",
      description:
        "Être prévenu lorsqu’une mission correspondant à votre profil est publiée.",
      enabled: false,
    },
  ]);

  const toggleOption = (id: string) => {
    setOptions(
      options.map((opt) =>
        opt.id === id ? { ...opt, enabled: !opt.enabled } : opt
      )
    );
  };

  return (
    <div className="rounded-2xl border border-brand-sand dark:border-border bg-white dark:bg-card p-6 sm:p-7 shadow-xs">
      <div className="mb-5 border-b border-brand-sand dark:border-border pb-4">
        <h2 className="font-heading text-sm font-bold text-brand-ink dark:text-foreground">
          Gérer les notifications
        </h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Choisissez les alertes que vous souhaitez recevoir par email.
        </p>
      </div>

      <div className="space-y-4">
        {options.map((opt) => (
          <div
            key={opt.id}
            className="flex items-center justify-between border-b border-[#f3f0eb] dark:border-border pb-3.5 last:border-0 last:pb-0"
          >
            <div className="pr-4">
              <h4 className="font-heading text-[11.5px] font-bold text-brand-ink dark:text-foreground">
                {opt.title}
              </h4>
              <p className="mt-0.5 text-[10.5px] text-muted-foreground leading-relaxed">
                {opt.description}
              </p>
            </div>

            {/* Custom Switch Toggle matching Mockup Pill Style */}
            <button
              type="button"
              onClick={() => toggleOption(opt.id)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                opt.enabled ? "bg-brand-violet" : "bg-neutral-200 dark:bg-muted"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  opt.enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationSettingsCard;
