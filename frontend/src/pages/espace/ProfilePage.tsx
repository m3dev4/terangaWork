import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import getCurrentUser from '../../utils/getUser';
import ProfileHeaderTabs, { type ProfileTab } from '../../components/profile/ProfileHeaderTabs';
import PersonalInfoTab from '../../components/profile/PersonalInfoTab';
import ServicesTechTab from '../../components/profile/ServicesTechTab';
import ExperienceTab from '../../components/profile/ExperienceTab';
import FormationTab from '../../components/profile/FormationTab';
import RealisationTab from '../../components/profile/RealisationTab';

const ProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary-terangawork" />
        <p className="text-xs text-neutral-500">Chargement de votre profil...</p>
      </div>
    );
  }

  const isFreelance = user?.role === 'freelance';

  return (
    <div className="mx-auto max-w-270 pb-12">
      <div className="mb-6 border-b border-[#EFECE6] pb-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
          Compte › Mon profil
        </span>
        <h1 className="font-heading text-xl font-bold tracking-tight text-neutral-900 mt-0.5">
          Mon profil
        </h1>
      </div>

      <ProfileHeaderTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isFreelance={isFreelance}
      />

      {/* Active Tab Content */}
      {activeTab === 'personal' && <PersonalInfoTab user={user} />}
      {activeTab === 'services' && <ServicesTechTab user={user} />}
      {activeTab === 'experience' && <ExperienceTab />}
      {activeTab === 'formation' && <FormationTab />}
      {activeTab === 'realisation' && <RealisationTab />}
    </div>
  );
};

export default ProfilePage;
