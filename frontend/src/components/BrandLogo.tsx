import { TWLogo } from "../assets/images";

export default function BrandLogo({
  className = "w-36",
  iconOnly = false,
}: {
  className?: string;
  iconOnly?: boolean;
}) {
  // Frame the artwork rather than the transparent padding of the source PNG.
  return (
    <svg
      viewBox={iconOnly ? "132 140 245 140" : "60 140 380 205"}
      role="img"
      aria-label="Teranga Work"
      className={`block shrink-0 ${className}`}
    >
      <image href={TWLogo} width="500" height="500" />
    </svg>
  );
}
