'use client';

import styled, { keyframes } from 'styled-components';

export const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const Container = styled.div`
  color: white;
  animation: ${fadeIn} 0.3s ease-out;
  padding: 1.5rem;
`;

export const Header = styled.div`
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
`;

export const TitleContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

export const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, #ffffff 0%, #a3a3a3 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

export const Subtitle = styled.p`
  color: #a3a3a3;
  font-size: 0.95rem;
`;

// Tabs System
export const TabContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
`;

export const TabButton = styled.button<{ $active: boolean }>`
  background: none;
  border: none;
  color: ${p => p.$active ? '#10b981' : '#737373'};
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.5rem 1rem;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;

  &:hover {
    color: ${p => p.$active ? '#10b981' : '#e5e5e5'};
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -0.5rem;
    left: 0;
    right: 0;
    height: 2px;
    background: #10b981;
    transform: scaleX(${p => p.$active ? 1 : 0});
    transition: transform 0.2s ease;
  }
`;

// Actions Section
export const ActionHeader = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
`;

// Table and list styles
export const TableContainer = styled.div`
  background: rgba(18, 18, 18, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 0.5rem;
  overflow-x: auto;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }
  
  th {
    color: #a3a3a3;
    font-weight: 600;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  tbody tr {
    transition: background 0.15s ease;
    &:hover {
      background: rgba(255, 255, 255, 0.02);
    }
  }
`;

// Badges
export const BadgeBase = styled.span`
  background: rgba(255, 255, 255, 0.06);
  color: #d4d4d4;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-family: monospace;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

export const BadgeRole = styled.span`
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  margin-right: 0.35rem;
  display: inline-block;
  border: 1px solid rgba(16, 185, 129, 0.2);
`;

export const BadgeStatus = styled.span<{ $type: 'active' | 'banned' | 'inactive' | 'locked' }>`
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;

  ${p => p.$type === 'active' && `
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.2);
  `}
  ${p => (p.$type === 'banned' || p.$type === 'inactive') && `
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.2);
  `}
  ${p => p.$type === 'locked' && `
    background: rgba(249, 115, 22, 0.1);
    color: #f97316;
    border: 1px solid rgba(249, 115, 22, 0.2);
  `}
`;

// Action buttons
export const ActionButtonContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const IconButton = styled.button<{ $variant?: 'primary' | 'danger' | 'warning' | 'info' }>`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #e5e5e5;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${p => {
      if (p.$variant === 'primary') return '#10b981';
      if (p.$variant === 'danger') return 'rgba(239, 68, 68, 0.2)';
      if (p.$variant === 'warning') return 'rgba(249, 115, 22, 0.2)';
      return 'rgba(255,255,255,0.1)';
    }};
    color: ${p => p.$variant === 'primary' ? 'black' : 'white'};
    border-color: ${p => {
      if (p.$variant === 'primary') return '#10b981';
      if (p.$variant === 'danger') return '#ef4444';
      if (p.$variant === 'warning') return '#f97316';
      return 'rgba(255,255,255,0.2)';
    }};
    transform: translateY(-1px);
  }
`;

export const Button = styled.button<{ $secondary?: boolean }>`
  background: ${p => p.$secondary ? 'rgba(255, 255, 255, 0.05)' : '#10b981'};
  color: ${p => p.$secondary ? 'white' : 'black'};
  border: 1px solid ${p => p.$secondary ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;

  &:hover {
    background: ${p => p.$secondary ? 'rgba(255, 255, 255, 0.08)' : '#059669'};
    transform: translateY(-1px);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

// Form layouts
export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.25rem;

  label {
    font-size: 0.85rem;
    color: #a3a3a3;
    font-weight: 500;
  }
`;

export const Input = styled.input`
  background: #18181b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: white;
  font-size: 0.95rem;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: #10b981;
  }
`;

export const Select = styled.select`
  background: #18181b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: white;
  font-size: 0.95rem;
  transition: border-color 0.2s ease;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #10b981;
  }
`;

export const TextArea = styled.textarea`
  background: #18181b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: white;
  font-size: 0.95rem;
  min-height: 80px;
  resize: vertical;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: #10b981;
  }
`;

export const ModalBody = styled.div`
  padding: 1.5rem 0;
  overflow-y: auto;
`;

export const SectionTitle = styled.h4`
  color: #fff;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 1.5rem 0 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 0.25rem;
`;

export const CheckboxList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const CheckboxLabel = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background 0.15s ease;
  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
  input { 
    transform: scale(1.2); 
    margin-top: 0.25rem;
    cursor: pointer;
  }
`;

export const RoleDesc = styled.span`
  display: block;
  font-size: 0.8rem;
  color: #737373;
  font-weight: 400;
  margin-top: 0.15rem;
`;

export const InheritedPermsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  max-height: 150px;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 0.75rem;
  border-radius: 8px;
`;

export const PermChip = styled.span`
  background: rgba(255, 255, 255, 0.05);
  color: #a3a3a3;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-family: monospace;
`;

export const ModalFooter = styled.div`
  padding: 1.5rem 0 0 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
`;
