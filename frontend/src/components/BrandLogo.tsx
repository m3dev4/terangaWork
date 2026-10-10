import {
  twBrandDark,
  twBrandLight,
  twIconDark,
  twIconLight,
} from "../assets/images";

/**
 * Logo TerangaWork, adapté au thème.
 * - Fond clair : violet profond d'origine.
 * - Fond sombre : le violet passe en lavande claire pour rester lisible.
 * Les images sont recadrées au plus près du logo (aucun fond ni marge) :
 * la largeur se règle avec `className` (ex. "w-32"), la hauteur suit.
 */
export default function BrandLogo({
  className = "w-36",
  iconOnly = false,
  variant = "auto",
}: {
  className?: string;
  iconOnly?: boolean;
  /** "auto" suit le thème ; "dark" force la version pour fond sombre (ex. footer). */
  variant?: "auto" | "light" | "dark";
}) {
  const clair = iconOnly ? twIconLight : twBrandLight;
  const sombre = iconOnly ? twIconDark : twBrandDark;

  if (variant !== "auto") {
    return (
      <img
        src={variant === "dark" ? sombre : clair}
        alt="TerangaWork"
        draggable={false}
        className={`block h-auto shrink-0 select-none ${className}`}
      />
    );
  }

  return (
    <span className={`relative block shrink-0 ${className}`}>
      <img
        src={clair}
        alt="TerangaWork"
        draggable={false}
        className="block h-auto w-full select-none dark:hidden"
      />
      <img
        src={sombre}
        alt="TerangaWork"
        draggable={false}
        className="hidden h-auto w-full select-none dark:block"
      />
    </span>
  );
}
