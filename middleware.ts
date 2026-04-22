/**
 * Middleware für Authentication und Role-Based Access Control
 * Schützt die Dashboard-Routen vor unbefugtem Zugriff
 */

import { NextResponse, type NextRequest } from 'next/server';

// Geschützte Routen - nur für bestimmte Rollen zugänglich
const protectedRoutes: Record<string, string[]> = {
  '/geschaeftsfuehrer': ['admin'],
  '/mitarbeiter': ['employee'],
  '/partner': ['partner'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Prüfen ob die Route geschützt ist
  const matchedRoute = Object.entries(protectedRoutes).find(([route]) =>
    pathname.startsWith(route)
  );

  // Nicht-geschützte Routen durchlassen (Landing Page, Login, API, etc.)
  if (!matchedRoute) {
    return NextResponse.next();
  }

  const [, allowedRoles] = matchedRoute;

  // Auth-Session prüfen (aus Cookies, die beim Login gesetzt werden)
  const authToken = request.cookies.get('sb-access-token')?.value;
  const userRole = request.cookies.get('user-role')?.value;

  // Keine Session = zur Login-Seite
  if (!authToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Rolle prüfen
  if (!userRole || !allowedRoles.includes(userRole)) {
    // Benutzer hat nicht die richtige Rolle → zurück zum Login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Konfiguration: nur auf geschützte Routen anwenden
export const config = {
  matcher: [
    '/geschaeftsfuehrer/:path*',
    '/mitarbeiter/:path*',
    '/partner/:path*',
  ],
};
