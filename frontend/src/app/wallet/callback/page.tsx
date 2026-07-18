'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function CallbackContent() {
  const params = useSearchParams();
  const router = useRouter();

  const transactionId = params.get('id');
  const status = params.get('transaction_status'); // APPROVED | DECLINED | PENDING

  const handleReturn = () => {
    // Redirigir al usuario al panel de administración general o perfil
    router.push('/');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top left, #1a2a6c, #275d8c, #0f2027)',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '24px',
        padding: '3rem 2.5rem',
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
        color: '#ffffff'
      }}>
        {/* Estado Aprobado */}
        {status === 'APPROVED' && (
          <div>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 8px 20px rgba(16, 185, 129, 0.4)'
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.5rem' }}>Transaccion Aprobada</h1>
            <p style={{ color: '#a0aec0', fontSize: '0.95rem', lineHeight: '1.6', margin: '0 0 2rem' }}>
              Tu pago ha sido procesado de forma exitosa por Wompi. Tu saldo ha sido recargado exitosamente. El credito estara disponible en unos segundos.
            </p>
          </div>
        )}

        {/* Estado Rechazado */}
        {status === 'DECLINED' && (
          <div>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 8px 20px rgba(239, 68, 68, 0.4)'
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.5rem' }}>Pago Rechazado</h1>
            <p style={{ color: '#a0aec0', fontSize: '0.95rem', lineHeight: '1.6', margin: '0 0 2rem' }}>
              La transaccion no pudo ser completada. Por favor verifica los datos de tu metodo de pago o intenta nuevamente mas tarde.
            </p>
          </div>
        )}

        {/* Estado Pendiente u Otros */}
        {status !== 'APPROVED' && status !== 'DECLINED' && (
          <div>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 8px 20px rgba(245, 158, 11, 0.4)',
              position: 'relative'
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.5rem' }}>Transaccion Pendiente</h1>
            <p style={{ color: '#a0aec0', fontSize: '0.95rem', lineHeight: '1.6', margin: '0 0 2rem' }}>
              Wompi esta procesando tu pago. Una vez confirmado el estado, tu saldo se vera reflejado de manera automatica.
            </p>
          </div>
        )}

        {/* Informacion de la transaccion */}
        {transactionId && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '16px',
            padding: '1.25rem',
            marginBottom: '2rem',
            textAlign: 'left',
            fontSize: '0.85rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: '#718096' }}>ID de Transaccion:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{transactionId}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#718096' }}>Pasarela:</span>
              <span style={{ fontWeight: 'bold', color: '#fe6250' }}>Wompi Colombia</span>
            </div>
          </div>
        )}

        {/* Boton de accion */}
        <button
          onClick={handleReturn}
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            border: 'none',
            borderRadius: '14px',
            color: '#ffffff',
            padding: '1rem 2rem',
            fontSize: '0.95rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
            transition: 'all 0.2s ease',
            width: '100%'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.3)';
          }}
        >
          Volver a mi Billetera
        </button>
      </div>
    </div>
  );
}

export default function WalletCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f2027',
        color: '#ffffff',
        fontFamily: 'system-ui, sans-serif'
      }}>
        Cargando informacion de pago...
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
