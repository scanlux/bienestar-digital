'use client';
import styled, { keyframes } from 'styled-components';
import { fadeIn } from './UIElements';

export { fadeIn };

export const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
  padding: 1.5rem;
  color: #fff;
  min-height: 80vh;
  animation: ${fadeIn} 0.3s ease-out forwards;
`;

export const HeaderSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const PageTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin: 0;
  background: linear-gradient(90deg, #fff 0%, #aaa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

export const PageSubtitle = styled.p`
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
`;

export const Divider = styled.hr`
  border: 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 1.5rem 0;
`;

export const SearchWrapper = styled.div`
  position: relative;
  flex: 1.4;
  max-width: 980px;
`;

export const SearchInput = styled.input`
  width: 100%;
  background: #fff;
  border: none;
  padding: 0.6rem 1.25rem 0.6rem 3rem;
  border-radius: 4px;
  color: #333;
  font-size: 0.95rem;
  outline: none;
  
  &::placeholder {
    color: #666;
    font-size: 1.1rem;
    font-weight: 500;
  }
`;

export const SearchIconIcon = styled.svg`
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.25rem;
  height: 1.25rem;
  color: #666;
  pointer-events: none;
`;
