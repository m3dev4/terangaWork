import { Hug, Power } from '../assets/icons';

export default function MatchingAndComparison() {
  return (
    <div className="w-full overflow-hidden bg-stone-900">
      {/* ================= SECTION : Un matching, deux gagnants ================= */}
      <section className="relative w-full overflow-hidden bg-neutral-100 px-6 py-20 sm:px-10 lg:px-24 lg:py-28">
        {/* cercle décoratif */}
        <div className="pointer-events-none absolute -right-40 top-0 h-[500px] w-[500px] rounded-full bg-orange-400 opacity-5 sm:h-[650px] sm:w-[650px] lg:h-[800px] lg:w-[800px]" />

        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-16">
          {/* En-tête */}
          <div className="flex w-full max-w-3xl flex-col items-center gap-6 text-center">
            <div className="flex items-center gap-4">
              <span className="h-px w-12 flex-none bg-orange-400" />
              <span className="font-sans text-xs font-bold uppercase leading-5 tracking-[2px] text-orange-400 sm:text-sm sm:tracking-[2.8px]">
                L&apos;algorithme au service de l&apos;humain
              </span>
              <span className="h-px w-12 flex-none bg-orange-400" />
            </div>

            <h2 className="font-heading text-3xl font-black leading-tight text-brand-ink sm:text-5xl lg:text-6xl lg:leading-[75px]">
              Un matching,{' '}
              <span className="text-orange-400">deux gagnants</span>
            </h2>

            <p className="font-sans max-w-2xl text-base font-normal leading-relaxed text-brand-ink/80 sm:text-xl sm:leading-8">
              Notre moteur d&apos;IA analyse des milliers de points de données
              pour créer des connexions authentiques entre talents et
              opportunités.
            </p>
          </div>

          {/* Grille : profil freelance — badge central — offre annonceur */}
          <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
            {/* Colonne 1 : Freelance */}
            <div className="order-2 flex flex-col gap-8 lg:order-1">
              <div className="flex flex-col gap-4 rounded-2xl p-5 outline outline-1 -outline-offset-1 outline-white/10">
                <div className="flex items-center gap-4">
                  <img
                    className="h-12 w-12 flex-none rounded-xl object-cover"
                    src="https://placehold.co/48x48"
                    alt="Awa Diallo"
                  />
                  <div className="flex flex-col gap-1">
                    <span className="font-heading text-lg font-bold leading-7 tracking-tight text-brand-ink">
                      Awa Diallo
                    </span>
                    <span className="font-sans text-xs font-medium uppercase leading-4 tracking-wide text-orange-400">
                      Freelance Profile
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {['React', 'UI Design', 'Framer'].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white/5 px-3 py-1 font-sans text-[10px] leading-4 tracking-tight text-brand-ink outline outline-1 -outline-offset-1 outline-white/10"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4 pl-0 sm:pl-14 lg:pl-20">
                <span className="font-sans text-[10px] font-bold uppercase leading-4 tracking-wide text-muted-foreground">
                  Missions Recommandées
                </span>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-gradient-to-l from-orange-300/60 to-white p-4 outline outline-1 -outline-offset-1 outline-white/10">
                  <span className="font-heading text-sm font-semibold leading-5 tracking-tight text-brand-ink">
                    SaaS Redesign
                  </span>
                  <span className="whitespace-nowrap font-sans text-sm font-bold leading-5 tracking-tight text-green-600">
                    4.5k FCFA
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-white/80 p-4 opacity-70 outline outline-1 -outline-offset-1 outline-white/5">
                  <span className="font-heading text-sm font-semibold leading-5 tracking-tight text-brand-ink">
                    Mobile App FinTech
                  </span>
                  <span className="whitespace-nowrap font-sans text-sm font-bold leading-5 tracking-tight text-green-600">
                    3.2k FCFA
                  </span>
                </div>
              </div>
            </div>

            {/* Colonne centrale : badge Matching Engine IA */}
            <div className="order-1 flex flex-col items-center gap-4 lg:order-2">
              <div className="relative flex h-32 w-32 items-center justify-center rounded-[32px] bg-orange-400">
                <img src={Power} alt="power" className="w-18 h-18" />
                <span className="absolute inset-1 rounded-3xl border-2 border-white/20" />

                <span className="pointer-events-none absolute right-full top-1/2 hidden h-px w-24 -translate-y-1/2 border-t-2 border-dashed border-neutral-800/60 lg:block" />
                <span className="pointer-events-none absolute left-full top-1/2 hidden h-px w-24 -translate-y-1/2 border-t-2 border-dashed border-neutral-800/60 lg:block" />
              </div>
              <div className="flex flex-col items-center gap-1 rounded-full bg-orange-400/10 px-6 py-2.5 outline outline-1 -outline-offset-1 outline-orange-400/30">
                <span className="font-heading text-sm font-black uppercase leading-5 tracking-wider text-orange-400">
                  Matching
                </span>
                <span className="font-heading text-sm font-black uppercase leading-5 tracking-wider text-orange-400">
                  Engine IA
                </span>
              </div>
            </div>

            {/* Colonne 2 : Annonceur */}
            <div className="order-3 flex flex-col items-end gap-8">
              <div className="flex flex-col items-end gap-4 rounded-2xl p-5 text-right outline outline-1 -outline-offset-1 outline-white/10">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-heading text-lg font-bold leading-7 text-brand-ink">
                      FinTech Dashboard
                    </span>
                    <span className="font-sans text-xs font-medium uppercase leading-4 tracking-wide text-orange-400">
                      Active Job Post
                    </span>
                  </div>
                  <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-white/5 outline outline-1 -outline-offset-1 outline-white/10">
                    <span className="text-orange-400">📌</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 font-sans text-sm">
                  <span className="font-bold leading-5 tracking-tight text-green-600">
                    Budget: 5k FCFA
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-zinc-500">Dashboard, UX</span>
                </div>
              </div>

              <div className="flex w-full flex-col items-end gap-4 pr-0 sm:pr-14 lg:pr-20">
                <span className="font-sans text-right text-[10px] font-bold uppercase leading-4 tracking-wide text-muted-foreground">
                  Top Candidats
                </span>
                <div className="flex w-full items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-orange-300/60 to-transparent p-4 outline outline-1 -outline-offset-1 outline-white/10">
                  <div className="flex items-center gap-3">
                    <img
                      className="h-8 w-8 flex-none rounded-full object-cover"
                      src="https://placehold.co/32x32"
                      alt="Marc Diop"
                    />
                    <span className="font-heading text-sm font-medium leading-5 text-brand-ink">
                      Marc Diop
                    </span>
                  </div>
                  <span className="whitespace-nowrap text-right">
                    <b className="font-heading text-sm font-black leading-5 text-brand-ink">
                      98%
                    </b>{' '}
                    <span className="font-sans text-[10px] leading-4 tracking-tight text-zinc-500">
                      Match
                    </span>
                  </span>
                </div>
                <div className="flex w-full items-center justify-between gap-3 rounded-xl p-4 opacity-70 outline outline-1 -outline-offset-1 outline-white/5">
                  <div className="flex items-center gap-3">
                    <img
                      className="h-8 w-8 flex-none rounded-full object-cover"
                      src="https://placehold.co/32x32"
                      alt="Fatou Sow"
                    />
                    <span className="font-heading text-sm font-medium leading-5 tracking-tight text-brand-ink">
                      Fatou Sow
                    </span>
                  </div>
                  <span className="whitespace-nowrap text-right">
                    <b className="font-heading text-sm font-black leading-5 text-brand-ink">
                      94%
                    </b>{' '}
                    <span className="font-sans text-[10px] leading-4 tracking-tight text-zinc-500">
                      Match
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION : Comparatif marché ================= */}
      <section className="relative w-full overflow-hidden bg-transparent px-6 py-20 sm:px-10 lg:px-24 lg:py-28">
        <div className="pointer-events-none absolute -right-10 bottom-10 hidden h-32 w-32 rotate-0 opacity-20 lg:block">
          <div className="h-20 w-32 translate-y-6 bg-orange-400" />
        </div>

        <div className="relative mx-auto flex max-w-7xl flex-col gap-16 lg:flex-row lg:items-center lg:gap-16">
          {/* Colonne texte */}
          <div className="flex flex-1 flex-col gap-10">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <span className="h-px w-12 flex-none bg-orange-400" />
                <span className="font-sans text-xs font-bold uppercase leading-5 tracking-[2px] text-orange-400 sm:text-sm sm:tracking-[2.8px]">
                  Comparatif marché
                </span>
              </div>

              <h2 className="font-heading text-3xl font-black leading-tight sm:text-5xl lg:text-6xl lg:leading-[75px]">
                <span className="text-white">L&apos;avantage </span>
                <span className="text-orange-400">Teranga Work</span>
              </h2>

              <p className="font-sans max-w-md text-base font-normal leading-relaxed text-muted-foreground sm:text-xl sm:leading-8">
                Plus qu&apos;une marketplace, nous construisons
                l&apos;infrastructure du travail de demain pour l&apos;Afrique
                Francophone.
              </p>
            </div>

            <div className="flex flex-col gap-6">
              {[
                'Matching par IA 100% pertinent',
                'Paiements Mobile Money intégrés',
                'Spécialisation Afrique Francophone',
              ].map((item) => (
                <div key={item} className="flex items-center gap-4">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-orange-400/20 font-sans text-xs text-orange-400 outline outline-1 -outline-offset-1 outline-orange-400/40">
                    ✓
                  </span>
                  <span className="font-sans text-base font-medium leading-7 text-white sm:text-lg">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Colonne carte comparative */}
          <div className="flex flex-1 flex-col gap-6">
            {/* Teranga Work — mis en avant */}
            <div className="flex flex-col gap-6 rounded-r-3xl border-l-4 border-orange-400 bg-gradient-to-r from-orange-400/10 to-transparent p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-heading text-2xl font-black leading-9 text-orange-400 sm:text-3xl">
                  Teranga Work
                </span>
                <span className="rounded-full bg-orange-400 px-4 py-1 font-sans text-[10px] font-black uppercase leading-4 text-brand-ink">
                  Leader Régional
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-3">
                {[
                  'Matching IA réel',
                  'Mobile Money Natif',
                  'Spécialisation Afrique',
                  'Comm. équitable',
                ].map((item) => (
                  <span
                    key={item}
                    className="flex items-center gap-3 font-sans text-sm font-medium leading-5 tracking-tight text-white"
                  >
                    <span className="text-orange-400">⚡</span>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Upwork */}
            <div className="pl-4 sm:pl-8">
              <div className="rounded-r-2xl border-l-4 border-gray-400 bg-white/5 px-4 py-6 opacity-60 sm:px-6 sm:pb-10">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <span className="font-heading text-lg font-bold leading-7 text-muted-foreground sm:text-xl">
                    Upwork
                  </span>
                  <div className="flex flex-wrap gap-4">
                    <span className="font-sans text-[10px] font-bold leading-4 tracking-tight text-muted-foreground">
                      Matching générique
                    </span>
                    <span className="font-sans text-[10px] font-bold leading-4 tracking-tight text-muted-foreground">
                      Pas de Mobile Money
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fiverr */}
            <div className="pl-6 sm:pl-16">
              <div className="rounded-r-xl border-l-4 border-gray-400/40 p-6 opacity-40">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <span className="font-heading text-base font-bold leading-7 tracking-tight text-muted-foreground sm:text-lg">
                    Fiverr
                  </span>
                  <span className="font-sans text-[10px] font-bold leading-4 text-muted-foreground">
                    Micro-services globaux
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
