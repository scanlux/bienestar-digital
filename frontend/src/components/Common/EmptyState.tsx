import React from 'react';
import styled from 'styled-components';

interface EmptyStateProps {
  icon?: React.ReactNode;
  message: string | React.ReactNode;
  children?: React.ReactNode;
}

const EmptyStateContainer = styled.div`
  text-align: center;
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
  
  .e-icon {
    font-size: 2rem;
    opacity: 0.15;
    color: #fff;
  }
  
  p {
    color: rgba(255, 255, 255, 0.25);
    font-size: 0.9rem;
    font-weight: 600;
    margin: 0;
    max-width: 400px;
    line-height: 1.5;
  }
`;

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, message, children }) => {
  return (
    <EmptyStateContainer>
      {icon && <span className="e-icon">{icon}</span>}
      <p>{message}</p>
      {children}
    </EmptyStateContainer>
  );
};
