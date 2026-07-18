'use client';

import React from 'react';
import styled from 'styled-components';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';
import { useRouter } from 'next/navigation';

export type UIMode = 'ghost' | 'hidden' | 'disabled';

interface SystemRestrictionWrapperProps {
  permission?: string;
  flagKey?: string;
  quotaExceeded?: boolean;
  upgradeKey?: string;
  reason?: string;
  fullWidth?: boolean;
  borderRadius?: string;
  children: React.ReactNode;
}

interface WrapperContainerProps {
  $fullWidth?: boolean;
}

const WrapperContainer = styled.div<WrapperContainerProps>`
  position: relative;
  display: ${props => props.$fullWidth ? 'block' : 'inline-block'};
  width: ${props => props.$fullWidth ? '100%' : 'max-content'};
  max-width: 100%;
`;

interface GhostOverlayProps {
  $borderRadius?: string;
}

const GhostOverlay = styled.div<GhostOverlayProps>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  backdrop-filter: none;
  border-radius: ${props => props.$borderRadius || '6px'};
  cursor: not-allowed;
  z-index: 10;
  transition: all 0.2s ease-in-out;
  
  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
`;

export const SystemRestrictionWrapper: React.FC<SystemRestrictionWrapperProps> = ({
  permission,
  flagKey,
  quotaExceeded,
  upgradeKey,
  reason,
  fullWidth = false,
  borderRadius = '6px',
  children
}) => {
  const { user } = useAuth();
  const { showAlert, showConfirm } = useAlert();
  const router = useRouter();

  // Si no hay usuario, no renderizar nada por seguridad
  if (!user) return null;

  // Bypass para administradores de sistema, root o system
  const isSystemAdmin = (user.actorType === 'system_user' && flagKey !== 'withdrawals_enabled') || user.rol === 'root' || user.rol === 'system';

  // 1. Verificar si el usuario tiene el permiso
  const hasPermission = permission ? user.permissions?.includes(permission) : true;
  const permissionMode: UIMode = permission ? (user.permissionModes?.[permission] || 'hidden') : 'hidden';

  // 2. Verificar interruptor de sistema si se definió
  const isFlagActive = flagKey ? (user.systemFlags?.[flagKey] ?? true) : true;

  // Si es system admin, omitir restricciones
  if (isSystemAdmin) {
    return <>{children}</>;
  }

  let finalMode: UIMode | null = null;
  let blockReason = reason || 'No tienes permisos para realizar esta acción.';
  let isUpgradeOffer = false;

  if (!hasPermission) {
    // Si no tiene el permiso, aplicar el modo configurado en la DB
    finalMode = permissionMode;
  } else if (!isFlagActive) {
    // Si tiene el permiso pero el interruptor de sistema está apagado -> forzar GHOST
    finalMode = 'ghost';
    blockReason = 'Esta función ha sido desactivada temporalmente por la administración del sistema.';
  } else if (quotaExceeded) {
    // Si tiene el permiso pero la cuota de inventario se excedió -> forzar GHOST
    finalMode = 'ghost';
    blockReason = reason || 'Has alcanzado el límite de tu plan actual para esta funcionalidad.';
    isUpgradeOffer = true;
  }

  // Si no hay restricción, renderizar normal
  if (!finalMode) {
    return <>{children}</>;
  }

  // Procesar según el modo de restricción final
  if (finalMode === 'hidden') {
    return null;
  }

  if (finalMode === 'disabled') {
    // Intentar clonar el primer hijo y agregarle la prop 'disabled'
    try {
      if (React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<any>, { disabled: true });
      }
    } catch (err) {
      console.error('Error al deshabilitar el componente hijo:', err);
    }
    return <>{children}</>;
  }

  // Modo GHOST: Envolver en un contenedor con overlay interceptor
  const handleOverlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isUpgradeOffer && upgradeKey) {
      showConfirm({
        title: 'Mejora tu plan',
        message: `${blockReason}\n\n¿Deseas ir al mercado de mejoras para adquirir más capacidad?`,
        confirmText: 'Ir a Mejoras',
        cancelText: 'Cancelar',
        onConfirm: () => {
          router.push('/commerce/upgrades');
        }
      });
    } else {
      showAlert({
        title: 'Función no disponible',
        message: blockReason,
        confirmText: 'Entendido'
      });
    }
  };

  return (
    <WrapperContainer $fullWidth={fullWidth} style={{ opacity: finalMode === 'ghost' ? 0.1 : 1 }}>
      {children}
      <GhostOverlay $borderRadius={borderRadius} onClick={handleOverlayClick} />
    </WrapperContainer>
  );
};
