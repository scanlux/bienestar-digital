import React, { useState, useEffect } from 'react';
import { useAlert } from '@/context/AlertContext';
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  CloseButton
} from '../ModalStyles';
import { SubmitButton, PulsingIncrementDecrementButton } from './BaseWalletLayout';

interface WompiCheckoutModalProps {
  onClose: () => void;
  fiatPeg: number;
  wompiCommissionPercent: number;
  wompiCommissionFixedCop: number;
  wompiCommissionIvaPercent: number;
  wompiMinPurchaseCop: number;
  onConfirmCheckout: (copAmount: number) => Promise<boolean>;
  processing: boolean;
  ownerLabel: string;
  isCustomerView?: boolean;
}

export function WompiCheckoutModal({
  onClose,
  fiatPeg,
  wompiCommissionPercent,
  wompiCommissionFixedCop,
  wompiCommissionIvaPercent,
  wompiMinPurchaseCop,
  onConfirmCheckout,
  processing,
  ownerLabel,
  isCustomerView = false
}: WompiCheckoutModalProps) {
  const { showAlert } = useAlert();

  // Inputs
  const [pesosInput, setPesosInput] = useState<string>('');
  const [domisInput, setDomisInput] = useState<string>('');
  const [buyAmount, setBuyAmount] = useState<string>(''); // neto COP

  // Calculadoras
  const ivaMultiplier = 1 + wompiCommissionIvaPercent / 100;
  const comisionConIva = (wompiCommissionPercent / 100) * ivaMultiplier;
  const costoFijoConIva = wompiCommissionFixedCop * ivaMultiplier;
  const minNetPesos = Math.ceil(wompiMinPurchaseCop * (1 - comisionConIva) - costoFijoConIva);

  const formatPesos = (val: string | number) => {
    const clean = String(val).replace(/[^0-9]/g, '');
    if (!clean) return '';
    const numeric = parseInt(clean, 10);
    return numeric.toLocaleString('es-CO');
  };

  // Auto-populate suggest minimum amount
  useEffect(() => {
    if (minNetPesos > 0 && !buyAmount) {
      setPesosInput(formatPesos(minNetPesos));
      setBuyAmount(String(minNetPesos));
      const domis = minNetPesos / fiatPeg;
      setDomisInput(
        domis.toLocaleString('es-CO', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
      );
    }
  }, [minNetPesos, fiatPeg, buyAmount]);

  const handlePesosInputChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    const formatted = formatPesos(clean);
    setPesosInput(formatted);
    const numeric = parseFloat(clean || '0');
    setBuyAmount(String(numeric));
    const domis = numeric / fiatPeg;
    setDomisInput(
      domis.toLocaleString('es-CO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    );
  };

  const handlePesosInputBlur = () => {
    const clean = pesosInput.replace(/[^0-9]/g, '');
    const numeric = parseFloat(clean || '0');
    if (numeric < minNetPesos) {
      showAlert({
        title: 'Monto Mínimo de Compra',
        message: `El monto mínimo de compra permitido por Wompi es de $ ${minNetPesos.toLocaleString('es-CO')} COP.`,
        confirmText: 'Entendido'
      });
      handlePesosInputChange(String(minNetPesos));
    }
  };

  const handleDomisInputChange = (val: string) => {
    if (isCustomerView) return; // Readonly
    const clean = val.replace(/[^0-9.,]/g, '').replace(',', '.');
    setDomisInput(clean);
    const domis = parseFloat(clean || '0');
    if (!isNaN(domis)) {
      const pesos = Math.round(domis * fiatPeg);
      setPesosInput(formatPesos(pesos));
      setBuyAmount(String(pesos));
    }
  };

  const handleDomisInputBlur = () => {
    if (isCustomerView) return; // Readonly
    const domis = parseFloat(domisInput || '0');
    if (!isNaN(domis)) {
      setDomisInput(
        domis.toLocaleString('es-CO', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
      );
      const pesos = Math.round(domis * fiatPeg);
      if (pesos < minNetPesos) {
        showAlert({
          title: 'Monto Mínimo de Compra',
          message: `El monto mínimo de compra permitido por Wompi es de $ ${minNetPesos.toLocaleString('es-CO')} COP.`,
          confirmText: 'Entendido'
        });
        handlePesosInputChange(String(minNetPesos));
      }
    }
  };

  const handleIncrement = () => {
    if (isCustomerView) return;
    const currentDomis = parseFloat(domisInput.replace(/\./g, '').replace(',', '.')) || 0;
    const nextDomis = Math.floor(currentDomis) + 1;
    setDomisInput(
      nextDomis.toLocaleString('es-CO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    );
    const pesos = nextDomis * fiatPeg;
    setPesosInput(formatPesos(pesos));
    setBuyAmount(String(pesos));
  };

  const handleDecrement = () => {
    if (isCustomerView) return;
    const currentDomis = parseFloat(domisInput.replace(/\./g, '').replace(',', '.')) || 0;
    const nextDomis = Math.max(1, Math.ceil(currentDomis) - 1);
    const pesos = nextDomis * fiatPeg;
    if (pesos < minNetPesos) {
      showAlert({
        title: 'Monto Mínimo de Compra',
        message: `El monto mínimo de compra permitido por Wompi es de $ ${minNetPesos.toLocaleString('es-CO')} COP.`,
        confirmText: 'Entendido'
      });
      return;
    }
    setDomisInput(
      nextDomis.toLocaleString('es-CO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    );
    setPesosInput(formatPesos(pesos));
    setBuyAmount(String(pesos));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(buyAmount || '0');
    if (!buyAmount || numericAmount < minNetPesos) {
      showAlert({
        title: 'Monto Mínimo de Compra',
        message: `El monto mínimo de compra permitido por Wompi es de $ ${minNetPesos.toLocaleString('es-CO')} COP.`,
        confirmText: 'Entendido'
      });
      handlePesosInputChange(String(minNetPesos));
      return;
    }
    onConfirmCheckout(numericAmount).then(success => {
      if (success) {
        onClose();
      }
    });
  };

  const displayTitle = isCustomerView ? 'Recargar Saldo' : `Comprar DOMIs por Pasarela de Pago (${ownerLabel})`;
  const displaySubmit = processing ? 'Redirigiendo a Wompi...' : (isCustomerView ? 'Recargar Saldo' : 'Iniciar Pago Seguro');

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()} $maxWidth="650px" style={{ background: '#0a0e0a', border: '1px solid rgba(0, 255, 128, 0.15)', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 45px rgba(0, 255, 128, 0.1)' }}>
        <ModalHeader style={{ marginBottom: '1.5rem' }}>
          <ModalTitle style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            {displayTitle}
          </ModalTitle>
          <CloseButton type="button" onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.75rem' }}>✕</CloseButton>
        </ModalHeader>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'stretch' }}>
              <div style={{ flex: 1, background: '#040704', border: '1px solid rgba(0, 255, 128, 0.25)', borderRadius: '12px', padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.4rem', boxShadow: 'inset 0 4px 10px rgba(0, 0, 0, 0.9)' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.9)', letterSpacing: '0.75px', textTransform: 'uppercase' }}>
                  Valor en Pesos (COP)
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ color: '#00ff80', fontSize: '2.1rem', fontWeight: 800, textShadow: '0 0 10px rgba(0, 255, 128, 0.4)', userSelect: 'none' }}>$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pesosInput}
                    onChange={e => handlePesosInputChange(e.target.value)}
                    onBlur={handlePesosInputBlur}
                    required
                    style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '2.1rem', fontWeight: 800, fontFamily: 'monospace', outline: 'none', width: '100%', padding: 0 }}
                  />
                </div>
                {isCustomerView && (
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'monospace' }}>
                    = {parseFloat(domisInput.replace(/\./g, '').replace(',', '.')) || 0} Pts Ð
                  </span>
                )}
              </div>
              <div style={{ flex: 1, background: '#040704', border: '1px solid rgba(0, 255, 128, 0.25)', borderRadius: '12px', padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.4rem', boxShadow: 'inset 0 4px 10px rgba(0, 0, 0, 0.9)' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.9)', letterSpacing: '0.75px', textTransform: 'uppercase' }}>
                  {isCustomerView ? 'Pts Ð a acreditar' : 'CANTIDAD DOMIs'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ color: '#00ff80', fontSize: '2.1rem', fontWeight: 800, textShadow: '0 0 10px rgba(0, 255, 128, 0.4)', userSelect: 'none' }}>Ð</span>
                  <input
                    type="text"
                    value={domisInput}
                    onChange={e => handleDomisInputChange(e.target.value)}
                    onBlur={handleDomisInputBlur}
                    readOnly={isCustomerView}
                    tabIndex={isCustomerView ? -1 : undefined}
                    style={{ background: 'transparent', border: 'none', color: isCustomerView ? 'rgba(255,255,255,0.6)' : '#fff', fontSize: '2.1rem', fontWeight: 800, fontFamily: 'monospace', outline: 'none', width: '100%', padding: 0 }}
                  />
                </div>
                {isCustomerView && (
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', fontFamily: 'monospace' }}>
                    = $ {pesosInput || '0'} COP
                  </span>
                )}
              </div>
              {!isCustomerView && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
                  <PulsingIncrementDecrementButton type="button" onClick={handleIncrement}>+</PulsingIncrementDecrementButton>
                  <PulsingIncrementDecrementButton type="button" onClick={handleDecrement}>-</PulsingIncrementDecrementButton>
                </div>
              )}
            </div>

            {parseFloat(buyAmount || '0') > 0 && (() => {
              const netAmount = parseFloat(buyAmount || '0');
              const numerator = netAmount + wompiCommissionFixedCop * ivaMultiplier;
              const denominator = 1 - (wompiCommissionPercent / 100) * ivaMultiplier;
              const grossAmount = numerator / denominator;
              const totalFee = Math.max(0, grossAmount - netAmount);
              const fixedFee = wompiCommissionFixedCop;
              const variableFee = Math.round(grossAmount * (wompiCommissionPercent / 100));
              const ivaFee = Math.round((fixedFee + variableFee) * (wompiCommissionIvaPercent / 100));
              const estimatedDomis = netAmount / fiatPeg;

              return (
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                    <span style={{ color: '#fff', fontWeight: 700 }}>
                      {isCustomerView ? 'Subtotal:' : 'Subtotal (Neto DOMIs):'}
                    </span>
                    <span style={{ fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
                      $ {netAmount.toLocaleString('es-CO')} COP {isCustomerView && `(${estimatedDomis.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Pts Ð)`}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#f59e0b', fontWeight: 700 }}>
                    Recargo de Pasarela (Desglose Wompi):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: '#060906', border: '1px solid rgba(0, 255, 128, 0.08)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Tarifa Fija:</span>
                      <span style={{ color: '#fff', fontFamily: 'monospace' }}>$ {fixedFee.toLocaleString('es-CO')} COP</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Comisión Variable ({wompiCommissionPercent}%):</span>
                      <span style={{ color: '#fff', fontFamily: 'monospace' }}>$ {variableFee.toLocaleString('es-CO')} COP</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.45)' }}>IVA sobre Comisión ({wompiCommissionIvaPercent}%):</span>
                      <span style={{ color: '#fff', fontFamily: 'monospace' }}>$ {ivaFee.toLocaleString('es-CO')} COP</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginTop: '-0.1rem' }}>
                    $ {Math.round(totalFee).toLocaleString('es-CO')} COP
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', borderTop: '1px dotted rgba(255, 255, 255, 0.25)', paddingTop: '0.85rem', marginTop: '0.25rem' }}>
                    <span style={{ fontWeight: 800, color: '#fff' }}>Total a pagar:</span>
                    <span style={{ fontWeight: 850, color: '#00ff80', fontFamily: 'monospace', textShadow: '0 0 10px rgba(0, 255, 128, 0.3)' }}>
                      $ {Math.round(grossAmount).toLocaleString('es-CO')} COP
                    </span>
                  </div>
                  {isCustomerView && (
                    <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.4)', textAlign: 'right' }}>
                      (Total equivalente: {(Math.round(grossAmount) / fiatPeg).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Pts Ð)
                    </div>
                  )}
                </div>
              );
            })()}
            <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.45)', textAlign: 'center', margin: 0 }}>
              Serás redirigido de manera segura a la pasarela de pagos oficial de Wompi Colombia.
            </p>
          </div>
          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.5rem' }}>
            <SubmitButton type="submit" disabled={processing} style={{ background: '#00ff80', color: '#000', fontWeight: 'bold' }}>
              {displaySubmit}
            </SubmitButton>
          </div>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
}
