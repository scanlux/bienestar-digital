export interface DisplayUser {
  rol?: 'admin' | 'customer' | 'delivery' | 'operator' | 'root' | 'system' | string;
  adminType?: 'commerce' | 'store' | 'delivery_company' | string | null;
}

/**
 * Determina si el usuario debe visualizar la wallet en Modo Billetera COP (DOMICOR Cliente).
 * El cliente (customer) visualiza siempre en COP de forma prominente con escolta en Pts Ð.
 * Los administradores, comercios y repartidores visualizan el formato estándar de DOMI.
 */
export function isCustomerWalletView(user: DisplayUser | null | undefined): boolean {
  if (!user) return false;
  // Debe ser explícitamente customer y no tener ningún rol administrativo secundario
  return user.rol === 'customer' && !user.adminType;
}
