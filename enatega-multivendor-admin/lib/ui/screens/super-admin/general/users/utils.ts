import { IUserResponse } from '@/lib/utils/interfaces/users.interface';
export function customerDate(value?: string) {
  if (!value) return null;
  const date = new Date(/^\d+$/.test(value) ? Number(value) : value);
  return Number.isNaN(date.getTime()) ? null : date;
}
export function customerMethod(user: IUserResponse) {
  const method = (user.registrationMethod || user.userType || '').toLowerCase();
  return (
    (
      {
        google: 'Google',
        apple: 'Apple',
        phone: 'Phone',
        default: 'Email',
        email: 'Email',
        manual: 'Email',
      } as Record<string, string>
    )[method] || 'Unknown'
  );
}
export function customerStatus(user: IUserResponse) {
  return (
    (
      {
        active: 'Active',
        blocked: 'Blocked',
        deactivate: 'Inactive',
        deactivated: 'Inactive',
        inactive: 'Inactive',
      } as Record<string, string>
    )[user.status?.toLowerCase()] || 'Unknown'
  );
}
