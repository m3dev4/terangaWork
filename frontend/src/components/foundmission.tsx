import React from 'react';
import {
  BriefcaseBusiness,
  ChevronDown,
  Bookmark,
  MapPin,
  RotateCcw,
  Search,
} from 'lucide-react';
import { FILTERS, MISSIONS } from '../constants/utils';

const Foundmission = () => {
  return (
    <div className="flex w-full flex-col items-center bg-brand-ink px-6 py-8 sm:px-10 sm:py-10 lg:px-24">
      {/* Toggle rôle */}
      <div className="mb-10 flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full bg-brand-ink p-1 outline-1 -outline-offset-1 outline-white/5">
          <button className="flex items-center gap-2 rounded-full bg-brand-green px-5 py-2.5 sm:px-7">
            <BriefcaseBusiness className="h-3.5 w-3.5 text-stone-950" />
            <span className="whitespace-nowrap font-sans text-xs font-bold leading-5 text-stone-950 sm:text-sm">
              Je cherche une mission
            </span>
          </button>
          <button className="flex items-center gap-2 rounded-full px-5 py-2.5 sm:px-7">
            <span className="h-3.5 w-3 rounded-sm bg-gray-400" />
            <span className="whitespace-nowrap font-sans text-xs font-bold leading-5 text-muted-foreground sm:text-sm">
              Je cherche un freelance
            </span>
          </button>
        </div>
      </div>

      {/* Barre de recherche + filtres */}
      <div className="mb-10 flex w-full max-w-3xl flex-col items-center">
        <div className="relative flex w-full items-center gap-3 rounded-xl bg-brand-ink py-2 pl-10 pr-2 outline-1 -outline-offset-1 outline-white/10 sm:pl-11">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-violet" />
          <input
            type="text"
            placeholder="ex. développement d'une application mobile"
            className="min-w-0 flex-1 bg-transparent font-sans text-xs text-gray-300 placeholder:text-muted-foreground focus:outline-none sm:text-sm"
          />
          <button className="flex-none whitespace-nowrap rounded-lg bg-brand-green px-5 py-2.5 font-sans text-xs font-black tracking-tight text-stone-950 sm:px-7 sm:text-sm">
            Rechercher
          </button>
        </div>

        {/* Filtres */}
        <div className="mt-5 flex w-full flex-wrap items-center justify-center gap-2">
          {FILTERS.map((filter) => (
            <div
              key={filter.label}
              className="flex min-w-36 flex-1 items-center gap-1.5 rounded-md bg-brand-ink px-2.5 py-2.5 outline-1 -outline-offset-1 outline-white/5 sm:min-w-0 sm:flex-none"
            >
              <span className="flex-none font-sans text-[10px] font-bold leading-4 text-orange-400 sm:text-xs">
                {filter.label}
              </span>
              <span className="flex-1 truncate font-sans text-[10px] leading-4 text-gray-300 sm:text-xs">
                {filter.value}
              </span>
              <ChevronDown className="h-3 w-3 flex-none text-muted-foreground/60" />
            </div>
          ))}

          <div className="hidden h-8 w-px bg-white/10 sm:block" />

          <button className="flex flex-none items-center gap-1.5 font-sans text-[10px] font-bold leading-4 text-orange-400 sm:text-xs">
            Effacer les filtres
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Header liste des missions */}
      <div className="w-full max-w-7xl">
        <div className="flex flex-col gap-4 border-b border-white/5 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <BriefcaseBusiness className="h-4 w-4 text-orange-400" />
              <h2 className="font-heading text-xl font-black leading-tight text-white sm:text-2xl">
                MISSIONS DISPONIBLES
              </h2>
            </div>
            <p className="font-sans text-xs font-normal leading-5 text-muted-foreground sm:text-sm">
              Découvrez des opportunités qui correspondent à votre profil
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end">
            <span className="font-heading text-lg font-black tracking-tight text-orange-400 sm:text-xl">
              124
            </span>
            <span className="font-sans text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Résultats trouvés
            </span>
          </div>
        </div>

        {/* Grille de missions */}
        <div className="grid grid-cols-1 gap-4 pt-5 sm:grid-cols-2 lg:grid-cols-3">
          {MISSIONS.map((mission) => (
            <div
              key={mission.title}
              className="flex flex-col gap-4 rounded-2xl bg-[#202020] p-3.5 outline-1 -outline-offset-1 outline-white/10 sm:p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  {mission.tags.map((tag) => (
                    <span
                      key={tag.label}
                      className={`rounded-full px-2 py-0.5 font-sans text-[8px] font-black uppercase leading-3 outline-1 -outline-offset-1 ${tag.color} ${tag.bg} ${tag.outline}`}
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>
                <span className="flex-none rounded-md bg-white/5 p-1.5 text-muted-foreground/70">
                  <Bookmark className="h-3.5 w-3.5" />
                </span>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="font-heading text-sm font-bold leading-4 text-white sm:text-base">
                  {mission.title}
                </h3>
                <div className="flex items-center gap-1.5 font-sans text-[10px] leading-4 text-muted-foreground">
                  <MapPin className="h-3 w-3 text-orange-400" />
                  {mission.location}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {mission.stack.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white/5 px-2 py-1 font-sans text-[9px] leading-3 text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg bg-white/5 p-2.5">
                <div className="flex flex-col">
                  <span className="font-sans text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
                    {mission.budgetLabel}
                  </span>
                  <span className="whitespace-nowrap font-heading text-sm font-black leading-5 text-orange-400">
                    {mission.budget}
                  </span>
                </div>
                <div className="flex items-center gap-2 opacity-80">
                  {Array.from({ length: mission.avatars }).map((_, i) => (
                    <img
                      key={i}
                      className="h-6 w-6 flex-none rounded-md"
                      src="https://placehold.co/32x32"
                      alt="candidat"
                    />
                  ))}
                </div>
              </div>

              <button className="flex items-center justify-center rounded-lg bg-white/5 py-2.5 font-sans text-[10px] font-bold leading-4 text-white outline-1 -outline-offset-1 outline-white/10 transition hover:bg-white/10">
                Voir la mission
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Foundmission;
