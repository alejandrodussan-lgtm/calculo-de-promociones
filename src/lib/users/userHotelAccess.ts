/**
 * userHotelAccess.ts — Hotel access helpers for users
 */

import type { User, UserHotelAccess, AuthSession } from '../../types/auth';

const HOTEL_ACCESS_KEY = 'rmd_hotel_access';

export function getUserHotelAccess(userId: string): UserHotelAccess[] {
  try {
    const all: UserHotelAccess[] = JSON.parse(localStorage.getItem(HOTEL_ACCESS_KEY) || '[]');
    return all.filter(a => a.userId === userId);
  } catch { return []; }
}

export function setUserHotelAccess(userId: string, hotelNames: string[]): void {
  const all: UserHotelAccess[] = JSON.parse(localStorage.getItem(HOTEL_ACCESS_KEY) || '[]').filter(
    (a: UserHotelAccess) => a.userId !== userId
  );
  hotelNames.forEach(hotelName => {
    all.push({ userId, hotelId: hotelName, hotelName });
  });
  localStorage.setItem(HOTEL_ACCESS_KEY, JSON.stringify(all));
}

export function getAllowedHotels(session: AuthSession, allHotels: string[]): string[] {
  if (session.role === 'master_admin' || session.permissions.includes('canViewAllHotels')) {
    return allHotels;
  }
  return allHotels.filter(h => session.hotelAccess.includes(h));
}

export function isHotelAllowed(session: AuthSession, hotelName: string): boolean {
  if (session.role === 'master_admin' || session.permissions.includes('canViewAllHotels')) return true;
  return session.hotelAccess.includes(hotelName);
}
