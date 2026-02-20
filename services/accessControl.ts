import { auth } from './firebase';
import { ViewType } from '../types';

export type UserRole = 'admin' | 'staff';

const getAdminEmails = () => {
  const raw = (import.meta.env.VITE_ADMIN_EMAILS ?? '') as string;
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
};

export const getUserRole = (): UserRole => {
  const currentEmail = auth.currentUser?.email?.toLowerCase() ?? '';
  const admins = getAdminEmails();
  return admins.includes(currentEmail) ? 'admin' : 'staff';
};

export const canAccessView = (view: ViewType): boolean => {
  const role = getUserRole();
  if (role === 'admin') return true;

  // Staff has limited access in v1.
  return ![ViewType.MAINTENANCE, ViewType.DAILY_LOG].includes(view);
};
