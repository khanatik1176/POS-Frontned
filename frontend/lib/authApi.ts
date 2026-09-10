import { apiFetch } from './api';

export type CurrentUser = {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
};

export async function getCurrentUser(): Promise<CurrentUser> {
  return apiFetch<CurrentUser>('/auth/me/');
}
