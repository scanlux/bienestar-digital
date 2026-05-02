'use client';
import styled from 'styled-components';

export const SedeEstadoBadge = styled.span<{ estado: string }>`
  font-size: 0.85rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  letter-spacing: 0.5px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  background: ${({ estado }) =>
    estado === 'operativo' ? 'rgba(16, 185, 129, 0.35)' :
    estado === 'mantenimiento' ? 'rgba(234, 179, 8, 0.35)' :
    estado === 'vacaciones' ? 'rgba(249, 115, 22, 0.35)' :
    'rgba(239, 68, 68, 0.35)'};
  border: 1px solid ${({ estado }) =>
    estado === 'operativo' ? 'rgba(16, 185, 129, 0.5)' :
    estado === 'mantenimiento' ? 'rgba(234, 179, 8, 0.5)' :
    estado === 'vacaciones' ? 'rgba(249, 115, 22, 0.5)' :
    'rgba(239, 68, 68, 0.5)'};
  color: ${({ estado }) =>
    estado === 'operativo' ? '#34d399' :
    estado === 'mantenimiento' ? '#fde047' :
    estado === 'vacaciones' ? '#fdba74' :
    '#fca5a5'};
`;

export const StoreHeroCard = styled.div<{ $bgImage?: string }>`
  position: relative;
  width: 100%;
  min-height: 200px;
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 20px;
  display: flex;
  background-color: #111;
  background-image: ${p => p.$bgImage ? `url("${p.$bgImage}")` : 'none'};
  background-size: cover;
  background-position: top;
  border: 1px solid rgba(255, 255, 255, 0.05);

  .hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 40%, rgba(13, 33, 16, 0.85) 100%);
    z-index: 1;
  }

  .hero-content {
    position: relative;
    z-index: 2;
    padding: 30px;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 30px;
  }

  .hero-left {
    display: flex;
    flex-direction: column;
    gap: 20px;
    flex: 1;

    .super-title {
      font-size: 2rem;
      font-weight: 800;
      color: #fff;
      margin: 0;
      letter-spacing: -0.01em;
      text-shadow: 0 2px 10px rgba(0,0,0,0.5);
    }
  }

  @media (max-width: 768px) {
    .hero-content { flex-direction: column; align-items: flex-start; }
  }
`;
