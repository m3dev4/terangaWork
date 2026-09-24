import React from "react";
import { Check } from "lucide-react";

// ── Palette commune au produit (annonceur / freelance / admin / onboarding) ─
// Encre #111118 · Terracotta #D95C38 · Jaune #E7B84B · Crème #F3EBDD
// Remplace les tokens primary-jefly / secondary-jefly (ancien bleu-marine /
// orange) pour rester cohérent avec la sidebar crème de l'onboarding.

export interface StepItem {
  id: string;
  label: string;
}

interface StepOnboardingProps {
  label: string;
  active: boolean;
  completed?: boolean;
  isLast?: boolean;
  onClick?: () => void;
}

export const ActiveStepIcon: React.FC = () => (
  <div className="relative w-6 h-6 rounded-full border-2 border-[#111118] flex items-center justify-center shrink-0">
    <span className="w-2 h-2 rounded-full bg-secondary-terangawork z-10" />
  </div>
);

export const CompletedStepIcon: React.FC = () => (
  <div className="w-6 h-6 rounded-full bg-[#111118] flex items-center justify-center shrink-0">
    <Check className="w-3.5 h-3.5 text-[#E7B84B] stroke-[2.5]" />
  </div>
);

export const InactiveStepIcon: React.FC = () => (
  <div className="w-6 h-6 rounded-full border-2 border-[#111118]/15 bg-transparent shrink-0" />
);

const StepOnboarding: React.FC<StepOnboardingProps> = ({
  label,
  active,
  completed = false,
  isLast = false,
  onClick,
}) => {
  return (
    <div className="flex flex-col items-start w-full">
      <div
        onClick={onClick}
        className={`w-full flex items-center gap-3.5 transition-all duration-150 ${
          active
            ? "bg-white rounded-2xl py-2.5 px-4 border border-[#111118]/8"
            : "py-1.5 px-4"
        } ${completed && onClick ? "cursor-pointer hover:opacity-70" : ""}`}
      >
        <div className="flex items-center justify-center shrink-0">
          {active ? (
            <ActiveStepIcon />
          ) : completed ? (
            <CompletedStepIcon />
          ) : (
            <InactiveStepIcon />
          )}
        </div>

        <span
          className={`text-sm tracking-tight transition-colors font-inter ${
            active
              ? "font-bold text-[#111118]"
              : completed
                ? "font-medium text-[#111118]/80"
                : "font-normal text-[#111118]/40"
          }`}
        >
          {label}
        </span>
      </div>

      {!isLast && (
        <div className="pl-6.75 py-0.5">
          <div className="w-[1.5px] h-2.5 bg-[#111118]/12" />
        </div>
      )}
    </div>
  );
};

export default StepOnboarding;
