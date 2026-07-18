import React from 'react';
import styled from 'styled-components';

const FilterContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 1rem;
  backdrop-filter: blur(8px);
  width: 100%;
`;

const ButtonGroup = styled.div`
  display: flex;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 2px;
`;

const FilterButton = styled.button<{ $active: boolean }>`
  background: ${props => props.$active ? 'var(--emerald)' : 'transparent'};
  color: ${props => props.$active ? '#000' : 'rgba(255, 255, 255, 0.7)'};
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1.25rem;
  font-size: 0.9rem;
  font-weight: ${props => props.$active ? '600' : '400'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: ${props => props.$active ? '#000' : '#fff'};
    background: ${props => props.$active ? 'var(--emerald)' : 'rgba(255, 255, 255, 0.05)'};
  }
`;

const SelectMonth = styled.select`
  background: rgba(0, 0, 0, 0.25);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  outline: none;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    border-color: var(--emerald);
  }

  option {
    background: #111;
    color: #fff;
  }
`;

const RightSection = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
`;

interface FinancialFiltersBarProps {
  filterType: 'day' | 'week' | 'month';
  onFilterChange: (type: 'day' | 'week' | 'month') => void;
  monthOptions: string[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  children?: React.ReactNode;
  rightContent?: React.ReactNode;
}

export const FinancialFiltersBar: React.FC<FinancialFiltersBarProps> = ({
  filterType,
  onFilterChange,
  monthOptions,
  selectedMonth,
  onMonthChange,
  children,
  rightContent
}) => {
  return (
    <FilterContainer>
      {children}
      
      <ButtonGroup>
        <FilterButton
          $active={filterType === 'day'}
          onClick={() => onFilterChange('day')}
        >
          Día
        </FilterButton>
        <FilterButton
          $active={filterType === 'week'}
          onClick={() => onFilterChange('week')}
        >
          Esta Semana
        </FilterButton>
        <FilterButton
          $active={filterType === 'month'}
          onClick={() => onFilterChange('month')}
        >
          Mes
        </FilterButton>
      </ButtonGroup>

      {filterType === 'month' && monthOptions.length > 0 && (
        <SelectMonth
          value={selectedMonth}
          onChange={(e) => onMonthChange(e.target.value)}
        >
          {monthOptions.map((opt: string) => {
            const [y, m] = opt.split('-');
            const date = new Date(parseInt(y), parseInt(m) - 1, 1);
            const monthName = date.toLocaleString('es-CO', { month: 'long', year: 'numeric' });
            const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
            return (
              <option key={opt} value={opt}>
                {capitalizedMonth}
              </option>
            );
          })}
        </SelectMonth>
      )}

      {rightContent && (
        <RightSection>
          {rightContent}
        </RightSection>
      )}
    </FilterContainer>
  );
};
