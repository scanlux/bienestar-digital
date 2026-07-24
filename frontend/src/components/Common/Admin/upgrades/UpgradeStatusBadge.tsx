import React from 'react';
import styled from 'styled-components';

export type BadgeVariant = 'success' | 'danger' | 'info' | 'warning' | 'neutral';

const StyledBadge = styled.span<{ $variant: BadgeVariant }>`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 4px 8px;
  border-radius: 6px;
  background: ${props => 
    props.$variant === 'success' ? 'rgba(16, 185, 129, 0.1)' : 
    props.$variant === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 
    props.$variant === 'info' ? 'rgba(59, 130, 246, 0.1)' : 
    props.$variant === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => 
    props.$variant === 'success' ? '#10b981' : 
    props.$variant === 'danger' ? '#ef4444' : 
    props.$variant === 'info' ? '#3b82f6' : 
    props.$variant === 'warning' ? '#f59e0b' : 'rgba(255, 255, 255, 0.6)'};
  border: 1px solid ${props => 
    props.$variant === 'success' ? 'rgba(16, 185, 129, 0.15)' : 
    props.$variant === 'danger' ? 'rgba(239, 68, 68, 0.15)' : 
    props.$variant === 'info' ? 'rgba(59, 130, 246, 0.15)' : 
    props.$variant === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.08)'};
`;

interface UpgradeStatusBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const UpgradeStatusBadge: React.FC<UpgradeStatusBadgeProps> = ({ variant, children, style }) => {
  return <StyledBadge $variant={variant} style={style}>{children}</StyledBadge>;
};

export default UpgradeStatusBadge;
