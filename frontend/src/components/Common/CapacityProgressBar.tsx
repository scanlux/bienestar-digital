'use client';

import React from 'react';
import styled from 'styled-components';
import { calculateCapacity } from '@/utils/capacity';
import { AnimatedProgressBar } from './AnimatedProgressBar';

interface CapacityProgressBarProps {
  label: string;
  /** Cantidad de recursos consumidos o creados (opcional si se provee percent directamente) */
  used?: number;
  /** Límite máximo permitido. Si es null, se considera ilimitado (opcional si se provee percent directamente) */
  max?: number | null;
  /** Porcentaje de llenado directo a pintar (opcional, útil para buffs o tiempos dinámicos) */
  percent?: number;
  /** Texto personalizado a mostrar en la esquina superior derecha (opcional, ej. "30 días restantes") */
  rightText?: string;
  /** Forzar el estado de límite excedido (opcional) */
  isExceeded?: boolean;
  /** Forzar el estado de ilimitado con gradiente azul-verde (opcional) */
  isUnlimited?: boolean;
}

/**
 * Componente unificado y modular para representar barras de progreso, capacidades,
 * límites de sede y tiempo restante de Buffs activos con animación de carga de entrada.
 */
export const CapacityProgressBar: React.FC<CapacityProgressBarProps> = ({
  label,
  used,
  max,
  percent,
  rightText,
  isExceeded,
  isUnlimited
}) => {
  let displayPercent = percent ?? 0;
  let displayExceeded = isExceeded ?? false;
  let displayUnlimited = isUnlimited ?? false;

  // Si se proveen datos de capacidad dinámica, calculamos de manera proporcional
  if (used !== undefined && max !== undefined) {
    const cap = calculateCapacity(used, max);
    displayPercent = cap.percent;
    displayExceeded = isExceeded ?? cap.isExceeded;
    displayUnlimited = isUnlimited ?? (max === null);
  } else if (max === null) {
    displayUnlimited = true;
  }

  // Determinamos el texto de la derecha
  const rightLabel = rightText ?? (used !== undefined ? `${used} / ${displayUnlimited ? '∞' : max}` : '');

  return (
    <Container>
      <LabelRow>
        <Label>{label}</Label>
        {rightLabel && <Count>{rightLabel}</Count>}
      </LabelRow>
      <AnimatedProgressBar 
        percent={displayPercent} 
        isExceeded={displayExceeded} 
        isUnlimited={displayUnlimited} 
      />
    </Container>
  );
};

// ------------- STYLED COMPONENTS -------------
const Container = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const LabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 700;
`;

const Label = styled.span`
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
`;

const Count = styled.span`
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
`;
