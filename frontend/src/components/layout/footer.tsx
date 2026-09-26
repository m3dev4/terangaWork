import React from "react";
import { TWLogo } from "../../assets/images";
import { FOOTER_COLUMNS } from "../../constants/layout";

const Footer = () => {
  return (
    <div className="flex w-full flex-col items-center bg-stone-900 px-6 pb-10 pt-16 sm:px-10 sm:pt-20 lg:px-24 lg:pt-24">
      <div className="grid w-full max-w-7xl grid-cols-2 gap-x-8 gap-y-12 pb-16 sm:grid-cols-3 lg:grid-cols-5 lg:gap-12">
        {/* Logo + description + réseaux sociaux */}
        <div className="col-span-2 flex flex-col gap-6 sm:col-span-3 lg:col-span-1">
          <img
            className="h-12 w-auto object-contain self-start"
            src={TWLogo}
            alt="Jëfly"
          />
          <p className="max-w-xs font-sans text-sm leading-6 tracking-tight text-gray-400">
            Le matching intelligent au service du freelancing en Afrique.
          </p>
          <div className="flex items-center gap-4">
            {["in", "𝕏", "ig"].map((icon) => (
              <a
                key={icon}
                href="#"
                aria-label={icon}
                className="flex h-10 w-10 flex-none items-center justify-center rounded-lg font-sans text-sm text-gray-400 outline outline-1 -outline-offset-1 outline-white/10 transition hover:text-white hover:outline-white/30"
              >
                {icon}
              </a>
            ))}
          </div>
        </div>

        {/* Colonnes de liens */}
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.title} className="flex flex-col gap-5">
            <h4 className="font-heading text-base font-bold uppercase leading-6 tracking-widest text-white">
              {col.title}
            </h4>
            <ul className="flex flex-col gap-3">
              {col.links.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="font-sans text-sm leading-5 text-gray-400 transition hover:text-white"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex w-full max-w-7xl justify-center border-t border-zinc-800 pt-8">
        <span className="font-sans text-xs leading-4 text-gray-400">
          © 2026 Jëfly. Tous droits réservés.
        </span>
      </div>
    </div>
  );
};

export default Footer;
