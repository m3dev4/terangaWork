import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type {
  AuthResponse,
  Login,
  Register,
  VerifyEmail,
} from '../interfaces/authInterface';
import {
  LoginValidation,
  RegisterValidation,
  VerifyEmailValidation,
} from '../validations/authValidate';
import { instance } from '../api/axios';
import { toast } from '../components/ui/toast';
import { getErrorMessage } from '../utils/errorMessage';
import { validateOrThrow } from '../utils/validtionOrThrow';

/** Inscrit un utilisateur après validation Zod et affiche le résultat via toast. */
export const useRegister = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation<AuthResponse, Error, Register>({
    mutationFn: async (data) => {
      const payload = validateOrThrow(RegisterValidation.safeParse(data));
      const response = await instance.post<AuthResponse>(
        'auth/register/',
        payload
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.removeQueries({ queryKey: ['auth', 'me'] });
      sessionStorage.setItem('verification_email', variables.email);
      toast.add({
        title: 'Inscription réussie',
        description: data.message || 'Vérifiez votre adresse email.',
        type: 'success',
      });
      navigate('/verify-email', { state: { email: variables.email } });
    },
    onError: (error) => {
      toast.add({
        title: 'Inscription impossible',
        description: getErrorMessage(
          error,
          'Vérifiez les informations saisies.'
        ),
        type: 'error',
      });
    },
  });
};

/** Vérifie le code email à six chiffres après validation Zod. */
export const useVerifyEmail = () => {
  const navigate = useNavigate();

  return useMutation<AuthResponse, Error, VerifyEmail>({
    mutationFn: async (data) => {
      const { email, code } = VerifyEmailValidation.parse(data);
      const response = await instance.post<AuthResponse>('auth/verify-email/', {
        email,
        code,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.add({
        title: 'Email vérifié',
        description: data.message || 'Votre compte est maintenant actif.',
        type: 'success',
      });
      sessionStorage.removeItem('verification_email');
      navigate('/login');
    },
    onError: (error) => {
      toast.add({
        title: 'Vérification impossible',
        description: getErrorMessage(error, 'Le code est invalide ou expiré.'),
        type: 'error',
      });
    },
  });
};

/** Authentifie un utilisateur, conserve les JWT et prépare le cache utilisateur. */
export const useLogin = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation<AuthResponse, Error, Login>({
    mutationFn: async (data) => {
      const payload = validateOrThrow(LoginValidation.safeParse(data));
      const response = await instance.post<AuthResponse>(
        'auth/login/',
        payload
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.access) {
        localStorage.setItem('access_token', data.access);
      }
      if (data.refresh) {
        localStorage.setItem('refresh_token', data.refresh);
      }
      if (data.user) {
        queryClient.setQueryData(['currentUser'], data.user);
        queryClient.setQueryData(['auth', 'me'], data.user);
      } else {
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      }
      toast.add({
        title: 'Connexion réussie',
        description: data.message || 'Bienvenue sur Jëfly.',
        type: 'success',
      });
      if (data.user?.role === 'admin' || (data.user as any)?.is_staff || (data.user as any)?.is_superuser) {
        navigate('/espace/admin');
      } else if (data.user?.onboarding_completed) {
        navigate('/espace');
      } else {
        navigate('/onboarding');
      }
    },
    onError: (error) => {
      toast.add({
        title: 'Connexion impossible',
        description: getErrorMessage(error, 'Email ou mot de passe incorrect.'),
        type: 'error',
      });
    },
  });
};
