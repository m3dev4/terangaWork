import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  ExternalLink,
  GraduationCap,
  Loader2,
  MapPin,
  User,
} from "lucide-react";
import {
  getCandidateFreelanceProfile,
  type Proposition,
} from "../../api/propositionsApi";
import { getMediaUrl } from "../../utils/getMediaUrl";
import { getErrorMessage } from "../../utils/errorMessage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog";

const formatMonth = (date: string) =>
  new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" }).format(
    new Date(`${date}T00:00:00`)
  );

const safeLink = (value?: string) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

export function CandidateProfileModal({
  proposition,
  onClose,
}: {
  proposition: Proposition;
  onClose: () => void;
}) {
  const profileQuery = useQuery({
    queryKey: ["candidate-profile", proposition.id],
    queryFn: () => getCandidateFreelanceProfile(proposition.id),
  });
  const profile = profileQuery.data;
  const identity = profile ?? proposition.freelance_info;
  const fullName = `${identity.first_name} ${identity.last_name}`.trim();
  const links = [
    { label: "GitHub", href: safeLink(profile?.githubUrl) },
    { label: "LinkedIn", href: safeLink(profile?.linkedinUrl) },
  ].filter((link) => link.href);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0"
        style={{
          width: 800,
          height: 630,
          maxWidth: "calc(100vw - 2rem)",
          maxHeight: "calc(100dvh - 2rem)",
          padding: 0,
          gap: 0,
        }}
      >
        <header className="border-b border-border bg-brand-sand/30 px-6 py-5 pr-12 dark:bg-muted/30">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-sand dark:bg-muted">
              {identity.profile_picture ? (
                <img
                  src={getMediaUrl(identity.profile_picture)}
                  alt={fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-7 w-7 text-brand-violet dark:text-violet-300" />
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="break-words text-lg">
                {fullName || "Profil freelance"}
              </DialogTitle>
              <DialogDescription className="mt-1 break-words text-sm">
                {identity.title}
              </DialogDescription>
              {identity.ville && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {identity.ville}
                </p>
              )}
            </div>
          </div>
        </header>

        <div className="min-h-0 overflow-y-auto px-6 py-5">
          {profileQuery.isPending && (
            <div
              role="status"
              className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement du profil…
            </div>
          )}
          {profileQuery.isError && (
            <div
              role="alert"
              className="rounded-xl border border-border p-4 text-sm"
            >
              <p>
                {getErrorMessage(
                  profileQuery.error,
                  "Impossible de charger ce profil."
                )}
              </p>
              <button
                type="button"
                onClick={() => profileQuery.refetch()}
                className="mt-3 font-semibold text-brand-violet underline dark:text-violet-300"
              >
                Réessayer
              </button>
            </div>
          )}
          {profile && (
            <div className="space-y-6">
              <section>
                <h3 className="mb-2 font-heading text-sm font-semibold">
                  À propos
                </h3>
                <p className="whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">
                  {profile.description || "Aucune présentation renseignée."}
                </p>
                {links.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-3">
                    {links.map((link) => (
                      <a
                        key={link.label}
                        href={link.href!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-violet dark:text-violet-300"
                      >
                        {link.label}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                )}
              </section>

              <div className="grid gap-5 sm:grid-cols-2">
                <section>
                  <h3 className="mb-2 font-heading text-sm font-semibold">
                    Services
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.services_detail?.map((service) => (
                      <span
                        key={service.id}
                        className="rounded-lg bg-brand-green/15 px-2.5 py-1 text-xs"
                      >
                        {service.name}
                      </span>
                    ))}
                  </div>
                  {!profile.services_detail?.length && (
                    <p className="text-xs text-muted-foreground">
                      Aucun service renseigné.
                    </p>
                  )}
                </section>
                <section>
                  <h3 className="mb-2 font-heading text-sm font-semibold">
                    Technologies
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.technologies_detail?.map((technology) => (
                      <span
                        key={technology.id}
                        className="rounded-lg bg-brand-sand px-2.5 py-1 text-xs dark:bg-muted"
                      >
                        {technology.name}
                      </span>
                    ))}
                  </div>
                  {!profile.technologies_detail?.length && (
                    <p className="text-xs text-muted-foreground">
                      Aucune technologie renseignée.
                    </p>
                  )}
                </section>
              </div>

              <section>
                <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-semibold">
                  <Briefcase className="h-4 w-4" />
                  Expériences
                </h3>
                <div className="space-y-3">
                  {profile.experiences.map((experience) => (
                    <article
                      key={experience.id}
                      className="rounded-xl border border-border p-3"
                    >
                      <h4 className="break-words text-sm font-semibold">
                        {experience.poste}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {experience.entreprise} ·{" "}
                        {formatMonth(experience.startDate)} –{" "}
                        {experience.current
                          ? "Aujourd'hui"
                          : experience.endDate
                            ? formatMonth(experience.endDate)
                            : "Non précisé"}
                      </p>
                      {experience.description && (
                        <p className="mt-2 whitespace-pre-line break-words text-xs leading-relaxed text-muted-foreground">
                          {experience.description}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
                {!profile.experiences.length && (
                  <p className="text-xs text-muted-foreground">
                    Aucune expérience renseignée.
                  </p>
                )}
              </section>

              <section>
                <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-semibold">
                  <GraduationCap className="h-4 w-4" />
                  Formations
                </h3>
                <div className="space-y-3">
                  {profile.educations.map((education) => (
                    <article
                      key={education.id}
                      className="rounded-xl border border-border p-3"
                    >
                      <h4 className="break-words text-sm font-semibold">
                        {education.nom}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {formatMonth(education.startDate)} –{" "}
                        {education.current
                          ? "En cours"
                          : education.endDate
                            ? formatMonth(education.endDate)
                            : "Non précisé"}
                      </p>
                      {education.description && (
                        <p className="mt-2 whitespace-pre-line break-words text-xs leading-relaxed text-muted-foreground">
                          {education.description}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
                {!profile.educations.length && (
                  <p className="text-xs text-muted-foreground">
                    Aucune formation renseignée.
                  </p>
                )}
              </section>

              <section>
                <h3 className="mb-3 font-heading text-sm font-semibold">
                  Réalisations
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {profile.realisations.map((realisation) => {
                    const href = safeLink(realisation.link);
                    return (
                      <article
                        key={realisation.id}
                        className="rounded-xl border border-border p-3"
                      >
                        <h4 className="break-words text-sm font-semibold">
                          {realisation.title}
                        </h4>
                        {href && (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-violet dark:text-violet-300"
                          >
                            Voir le projet
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </article>
                    );
                  })}
                </div>
                {!profile.realisations.length && (
                  <p className="text-xs text-muted-foreground">
                    Aucune réalisation renseignée.
                  </p>
                )}
              </section>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
