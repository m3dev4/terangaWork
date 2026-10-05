import React from 'react';

export type ProfileTab =
  | 'personal'
  | 'services'
  | 'experience'
  | 'formation'
  | 'realisation';

interface ProfileHeaderTabsProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  isFreelance?: boolean;
}

export const ProfileHeaderTabs: React.FC<ProfileHeaderTabsProps> = ({
  activeTab,
  onTabChange,
  isFreelance = true,
}) => {
  const tabs: { id: ProfileTab; label: string; freelanceOnly?: boolean }[] = [
    { id: 'personal', label: 'Informations personnelles' },
    { id: 'services', label: 'Service & technologie', freelanceOnly: true },
    { id: 'experience', label: 'Expérience', freelanceOnly: true },
    { id: 'formation', label: 'Formation', freelanceOnly: true },
    { id: 'realisation', label: 'Réalisation', freelanceOnly: true },
  ];

  const visibleTabs = tabs.filter((t) => !t.freelanceOnly || isFreelance);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-1.5 rounded-full bg-[#eeeae3]/70 dark:bg-muted/70 p-1 w-fit">
      {visibleTabs.map((t) => {
        const isActive = activeTab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            className={`rounded-full px-4 py-2 text-[11px] font-semibold transition-all cursor-pointer ${
              isActive
                ? 'bg-white dark:bg-card text-brand-ink dark:text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-brand-ink dark:hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
};

export default ProfileHeaderTabs;
