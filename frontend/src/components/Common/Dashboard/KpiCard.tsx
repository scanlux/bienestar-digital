import React from 'react';
import styled, { keyframes, css } from 'styled-components';

const pulseGreen = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
`;

const pulseRed = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(255, 95, 95, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(255, 95, 95, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 95, 95, 0); }
`;

export interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: boolean;
  accentColor?: string; // 'green' | 'blue'
  pulse?: 'green' | 'red';
  tag?: string;
  tagVariant?: 'default' | 'info' | 'error' | 'success' | 'blue';
  progressBarPercentage?: number;
  onClick?: () => void;
  className?: string;
}

const CardContainer = styled.div<{ 
  $accent?: boolean; 
  $accentColor?: string; 
  $pulse?: 'green' | 'red'; 
  $interactive?: boolean 
}>`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 24px;
  border-radius: 24px;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  gap: 20px;
  transition: all 0.2s ease;

  ${props => props.$interactive && css`
    cursor: pointer;
    &:hover {
      background: ${props.$accentColor === 'blue' ? 'rgba(59, 130, 246, 0.04)' : 'rgba(16, 185, 129, 0.04)'};
      border-color: ${props.$accentColor === 'blue' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(16, 185, 129, 0.25)'};
      transform: translateY(-2px);
    }
  `}

  ${props => props.$accent && css`
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
    
    ${props.$accentColor === 'blue' && css`
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
      border-color: rgba(59, 130, 246, 0.15);
      .icon { color: #3b82f6; background: rgba(59, 130, 246, 0.1); }
    `}

    ${(props.$accentColor === 'green' || !props.$accentColor) && css`
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
      border-color: rgba(16, 185, 129, 0.15);
      .icon { color: var(--emerald); background: rgba(16, 185, 129, 0.1); }
    `}
  `}

  ${props => props.$pulse === 'green' && css`
    border-color: rgba(16, 185, 129, 0.2);
    animation: ${pulseGreen} 2s infinite;
  `}

  ${props => props.$pulse === 'red' && css`
    border-color: rgba(255, 95, 95, 0.2);
    animation: ${pulseRed} 2s infinite;
    .icon { color: #ff5f5f; background: rgba(255, 95, 95, 0.1); }
  `}

  .icon {
    width: 52px;
    height: 52px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
  }

  .data {
    display: flex;
    flex-direction: column;
    .label { 
      font-size: 11px; 
      font-weight: 700; 
      color: rgba(255, 255, 255, 0.3); 
      text-transform: uppercase; 
      letter-spacing: 0.05em; 
    }
    .value { 
      font-size: 1.75rem; 
      font-weight: 800; 
      color: #fff; 
    }
  }

  .progress-bg {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: rgba(255, 255, 255, 0.02);
    .progress-bar { 
      height: 100%; 
      background: var(--emerald, #10b981); 
      opacity: 0.3; 
    }
  }
`;

const TagWrapper = styled.div<{ $variant?: string }>`
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 8px;
  font-weight: 900;
  padding: 4px 8px;
  border-radius: 6px;
  text-transform: uppercase;

  ${props => {
    switch (props.$variant) {
      case 'error':
        return `
          background: #ff5f5f;
          color: #fff;
        `;
      case 'blue':
        return `
          background: #3b82f6;
          color: #fff;
        `;
      case 'info':
        return `
          background: var(--emerald, #10b981);
          color: #fff;
        `;
      case 'success':
      default:
        return `
          background: var(--emerald, #10b981);
          color: #000;
        `;
    }
  }}
`;

export const KpiCard: React.FC<KpiCardProps> = ({
  icon,
  label,
  value,
  accent = false,
  accentColor = 'green',
  pulse,
  tag,
  tagVariant = 'default',
  progressBarPercentage,
  onClick,
  className
}) => {
  return (
    <CardContainer
      $accent={accent}
      $accentColor={accentColor}
      $pulse={pulse}
      $interactive={!!onClick}
      onClick={onClick}
      className={className}
    >
      <div className="icon">{icon}</div>
      <div className="data">
        <span className="label">{label}</span>
        <span className="value">{value}</span>
      </div>
      {tag && <TagWrapper $variant={tagVariant}>{tag}</TagWrapper>}
      {progressBarPercentage !== undefined && (
        <div className="progress-bg">
          <div className="progress-bar" style={{ width: `${progressBarPercentage}%` }} />
        </div>
      )}
    </CardContainer>
  );
};
