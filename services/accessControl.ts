import { ViewType } from '../types';

export type UserRole = 'user';

export const getUserRole = (): UserRole => {
  return 'user';
};

export const canAccessView = (view: ViewType): boolean => {
  void view;
  return true;
};
