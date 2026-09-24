import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { TWLogo } from '../assets/images';
import {
  Home,
  Search,
  ListChecks,
  Briefcase,
  MessageSquare,
  Wallet,
  User,
  Settings,
  HelpCircle,
  FileText,
  Megaphone,
  Laptop,
  Users,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import getCurrentUser from '../utils/getUser';

export interface SidebarItemConfig {
  id: string;
  label: string;
  url: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: number | string;
  badgeVariant?: 'orange' | 'gray';
}

export interface SidebarSectionConfig {
  title: string;
  items: SidebarItemConfig[];
}

export const FREELANCE_SIDEBAR_SECTIONS: SidebarSectionConfig[] = [
  {
    title: 'Principal',
    items: [
      { id: 'dashboard', label: 'Tableau de bord', url: '/espace', icon: Home },
      { id: 'espace-projets', label: 'Espace Projets', url: '/espace/projets', icon: Briefcase },
      { id: 'search-missions', label: 'Rechercher une mission', url: '/espace/missions', icon: Search },
      { id: 'candidatures', label: 'Mes candidatures', url: '/espace/candidatures', icon: ListChecks, badge: 12, badgeVariant: 'gray' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { id: 'messages', label: 'Messagerie', url: '/espace/messages', icon: MessageSquare, badge: 3, badgeVariant: 'orange' },
    ],
  },
  {
    title: 'Paiement',
    items: [
      { id: 'paiements-recus', label: 'Paiements reçus', url: '/espace/paiements-recus', icon: Wallet },
    ],
  },
  {
    title: 'Compte',
    items: [
      { id: 'profil', label: 'Mon profil', url: '/espace/profil', icon: User },
      { id: 'parametres', label: 'Paramètres', url: '/espace/parametres', icon: Settings },
    ],
  },
];

export const ANNONCEUR_SIDEBAR_SECTIONS: SidebarSectionConfig[] = [
  {
    title: 'Principal',
    items: [
      { id: 'dashboard', label: 'Tableau de bord', url: '/espace', icon: Home },
      { id: 'espace-projets', label: 'Espace Projets', url: '/espace/projets', icon: Briefcase },
      { id: 'publier-mission', label: 'Publier une mission', url: '/espace/publier-mission', icon: Megaphone },
      { id: 'mes-annonces', label: 'Mes annonces', url: '/espace/mes-annonces', icon: ListChecks },
      { id: 'candidatures-recues', label: 'Candidatures reçues', url: '/espace/candidatures-recues', icon: Laptop, badge: 5, badgeVariant: 'orange' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { id: 'messages', label: 'Messagerie', url: '/espace/messages', icon: MessageSquare, badge: 3, badgeVariant: 'orange' },
    ],
  },
  {
    title: 'Paiement',
    items: [
      { id: 'paiements-effectues', label: 'Paiements effectués', url: '/espace/paiements-effectues', icon: Wallet },
    ],
  },
  {
    title: 'Compte',
    items: [
      { id: 'profil', label: 'Mon profil', url: '/espace/profil', icon: User },
      { id: 'parametres', label: 'Paramètres', url: '/espace/parametres', icon: Settings },
    ],
  },
];

export const ADMIN_SIDEBAR_SECTIONS: SidebarSectionConfig[] = [
  {
    title: 'Principal',
    items: [
      { id: 'dashboard', label: 'Tableau de bord', url: '/espace/admin', icon: Home },
      { id: 'services', label: 'Services', url: '/espace/admin/services', icon: Laptop },
      { id: 'technologies', label: 'Technologies', url: '/espace/admin/technologies', icon: Briefcase },
    ],
  },
  {
    title: 'Modération',
    items: [
      { id: 'signalements', label: 'Modération & Signalements', url: '/espace/admin/signalements', icon: ShieldCheck },
    ],
  },
  {
    title: 'Compte',
    items: [
      { id: 'parametres', label: 'Paramètres', url: '/espace/parametres', icon: Settings },
    ],
  },
];

export const FOOTER_ITEMS: SidebarItemConfig[] = [
  { id: 'aide', label: 'Aide', url: '/espace/aide', icon: HelpCircle },
  { id: 'documents', label: 'Documents', url: '/espace/documents', icon: FileText },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed = false,
  onToggleCollapse,
}) => {
  const location = useLocation();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    retry: false,
  });

  const sections = React.useMemo(() => {
    if (user?.role === 'annonceur') {
      return ANNONCEUR_SIDEBAR_SECTIONS;
    }
    if (user?.role === 'admin' || (user as any)?.is_staff) {
      return ADMIN_SIDEBAR_SECTIONS;
    }
    return FREELANCE_SIDEBAR_SECTIONS;
  }, [user?.role]);

  return (
    <aside
      className={`h-screen bg-white border-r border-[#EFECE6] flex flex-col justify-between transition-all duration-200 select-none z-30 shrink-0 ${
        collapsed ? 'w-14' : 'w-48 lg:w-52'
      }`}
    >
      {/* Top Navigation */}
      <div className="flex flex-col flex-1 overflow-y-auto px-2 py-3">
        {/* Logo */}
        <div className={`flex items-center mb-4 ${collapsed ? 'justify-center' : 'px-1.5'}`}>
          <NavLink to="/" className="flex items-center">
            <img
              src={TWLogo}
              alt="Jëfly"
              className={`w-auto object-contain transition-all duration-200 ${
                collapsed ? 'h-5' : 'h-6'
              }`}
            />
          </NavLink>
        </div>

        {/* Navigation Sections */}
        <div className="flex flex-col space-y-3 flex-1">
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col space-y-0.5">
              {!collapsed && (
                <h4 className="text-[9px] uppercase tracking-wider font-semibold text-neutral-400 px-2 mb-0.5">
                  {section.title}
                </h4>
              )}

              {section.items.map((item) => {
                const Icon = item.icon;
                const isExactDashboard = item.url === '/espace';
                const isActive = isExactDashboard
                  ? location.pathname === '/espace' || location.pathname === '/espace/'
                  : location.pathname.startsWith(item.url);

                if (collapsed) {
                  return (
                    <NavLink
                      key={item.id}
                      to={item.url}
                      end={isExactDashboard}
                      className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center relative transition-all duration-150 ${
                        isActive
                          ? 'bg-[#1b4b6b] text-white shadow-2xs'
                          : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                      }`}
                      title={item.label}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={isActive ? 2 : 1.6} />
                      {/* Orange notification dot */}
                      {!isActive && item.badge !== undefined && (
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#f2994a]" />
                      )}
                    </NavLink>
                  );
                }

                return (
                  <NavLink
                    key={item.id}
                    to={item.url}
                    end={isExactDashboard}
                    className={`relative flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] transition-all group ${
                      isActive
                        ? 'bg-[#F0F4F8] text-[#1b4b6b] font-semibold'
                        : 'text-neutral-600 hover:bg-neutral-100/70 hover:text-neutral-900 font-medium'
                    }`}
                  >
                    {/* Active left orange bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-3.5 bg-[#f2994a] rounded-r-xs" />
                    )}

                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                        isActive
                          ? 'text-[#1b4b6b]'
                          : 'text-neutral-500 group-hover:text-neutral-700'
                      }`}
                      strokeWidth={isActive ? 2 : 1.6}
                    />

                    <span className="truncate flex-1 tracking-tight text-[11px]">
                      {item.label}
                    </span>

                    {item.badge !== undefined && (
                      <span
                        className={`text-[8.5px] px-1.5 py-0.2 rounded-full font-bold leading-none ${
                          item.badgeVariant === 'orange'
                            ? 'bg-[#f2994a] text-white'
                            : 'bg-neutral-100 text-neutral-500'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer Section */}
      <div className="p-2 border-t border-[#EFECE6] bg-white space-y-0.5">
        {FOOTER_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.url);

          if (collapsed) {
            return (
              <NavLink
                key={item.id}
                to={item.url}
                className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-[#1b4b6b] text-white'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
                title={item.label}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.6} />
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.id}
              to={item.url}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] transition-all ${
                isActive
                  ? 'bg-[#F0F4F8] text-[#1b4b6b] font-semibold'
                  : 'text-neutral-500 hover:bg-neutral-100/70 hover:text-neutral-900 font-medium'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.6} />
              <span className="truncate tracking-tight text-[11px]">{item.label}</span>
            </NavLink>
          );
        })}

        {/* Collapse button */}
        {collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-6 h-6 rounded-full border border-neutral-200 bg-white shadow-2xs flex items-center justify-center hover:bg-neutral-50 text-neutral-600 transition-all mx-auto mt-1.5 cursor-pointer"
            title="Agrandir le menu"
          >
            <ChevronRight className="w-3 h-3 text-neutral-500" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-full flex items-center gap-2 px-2 py-1 mt-0.5 rounded-md text-neutral-400 hover:bg-neutral-100/70 hover:text-neutral-700 transition-colors cursor-pointer"
          >
            <div className="w-3.5 h-3.5 rounded-full border border-neutral-300 flex items-center justify-center shrink-0">
              <ChevronLeft className="w-2.5 h-2.5 text-neutral-500" />
            </div>
            <span className="text-[10px] text-neutral-400 tracking-tight">
              Réduire le menu
            </span>
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
