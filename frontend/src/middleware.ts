import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  const isAdminDashboard = pathname.startsWith('/admin/dashboard');
  const isCommerce = pathname.startsWith('/commerce');
  const isDeliveryCompany = pathname.startsWith('/delivery-company');
  const isDelivery = pathname.startsWith('/delivery') && !pathname.startsWith('/delivery-company');
  const isCustomerApp = pathname.startsWith('/app');

  if (!isAdminDashboard && !isCommerce && !isDeliveryCompany && !isDelivery && !isCustomerApp) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    if (isAdminDashboard) {
      return NextResponse.redirect(new URL('/logins', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('JWT inválido');
    }
    
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const user = JSON.parse(jsonPayload);

    // 1. Admin Dashboard (/admin/dashboard/*)
    if (isAdminDashboard) {
      if (user.actorType !== 'system_user') {
        return NextResponse.redirect(new URL('/logins', request.url));
      }
    }

    // 2. Commerce Dashboard (/commerce/*)
    if (isCommerce) {
      // Permitimos commerce_manager (adminType === 'commerce'), store_admin (adminType === 'store'), system_manager/root, u operador
      const isOperator = user.actorType === 'operator' || user.rol === 'operator';
      const isCommerceStaff = user.adminType === 'commerce' || user.adminType === 'store';
      if (!isCommerceStaff && user.actorType !== 'system_user' && !isOperator) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }

    // 3. Delivery Company (/delivery-company/*)
    if (isDeliveryCompany) {
      if (user.adminType !== 'delivery_company' && user.actorType !== 'system_user') {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }

    // 4. Delivery Driver (/delivery/*)
    if (isDelivery) {
      if (user.rol !== 'delivery' && !user.roles?.includes('driver')) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }

    // 5. Customer App (/app/*)
    if (isCustomerApp) {
      if (user.rol !== 'customer' && !user.roles?.includes('customer')) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Error parseando JWT en middleware:', error);
    const response = NextResponse.redirect(new URL(isAdminDashboard ? '/logins' : '/login', request.url));
    response.cookies.delete('auth_token');
    return response;
  }
}

export const config = {
  matcher: [
    '/admin/dashboard/:path*',
    '/commerce/:path*',
    '/delivery-company/:path*',
    '/delivery/:path*',
    '/app/:path*',
  ],
};
