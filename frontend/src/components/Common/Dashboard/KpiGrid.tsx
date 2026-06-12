import React from 'react';
import styled from 'styled-components';

interface KpiGridProps {
  children: React.ReactNode;
  className?: string;
}

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
`;

export const KpiGrid: React.FC<KpiGridProps> = ({ children, className }) => {
  return <Grid className={className}>{children}</Grid>;
};
