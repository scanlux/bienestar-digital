export interface User {
  id: number;
  email: string;
  nombre: string;
  actorType?: 'user' | 'system_user' | 'operator';
  rol?: 'admin' | 'customer' | 'delivery' | 'operator' | 'root' | 'system';
  adminType?: 'commerce' | 'store' | 'delivery_company';
  commerceId?: number;
  storeIds?: number[];
  deliveryCompanyId?: number;
  permissions?: string[];
  permissionModes?: Record<string, 'ghost' | 'hidden' | 'disabled'>;
  systemFlags?: Record<string, boolean>;
  roles?: string[];
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, loginType?: 'business' | 'operator' | 'system') => Promise<void>;
  logout: (reason?: 'session_expired' | 'logged_out' | 'security_update' | any) => void;
  refreshSession: () => Promise<void>;
  isLoading: boolean;
  maintenanceMode: boolean;
  triggerMaintenance: () => void;
  isOffline: boolean;
}
