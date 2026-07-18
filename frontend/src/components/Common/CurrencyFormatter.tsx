'use client';

import React from 'react';

interface CurrencyFormatterProps {
  value: number;
  symbol?: string;
  decimals?: number;
  prefix?: string;
  className?: string;
}

export function CurrencyFormatter({
  value,
  symbol = '',
  decimals = 2,
  prefix = '',
  className = ''
}: CurrencyFormatterProps) {
  // Asegurarnos de que el valor sea un número
  const numValue = typeof value === 'number' ? value : parseFloat(value as any) || 0;

  // Formatear el número en formato es-CO (ej: "20.000,00" o "20.000")
  const formatted = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(numValue);

  // Intentamos separar la parte entera de la decimal por la coma (es-CO usa coma para decimales)
  const parts = formatted.split(',');
  const integerPart = parts[0];
  const decimalPart = parts[1] ? `,${parts[1]}` : '';

  const isDomiSymbol = symbol === 'Ð';

  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'baseline' }}>
      {prefix && <span style={{ marginRight: '2px' }}>{prefix}</span>}
      {symbol && isDomiSymbol && <span style={{ marginRight: '5px', color: 'var(--emerald, #10b981)', fontWeight: 'bold' }}>{symbol}</span>}
      <span>{integerPart}</span>
      {decimalPart && (
        <span style={{ fontSize: '0.75em', opacity: 0.85, fontWeight: 'normal' }}>
          {decimalPart}
        </span>
      )}
      {symbol && !isDomiSymbol && <span style={{ marginLeft: '4px' }}>{symbol}</span>}
    </span>
  );
}
