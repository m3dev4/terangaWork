import { instance } from '../api/axios';

// Extract the base URL without the /api/ suffix for media files
const getBackendBaseUrl = (): string => {
  const baseURL = instance.defaults.baseURL || 'http://localhost:8000/api/';
  // Remove /api/ from the end to get the base URL
  return baseURL.replace(/\/api\/?$/, '');
};

export const getMediaUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  
  // If it's already an absolute URL (starts with http://, https://, or data: for base64 images), return as is
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  
  // If it starts with /, it's a relative URL from the backend root
  if (url.startsWith('/')) {
    return `${getBackendBaseUrl()}${url}`;
  }
  
  // Otherwise, assume it's a relative path and prepend /media/ or similar
  return `${getBackendBaseUrl()}/${url}`;
};
