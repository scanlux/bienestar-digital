import React from 'react';
import styled from 'styled-components';
import { SharedStyles } from './SharedStyles';

const FileNameDisplay = styled.span`
  display: block;
  font-size: 0.75rem;
  color: #10b981;
  margin-top: 4px;
  text-align: center;
  font-weight: 500;
`;

export default function RegistrationStepOne({ form, validation }: any) {
  const { formState } = form;
  const { isEditable } = validation;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        <SharedStyles.InputWrapper className="col-span-2">
          <SharedStyles.Label>Tipo de Negocio</SharedStyles.Label>
          <SharedStyles.Select
            value={formState.tipoSolicitud}
            onChange={(e: any) => formState.setTipoSolicitud(e.target.value)}
            disabled={formState.isCorrectionsMode}
          >
            <option value="commerce">Comercio</option>
            <option value="delivery_company">Empresa de Reparto</option>
          </SharedStyles.Select>
        </SharedStyles.InputWrapper>

        <SharedStyles.InputWrapper>
          <SharedStyles.Label>Razón Social</SharedStyles.Label>
          <SharedStyles.Input
            type="text"
            placeholder="Ej. Alimentos del Norte S.A.S."
            value={formState.razonSocial}
            onChange={(e: any) => formState.setRazonSocial(e.target.value)}
            disabled={!isEditable('razon_social')}
            required
          />
        </SharedStyles.InputWrapper>

        <SharedStyles.InputWrapper style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '0.5rem' }}>
          <div>
            <SharedStyles.Label>NIT (sin DV)</SharedStyles.Label>
            <SharedStyles.Input
              type="text"
              value={formState.nit}
              onChange={(e: any) => formState.setNit(e.target.value.replace(/\D/g, ''))}
              disabled={!isEditable('nit')}
              required
            />
          </div>
          <div>
            <SharedStyles.Label>DV</SharedStyles.Label>
            <SharedStyles.Input
              type="text"
              maxLength={1}
              value={formState.nitDv}
              onChange={(e: any) => formState.setNitDv(e.target.value.replace(/\D/g, ''))}
              disabled={!isEditable('nit_dv')}
              required
            />
          </div>
        </SharedStyles.InputWrapper>

        <SharedStyles.InputWrapper>
          <SharedStyles.Label>Ciudad</SharedStyles.Label>
          <SharedStyles.Select
            value={formState.ciudad}
            onChange={(e: any) => formState.setCiudad(e.target.value)}
            disabled={!isEditable('ciudad')}
            required
          >
            <option value="">Seleccionar ciudad...</option>
            <option value="Yopal">Yopal</option>
            <option value="Tunja">Tunja</option>
            <option value="Villavicencio">Villavicencio</option>
            <option value="Bogota">Bogotá</option>
          </SharedStyles.Select>
        </SharedStyles.InputWrapper>

        <SharedStyles.InputWrapper>
          <SharedStyles.Label>Teléfono del Comercio</SharedStyles.Label>
          <SharedStyles.Input
            type="text"
            value={formState.telefono}
            onChange={(e: any) => formState.setTelefono(e.target.value.replace(/\D/g, ''))}
            disabled={!isEditable('telefono')}
            required
          />
        </SharedStyles.InputWrapper>

        <SharedStyles.InputWrapper className="col-span-2">
          <SharedStyles.Label>Dirección Principal</SharedStyles.Label>
          <SharedStyles.Input
            type="text"
            value={formState.direccion}
            onChange={(e: any) => formState.setDireccion(e.target.value)}
            disabled={!isEditable('direccion')}
            required
          />
        </SharedStyles.InputWrapper>
      </div>

      <SharedStyles.UploadSectionTitle>Documentación Obligatoria</SharedStyles.UploadSectionTitle>
      <SharedStyles.DocumentTable>
        {/* Logo Upload */}
        <SharedStyles.DocumentRow $isEditable={isEditable('logo')}>
          <SharedStyles.DocLabelWrapper>
            <SharedStyles.DocLabel>Logo del Comercio (Imagen)</SharedStyles.DocLabel>
            <SharedStyles.DocDesc>Logotipo cuadrado en formato PNG, JPG o WebP</SharedStyles.DocDesc>
          </SharedStyles.DocLabelWrapper>
          <div>
            <SharedStyles.FileLabel 
              $hasFile={!!formState.logoFile || (!isEditable('logo') && !!formState.documentUrls.logo)} 
              $uploading={formState.loading || !isEditable('logo')}
            >
              {formState.logoFile || (!isEditable('logo') && formState.documentUrls.logo) ? '✓ Logo Cargado' : 'Subir Logo (PNG/JPG)'}
              {isEditable('logo') && (
                <SharedStyles.HiddenInput 
                  type="file" accept="image/*" 
                  onChange={(e: any) => {
                    const file = e.target.files?.[0];
                    if (file) { formState.setLogoFile(file); formState.setLogoName(file.name); }
                  }}
                />
              )}
            </SharedStyles.FileLabel>
            {formState.logoName && <FileNameDisplay>{formState.logoName}</FileNameDisplay>}
          </div>
        </SharedStyles.DocumentRow>

        {/* Camara Upload */}
        <SharedStyles.DocumentRow $isEditable={isEditable('camara')}>
          <SharedStyles.DocLabelWrapper>
            <SharedStyles.DocLabel>Cámara de Comercio (PDF)</SharedStyles.DocLabel>
            <SharedStyles.DocDesc>Certificado de existencia y representación legal vigente</SharedStyles.DocDesc>
          </SharedStyles.DocLabelWrapper>
          <div>
            <SharedStyles.FileLabel 
              $hasFile={!!formState.camaraFile || (!isEditable('camara') && !!formState.documentUrls.camara)} 
              $uploading={formState.loading || !isEditable('camara')}
            >
              {formState.camaraFile || (!isEditable('camara') && formState.documentUrls.camara) ? '✓ Documento Cargado' : 'Subir Cámara de Comercio'}
              {isEditable('camara') && (
                <SharedStyles.HiddenInput 
                  type="file" accept="application/pdf" 
                  onChange={(e: any) => {
                    const file = e.target.files?.[0];
                    if (file) { formState.setCamaraFile(file); formState.setCamaraName(file.name); }
                  }}
                />
              )}
            </SharedStyles.FileLabel>
            {formState.camaraName && <FileNameDisplay>{formState.camaraName}</FileNameDisplay>}
          </div>
        </SharedStyles.DocumentRow>

        {/* RUT Upload */}
        <SharedStyles.DocumentRow $isEditable={isEditable('rut')}>
          <SharedStyles.DocLabelWrapper>
            <SharedStyles.DocLabel>Registro Único Tributario - RUT (PDF)</SharedStyles.DocLabel>
            <SharedStyles.DocDesc>Copia legible del RUT actualizado de la empresa</SharedStyles.DocDesc>
          </SharedStyles.DocLabelWrapper>
          <div>
            <SharedStyles.FileLabel 
              $hasFile={!!formState.rutFile || (!isEditable('rut') && !!formState.documentUrls.rut)} 
              $uploading={formState.loading || !isEditable('rut')}
            >
              {formState.rutFile || (!isEditable('rut') && formState.documentUrls.rut) ? '✓ Documento Cargado' : 'Subir RUT'}
              {isEditable('rut') && (
                <SharedStyles.HiddenInput 
                  type="file" accept="application/pdf" 
                  onChange={(e: any) => {
                    const file = e.target.files?.[0];
                    if (file) { formState.setRutFile(file); formState.setRutName(file.name); }
                  }}
                />
              )}
            </SharedStyles.FileLabel>
            {formState.rutName && <FileNameDisplay>{formState.rutName}</FileNameDisplay>}
          </div>
        </SharedStyles.DocumentRow>

        {/* Cedula Frente Upload */}
        <SharedStyles.DocumentRow $isEditable={isEditable('cedula')}>
          <SharedStyles.DocLabelWrapper>
            <SharedStyles.DocLabel>Cédula de Representante - Frente (Foto)</SharedStyles.DocLabel>
            <SharedStyles.DocDesc>Parte frontal del documento del representante legal (JPG, PNG, WebP)</SharedStyles.DocDesc>
          </SharedStyles.DocLabelWrapper>
          <div>
            <SharedStyles.FileLabel 
              $hasFile={!!formState.cedulaFrenteFile || (!isEditable('cedula') && !!formState.documentUrls.cedula_frente)} 
              $uploading={formState.loading || !isEditable('cedula')}
            >
              {formState.cedulaFrenteFile || (!isEditable('cedula') && formState.documentUrls.cedula_frente) ? '✓ Documento Cargado' : 'Subir Frente'}
              {isEditable('cedula') && (
                <SharedStyles.HiddenInput 
                  type="file" accept="image/*" 
                  onChange={(e: any) => {
                    const file = e.target.files?.[0];
                    if (file) { formState.setCedulaFrenteFile(file); formState.setCedulaFrenteName(file.name); }
                  }}
                />
              )}
            </SharedStyles.FileLabel>
            {formState.cedulaFrenteName && <FileNameDisplay>{formState.cedulaFrenteName}</FileNameDisplay>}
          </div>
        </SharedStyles.DocumentRow>

        {/* Cedula Dorso Upload */}
        <SharedStyles.DocumentRow $isEditable={isEditable('cedula')}>
          <SharedStyles.DocLabelWrapper>
            <SharedStyles.DocLabel>Cédula de Representante - Reverso (Foto)</SharedStyles.DocLabel>
            <SharedStyles.DocDesc>Parte posterior del documento del representante legal (JPG, PNG, WebP)</SharedStyles.DocDesc>
          </SharedStyles.DocLabelWrapper>
          <div>
            <SharedStyles.FileLabel 
              $hasFile={!!formState.cedulaDorsoFile || (!isEditable('cedula') && !!formState.documentUrls.cedula_dorso)} 
              $uploading={formState.loading || !isEditable('cedula')}
            >
              {formState.cedulaDorsoFile || (!isEditable('cedula') && formState.documentUrls.cedula_dorso) ? '✓ Documento Cargado' : 'Subir Reverso'}
              {isEditable('cedula') && (
                <SharedStyles.HiddenInput 
                  type="file" accept="image/*" 
                  onChange={(e: any) => {
                    const file = e.target.files?.[0];
                    if (file) { formState.setCedulaDorsoFile(file); formState.setCedulaDorsoName(file.name); }
                  }}
                />
              )}
            </SharedStyles.FileLabel>
            {formState.cedulaDorsoName && <FileNameDisplay>{formState.cedulaDorsoName}</FileNameDisplay>}
          </div>
        </SharedStyles.DocumentRow>
      </SharedStyles.DocumentTable>
    </div>
  );
}
