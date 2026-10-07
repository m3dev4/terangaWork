import { moonIcon, sunIcon } from "../assets/images";
import { useTheme } from "./theme-provider";
import "./theme-toggle.css";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Mode sombre"
      title={dark ? "Passer au mode clair" : "Passer au mode sombre"}
      className="theme-toggle"
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      <span className="theme-toggle-thumb" />
      <img
        src={sunIcon}
        alt=""
        className="theme-toggle-sun"
        draggable={false}
      />
      <img
        src={moonIcon}
        alt=""
        className="theme-toggle-moon"
        draggable={false}
      />
    </button>
  );
}
