import React from 'react';
import { SharedStyles } from './SharedStyles';

export default function RegistrationStepThree({ form }: any) {
  const { formState } = form;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fff', cursor: 'pointer' }}>
        <input 
          type="checkbox" 
          checked={formState.acceptTerms} 
          onChange={(e) => formState.setAcceptTerms(e.target.checked)} 
        />
        <span>Acepto los términos, condiciones y políticas de privacidad del marketplace.</span>
      </label>

      <SharedStyles.InputWrapper>
        <SharedStyles.Label>Firma Electrónica (Escribe tu nombre completo)</SharedStyles.Label>
        <SharedStyles.Input
          type="text"
          value={formState.signature}
          onChange={(e: any) => formState.setSignature(e.target.value)}
          placeholder="Firma electrónica"
          required
        />
      </SharedStyles.InputWrapper>

      <SharedStyles.InputWrapper>
        <SharedStyles.Label>Verificación de seguridad: ¿Cuánto es 2 + 3?</SharedStyles.Label>
        <SharedStyles.Input
          type="text"
          value={formState.captchaValue}
          onChange={(e: any) => formState.setCaptchaValue(e.target.value)}
          placeholder="Respuesta"
          required
        />
      </SharedStyles.InputWrapper>
    </div>
  );
}
