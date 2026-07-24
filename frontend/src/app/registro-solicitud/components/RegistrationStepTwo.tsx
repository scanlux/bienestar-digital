import React from 'react';
import { SharedStyles } from './SharedStyles';

export default function RegistrationStepTwo({ form, validation }: any) {
  const { formState } = form;
  const { isEditable, emailStatus } = validation;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
      <SharedStyles.InputWrapper>
        <SharedStyles.Label>Nombres del Administrador</SharedStyles.Label>
        <SharedStyles.Input
          type="text"
          value={formState.nombresContacto}
          onChange={(e: any) => formState.setNombresContacto(e.target.value)}
          disabled={!isEditable('nombres_contacto')}
          required
        />
      </SharedStyles.InputWrapper>

      <SharedStyles.InputWrapper>
        <SharedStyles.Label>Apellidos del Administrador</SharedStyles.Label>
        <SharedStyles.Input
          type="text"
          value={formState.apellidosContacto}
          onChange={(e: any) => formState.setApellidosContacto(e.target.value)}
          disabled={!isEditable('apellidos_contacto')}
          required
        />
      </SharedStyles.InputWrapper>

      <SharedStyles.InputWrapper className="col-span-2">
        <SharedStyles.Label>Correo Electrónico Corporativo</SharedStyles.Label>
        <SharedStyles.Input
          type="email"
          value={formState.emailContacto}
          onChange={(e: any) => formState.setEmailContacto(e.target.value)}
          disabled={!isEditable('email_contacto')}
          required
        />
        {emailStatus === 'exists' && (
          <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>Correo ya registrado.</span>
        )}
      </SharedStyles.InputWrapper>

      <SharedStyles.InputWrapper className="col-span-2">
        <SharedStyles.Label>Celular</SharedStyles.Label>
        <SharedStyles.Input
          type="text"
          value={formState.celularContacto}
          onChange={(e: any) => formState.setCelularContacto(e.target.value)}
          disabled={!isEditable('celular_contacto')}
          required
        />
      </SharedStyles.InputWrapper>

      <SharedStyles.InputWrapper>
        <SharedStyles.Label>Contraseña</SharedStyles.Label>
        <SharedStyles.Input
          type="password"
          value={formState.password}
          onChange={(e: any) => formState.setPassword(e.target.value)}
          required
        />
      </SharedStyles.InputWrapper>

      <SharedStyles.InputWrapper>
        <SharedStyles.Label>Confirmar Contraseña</SharedStyles.Label>
        <SharedStyles.Input
          type="password"
          value={formState.confirmPassword}
          onChange={(e: any) => formState.setConfirmPassword(e.target.value)}
          required
        />
      </SharedStyles.InputWrapper>
    </div>
  );
}
