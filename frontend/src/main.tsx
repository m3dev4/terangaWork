import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App.tsx';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import AuthLayout from './pages/auth/authLayout.tsx';
import Login from './pages/auth/login/Login.tsx';
import Register from './pages/auth/register/Register.tsx';
import VerifyMail from './pages/auth/verifyEmail/verifyMail.tsx';
import PasswordRecovery from './pages/auth/passwordRecovery/passwordRecovery.tsx';
import NewPassword from './pages/auth/newPassword/newPassword.tsx';
import { Toaster } from './components/ui/toast';
import Onboarding from './pages/onboarding/onboarding.tsx';
import ProtectedRoute from './components/protectedRoute.tsx';
import PublicOnlyRoute from './components/publicOnlyRoute.tsx';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import EspaceLayout from './pages/espace/espaceLayout.tsx';
import DashboardOverview from './pages/espace/DashboardOverview.tsx';
import PlaceholderPage from './pages/espace/PlaceholderPage.tsx';
import MissionFormPage from './pages/espace/MissionFormPage.tsx';
import MissionsPage from './pages/espace/MissionsPage.tsx';
import FreelanceMissionsPage from './pages/espace/FreelanceMissionsPage.tsx';
import MissionDetailPage from './pages/espace/MissionDetailPage.tsx';
import CandidaturesRecuesPage from './pages/espace/annonceur/CandidaturesRecuesPage.tsx';
import AnnonceurEspacePage from './pages/espace/annonceur/AnnonceurEspacePage.tsx';
import FreelanceMesMissionsPage from './pages/espace/freelance/FreelanceMesMissionsPage.tsx';
import ProjectWorkspacePage from './pages/espace/workspace/ProjectWorkspacePage.tsx';
import ProfilePage from './pages/espace/ProfilePage.tsx';
import SettingsPage from './pages/espace/SettingsPage.tsx';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  // Authentication routes (accessible only when not logged in)
  {
    element: (
      <PublicOnlyRoute>
        <AuthLayout />
      </PublicOnlyRoute>
    ),
    children: [
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
      { path: '/verify-email', element: <VerifyMail /> },
      { path: '/password-recovery', element: <PasswordRecovery /> },
      { path: '/new-password', element: <NewPassword /> },
    ],
  },
  // Onboarding route (protected)
  {
    path: '/onboarding',
    element: (
      <ProtectedRoute>
        <Onboarding />
      </ProtectedRoute>
    ),
  },
  // Espace Dashboard routes (protected)
  {
    path: '/espace',
    element: (
      <ProtectedRoute>
        <EspaceLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '', element: <DashboardOverview /> },
      // Freelance routes
      {
        path: 'missions',
        element: <FreelanceMissionsPage />,
      },
      {
        path: 'missions/:missionId',
        element: <MissionDetailPage />,
      },
      {
        path: 'candidatures',
        element: <FreelanceMesMissionsPage />,
      },
      {
        path: 'mes-missions',
        element: <FreelanceMesMissionsPage />,
      },
      {
        path: 'paiements-recus',
        element: <FreelanceMesMissionsPage />,
      },
      // Annonceur routes
      {
        path: 'publier-mission',
        element: <MissionFormPage />,
      },
      {
        path: 'mes-annonces',
        element: <MissionsPage />,
      },
      {
        path: 'mes-annonces/:missionId/modifier',
        element: <MissionFormPage />,
      },
      {
        path: 'projets',
        element: <ProjectWorkspacePage />,
      },
      {
        path: 'candidatures-recues',
        element: <CandidaturesRecuesPage />,
      },
      {
        path: 'paiements-effectues',
        element: <AnnonceurEspacePage />,
      },
      // Shared routes
      {
        path: 'messages',
        element: (
          <PlaceholderPage
            title="Messagerie"
            description="Échangez directement avec vos clients et collaborateurs."
          />
        ),
      },
      {
        path: 'profil',
        element: <ProfilePage />,
      },
      {
        path: 'parametres',
        element: <SettingsPage />,
      },
      {
        path: 'aide',
        element: (
          <PlaceholderPage
            title="Centre d'aide"
            description="Consultez notre documentation et guides pour utiliser au mieux JeFly."
          />
        ),
      },
      {
        path: 'documents',
        element: (
          <PlaceholderPage
            title="Documents"
            description="Accédez à l'ensemble de vos contrats, factures et documents officiels."
          />
        ),
      },
    ],
  },
]);

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Toaster>
        <RouterProvider router={router} />
        <ReactQueryDevtools initialIsOpen={false} />
      </Toaster>
    </QueryClientProvider>
  </StrictMode>
);
