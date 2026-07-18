import { useAuth } from '@/context/AuthContext';

export type UIMode = 'ghost' | 'hidden' | 'disabled';

export function usePermission(permission: string) {
  const { user } = useAuth();
  
  // Si no hay usuario, por defecto denegar
  if (!user) {
    return { hasPermission: false, mode: 'hidden' as UIMode };
  }
  
  // bypass para root y system users (en rutas de admin)
  const isSystemAdmin = user.actorType === 'system_user' || user.rol === 'root' || user.rol === 'system';
  if (isSystemAdmin) {
    return { hasPermission: true, mode: 'ghost' as UIMode }; // bypass total
  }

  const hasPermission = user.permissions?.includes(permission) ?? false;
  const mode: UIMode = user.permissionModes?.[permission] ?? 'hidden';
  
  return { hasPermission, mode };
}

export function useSystemFlag(flagKey: string): boolean {
  const { user } = useAuth();
  return user?.systemFlags?.[flagKey] ?? false;
}
