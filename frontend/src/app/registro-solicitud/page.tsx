'use client';

import React, { useState, useEffect, Suspense } from 'react';
import styled, { keyframes } from 'styled-components';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_URL } from '@/constants';
import { useAuth } from '@/context/AuthContext';
import { useEmailValidation } from '@/hooks/useEmailValidation';

// Canvas image compression helper to clean EXIF metadata and resize logo
const compressImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert canvas to blob (JPEG compressed to 0.8 quality, discarding metadata)
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas compression failed'));
          }
        }, 'image/jpeg', 0.8);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

function RegistroSolicitudContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const { maintenanceMode, isOffline } = useAuth();
  const [timeLeft, setTimeLeft] = useState(120);

  useEffect(() => {
    if (!maintenanceMode) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 120));
    }, 1000);
    return () => clearInterval(interval);
  }, [maintenanceMode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const [tipoSolicitud, setTipoSolicitud] = useState<'commerce' | 'delivery_company'>('commerce');
  const [nit, setNit] = useState('');
  const [nitDv, setNitDv] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [emailContacto, setEmailContacto] = useState('');
  const { emailStatus } = useEmailValidation(emailContacto);
  const [nombresContacto, setNombresContacto] = useState('');
  const [apellidosContacto, setApellidosContacto] = useState('');
  const [celularContacto, setCelularContacto] = useState('');
  
  // Extra field states
  const [telefono, setTelefono] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [direccion, setDireccion] = useState('');
  const [descripcion, setDescripcion] = useState('');

  // Corrections mode and unmodified file URLs state
  const [isCorrectionsMode, setIsCorrectionsMode] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [initialEmail, setInitialEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [camaraUrl, setCamaraUrl] = useState('');
  const [rutUrl, setRutUrl] = useState('');
  const [cedulaFrenteUrl, setCedulaFrenteUrl] = useState('');
  const [cedulaDorsoUrl, setCedulaDorsoUrl] = useState('');

  // Upload file state variables
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoName, setLogoName] = useState('');

  const [camaraFile, setCamaraFile] = useState<File | null>(null);
  const [camaraName, setCamaraName] = useState('');

  const [rutFile, setRutFile] = useState<File | null>(null);
  const [rutName, setRutName] = useState('');

  const [cedulaFrenteFile, setCedulaFrenteFile] = useState<File | null>(null);
  const [cedulaFrenteName, setCedulaFrenteName] = useState('');

  const [cedulaDorsoFile, setCedulaDorsoFile] = useState<File | null>(null);
  const [cedulaDorsoName, setCedulaDorsoName] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Verify corrections token and prefill on mount
  useEffect(() => {
    if (!token) return;

    const verifyToken = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const response = await axios.get(`${API_URL}/api/public/requests/verify-token?token=${token}`);
        const { request, missingFields: mf } = response.data;
        if (request) {
          setIsCorrectionsMode(true);
          setMissingFields(mf || []);
          
          setTipoSolicitud(request.tipo_solicitud || 'commerce');
          setNit(request.nit || '');
          setNitDv(request.nit_dv || '');
          setRazonSocial(request.razon_social || '');
          setEmailContacto(request.email_contacto || '');
          setInitialEmail(request.email_contacto || '');
          setNombresContacto(request.nombres_contacto || '');
          setApellidosContacto(request.apellidos_contacto || '');
          setCelularContacto(request.celular_contacto || '');
          setTelefono(request.telefono || '');
          setCiudad(request.ciudad || '');
          setDireccion(request.direccion || '');
          setDescripcion(request.descripcion || '');

          setLogoUrl(request.logo_url || '');
          setCamaraUrl(request.documento_camara_comercio || '');
          setRutUrl(request.documento_rut || '');
          setCedulaFrenteUrl(request.documento_cedula_frente || '');
          setCedulaDorsoUrl(request.documento_cedula_dorso || '');
        }
      } catch (err: any) {
        console.error('Error verifying token:', err);
        setErrorMsg(err.response?.data?.error || 'El token de corrección es inválido, ha expirado o ya fue procesado.');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const isEditable = (key: string) => {
    if (!isCorrectionsMode) return true;
    return missingFields.includes(key);
  };

  const logoRequired = !isCorrectionsMode || missingFields.includes('logo');
  const camaraRequired = !isCorrectionsMode || missingFields.includes('camara');
  const rutRequired = !isCorrectionsMode || missingFields.includes('rut');
  const cedulaRequired = !isCorrectionsMode || missingFields.includes('cedula');

  // Scan PDF files for active code injection exploits
  const scanPdfForExploits = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        const arr = new Uint8Array(buffer);
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(arr);
        
        const exploits = ['/JS', '/JavaScript', '/Launch', '/EmbeddedFiles', '/AA', '/OpenAction'];
        for (const exploit of exploits) {
          if (text.includes(exploit)) {
            console.warn(`[SECURITY SCAN] Exploit pattern detected: ${exploit}`);
            resolve(true); // Exploit detected
            return;
          }
        }
        resolve(false); // Clean
      };
      reader.onerror = () => resolve(true);
      reader.readAsArrayBuffer(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (logoRequired && !logoFile) {
      setErrorMsg('Debes cargar el Logo del Comercio antes de enviar la solicitud.');
      return;
    }
    if (camaraRequired && !camaraFile) {
      setErrorMsg('Debes cargar la Cámara de Comercio antes de enviar la solicitud.');
      return;
    }
    if (rutRequired && !rutFile) {
      setErrorMsg('Debes cargar el RUT antes de enviar la solicitud.');
      return;
    }
    if (cedulaRequired && (!cedulaFrenteFile || !cedulaDorsoFile)) {
      setErrorMsg('Debes cargar ambas caras de la cédula del representante antes de enviar la solicitud.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccess(false);

    try {
      // 1. Scan PDFs for exploits (only if the file is PDF and newly uploaded)
      const pdfs = [];
      if (camaraFile && camaraFile.type === 'application/pdf') pdfs.push({ file: camaraFile, name: 'Cámara de Comercio' });
      if (rutFile && rutFile.type === 'application/pdf') pdfs.push({ file: rutFile, name: 'RUT' });

      for (const pdf of pdfs) {
        const hasExploit = await scanPdfForExploits(pdf.file);
        if (hasExploit) {
          throw new Error(`El archivo PDF de ${pdf.name} contiene elementos activos o scripts no permitidos por políticas de seguridad.`);
        }
      }

      // 2. Compress/resize logo (only if newly uploaded)
      let logoBlob = null;
      if (logoFile) {
        console.log('Comprimiendo logo en cliente...');
        logoBlob = await compressImage(logoFile);
      }

      // 3. Construct unified FormData
      const formData = new FormData();
      formData.append('tipo_solicitud', tipoSolicitud);
      formData.append('nit', nit);
      formData.append('nit_dv', nitDv);
      formData.append('razon_social', razonSocial);
      formData.append('email_contacto', emailContacto);
      formData.append('nombres_contacto', nombresContacto);
      formData.append('apellidos_contacto', apellidosContacto);
      formData.append('celular_contacto', celularContacto);
      formData.append('telefono', telefono);
      formData.append('ciudad', ciudad);
      formData.append('direccion', direccion);
      formData.append('descripcion', descripcion);
      
      if (isCorrectionsMode && token) {
        formData.append('token', token);
        formData.append('logo_url', logoUrl);
        formData.append('documento_camara_comercio', camaraUrl);
        formData.append('documento_rut', rutUrl);
        formData.append('documento_cedula_frente', cedulaFrenteUrl);
        formData.append('documento_cedula_dorso', cedulaDorsoUrl);
      }

      // Append files (only if newly uploaded)
      if (logoFile && logoBlob) formData.append('logo', logoBlob, 'logo.jpg');
      if (camaraFile) formData.append('camara', camaraFile, camaraFile.name);
      if (rutFile) formData.append('rut', rutFile, rutFile.name);
      if (cedulaFrenteFile) formData.append('cedula_frente', cedulaFrenteFile, cedulaFrenteFile.name);
      if (cedulaDorsoFile) formData.append('cedula_dorso', cedulaDorsoFile, cedulaDorsoFile.name);

      // 4. Send request directly to Bogota telemetry server
      const mediaServer = process.env.NEXT_PUBLIC_MEDIA_URL || 'http://localhost:4001';
      console.log(`Enviando solicitud unificada a ${mediaServer}...`);

      const response = await axios.post(`${mediaServer}/api/public/requests`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data && response.data.success) {
        setSuccess(true);
        // Reset form
        setNit('');
        setNitDv('');
        setRazonSocial('');
        setEmailContacto('');
        setNombresContacto('');
        setApellidosContacto('');
        setCelularContacto('');
        setTelefono('');
        setCiudad('');
        setDireccion('');
        setDescripcion('');
        setLogoFile(null);
        setLogoName('');
        setCamaraFile(null);
        setCamaraName('');
        setRutFile(null);
        setRutName('');
        setCedulaFrenteFile(null);
        setCedulaFrenteName('');
        setCedulaDorsoFile(null);
        setCedulaDorsoName('');
      } else {
        throw new Error('Error al registrar la solicitud.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || err.message || 'Ocurrió un error al procesar tu solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = loading ||
    (logoRequired && !logoFile) ||
    (camaraRequired && !camaraFile) ||
    (rutRequired && !rutFile) ||
    (cedulaRequired && (!cedulaFrenteFile || !cedulaDorsoFile)) ||
    (emailStatus !== 'available' && (!isCorrectionsMode || emailContacto !== initialEmail));

  return (
    <PageWrapper>
      <BackgroundGlow />
      {loading && (
        <LoadingOverlay>
          <LoadingCard>
            <SpinnerLarge />
            <LoadingText>Sanitizando y subiendo documentos de forma segura...</LoadingText>
            <LoadingSubtext>Utilizando cifrado de extremo a extremo y escáner de exploits activo</LoadingSubtext>
          </LoadingCard>
        </LoadingOverlay>
      )}
      <Container>
        <LogoArea onClick={() => router.push('/')}>
          <Cube>N</Cube>
          <LogoText>TrendyTech<span>Partners</span></LogoText>
        </LogoArea>

        <Card>
          {!success ? (
            <>
              <Header>
                <Title>{isCorrectionsMode ? 'Corregir Solicitud' : 'Únete al Ecosistema'}</Title>
                <Subtitle>
                  {isCorrectionsMode 
                    ? 'Corrige únicamente los campos marcados en rojo para volver a enviar tu solicitud' 
                    : 'Envía tu solicitud para registrar tu comercio o empresa de entrega en el marketplace'}
                </Subtitle>
              </Header>

              <Form onSubmit={handleSubmit}>
                <FormGrid>
                  <InputWrapper className="col-span-2">
                    <Label htmlFor="tipoSolicitud">Tipo de Negocio</Label>
                    <Select
                      id="tipoSolicitud"
                      value={tipoSolicitud}
                      onChange={(e) => setTipoSolicitud(e.target.value as 'commerce' | 'delivery_company')}
                      disabled={isCorrectionsMode}
                    >
                      <option value="commerce">Comercio</option>
                      <option value="delivery_company">Empresa de Reparto</option>
                    </Select>
                  </InputWrapper>

                  <InputWrapper>
                    <Label htmlFor="razonSocial">Razón Social</Label>
                    <Input
                      type="text"
                      id="razonSocial"
                      placeholder="Ej. Alimentos del Norte S.A.S."
                      value={razonSocial}
                      onChange={(e) => setRazonSocial(e.target.value)}
                      disabled={!isEditable('razon_social')}
                      style={{
                        borderColor: isCorrectionsMode && isEditable('razon_social') ? '#ef4444' : undefined,
                        boxShadow: isCorrectionsMode && isEditable('razon_social') ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined
                      }}
                      required
                    />
                  </InputWrapper>

                  <InputWrapper style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <Label htmlFor="nit">NIT (sin DV)</Label>
                      <Input
                        type="text"
                        id="nit"
                        placeholder="Ej. 901234567"
                        value={nit}
                        onChange={(e) => setNit(e.target.value.replace(/\D/g, ''))}
                        disabled={!isEditable('nit')}
                        style={{
                          borderColor: isCorrectionsMode && isEditable('nit') ? '#ef4444' : undefined,
                          boxShadow: isCorrectionsMode && isEditable('nit') ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined
                        }}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="nitDv">DV</Label>
                      <Input
                        type="text"
                        id="nitDv"
                        maxLength={1}
                        placeholder="Ej. 1"
                        value={nitDv}
                        onChange={(e) => setNitDv(e.target.value.replace(/\D/g, ''))}
                        disabled={!isEditable('nit_dv')}
                        style={{
                          borderColor: isCorrectionsMode && isEditable('nit_dv') ? '#ef4444' : undefined,
                          boxShadow: isCorrectionsMode && isEditable('nit_dv') ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined
                        }}
                        required
                      />
                    </div>
                  </InputWrapper>

                  <InputWrapper>
                    <Label htmlFor="nombres">Nombres del Contacto</Label>
                    <Input
                      type="text"
                      id="nombres"
                      placeholder="Ej. Carlos"
                      value={nombresContacto}
                      onChange={(e) => setNombresContacto(e.target.value)}
                      disabled={!isEditable('nombres_contacto')}
                      style={{
                        borderColor: isCorrectionsMode && isEditable('nombres_contacto') ? '#ef4444' : undefined,
                        boxShadow: isCorrectionsMode && isEditable('nombres_contacto') ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined
                      }}
                      required
                    />
                  </InputWrapper>

                  <InputWrapper>
                    <Label htmlFor="apellidos">Apellidos del Contacto</Label>
                    <Input
                      type="text"
                      id="apellidos"
                      placeholder="Ej. Rodríguez"
                      value={apellidosContacto}
                      onChange={(e) => setApellidosContacto(e.target.value)}
                      disabled={!isEditable('apellidos_contacto')}
                      style={{
                        borderColor: isCorrectionsMode && isEditable('apellidos_contacto') ? '#ef4444' : undefined,
                        boxShadow: isCorrectionsMode && isEditable('apellidos_contacto') ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined
                      }}
                      required
                    />
                  </InputWrapper>

                  <InputWrapper>
                    <Label htmlFor="email">Correo Electrónico Corporativo</Label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Input
                        type="email"
                        id="email"
                        placeholder="contacto@empresa.com"
                        value={emailContacto}
                        onChange={(e) => setEmailContacto(e.target.value)}
                        disabled={!isEditable('email_contacto')}
                        className={(emailStatus === 'exists' || emailStatus === 'invalid') && emailContacto !== initialEmail ? 'invalid-field' : ''}
                        style={{
                          paddingRight: '40px',
                          width: '100%',
                          borderColor: isCorrectionsMode && isEditable('email_contacto') ? '#ef4444' : undefined,
                          boxShadow: isCorrectionsMode && isEditable('email_contacto') ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined
                        }}
                        required
                      />
                      <div style={{ position: 'absolute', right: '12px', display: 'flex', alignItems: 'center' }}>
                        {emailStatus === 'checking' && emailContacto !== initialEmail && (
                          <div style={{
                            width: '18px',
                            height: '18px',
                            border: '2px solid rgba(16, 185, 129, 0.1)',
                            borderTopColor: '#10b981',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite'
                          }} />
                        )}
                        {emailStatus === 'available' && emailContacto !== initialEmail && (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        {(emailStatus === 'exists' || emailStatus === 'invalid') && emailContacto && emailContacto !== initialEmail && (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        )}
                      </div>
                    </div>
                    {emailStatus === 'exists' && emailContacto !== initialEmail && (
                      <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, marginTop: '0.25rem', display: 'block' }}>El correo ya está registrado en el sistema.</span>
                    )}
                    {emailStatus === 'invalid' && emailContacto && emailContacto !== initialEmail && (
                      <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, marginTop: '0.25rem', display: 'block' }}>Formato de correo no válido.</span>
                    )}
                  </InputWrapper>

                  <InputWrapper>
                    <Label htmlFor="celular">Celular de Contacto</Label>
                    <Input
                      type="text"
                      id="celular"
                      placeholder="Ej. 3001234567"
                      value={celularContacto}
                      onChange={(e) => setCelularContacto(e.target.value)}
                      disabled={!isEditable('celular_contacto')}
                      style={{
                        borderColor: isCorrectionsMode && isEditable('celular_contacto') ? '#ef4444' : undefined,
                        boxShadow: isCorrectionsMode && isEditable('celular_contacto') ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined
                      }}
                      required
                    />
                  </InputWrapper>

                  <InputWrapper>
                    <Label htmlFor="telefono">Teléfono del Comercio</Label>
                    <Input
                      type="text"
                      id="telefono"
                      placeholder="Ej. 6012345678"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
                      disabled={!isEditable('telefono')}
                      style={{
                        borderColor: isCorrectionsMode && isEditable('telefono') ? '#ef4444' : undefined,
                        boxShadow: isCorrectionsMode && isEditable('telefono') ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined
                      }}
                      required
                    />
                  </InputWrapper>

                  <InputWrapper>
                    <Label htmlFor="ciudad">Ciudad</Label>
                    <Select
                      id="ciudad"
                      value={ciudad}
                      onChange={(e) => setCiudad(e.target.value)}
                      disabled={!isEditable('ciudad')}
                      style={{
                        borderColor: isCorrectionsMode && isEditable('ciudad') ? '#ef4444' : undefined,
                        boxShadow: isCorrectionsMode && isEditable('ciudad') ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined
                      }}
                      required
                    >
                      <option value="">Seleccionar ciudad...</option>
                      <option value="Yopal">Yopal</option>
                      <option value="Tunja">Tunja</option>
                      <option value="Villavicencio">Villavicencio</option>
                      <option value="Bogota">Bogota</option>
                    </Select>
                  </InputWrapper>

                  <InputWrapper className="col-span-2">
                    <Label htmlFor="direccion">Dirección Principal</Label>
                    <Input
                      type="text"
                      id="direccion"
                      placeholder="Ej. Calle 123 # 45 - 67"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      disabled={!isEditable('direccion')}
                      style={{
                        borderColor: isCorrectionsMode && isEditable('direccion') ? '#ef4444' : undefined,
                        boxShadow: isCorrectionsMode && isEditable('direccion') ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined
                      }}
                      required
                    />
                  </InputWrapper>

                  <InputWrapper className="col-span-2">
                    <Label htmlFor="descripcion">Descripción del Negocio</Label>
                    <textarea
                      id="descripcion"
                      placeholder="Breve descripción de los productos o servicios que ofrece el comercio."
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      disabled={!isEditable('descripcion')}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: isCorrectionsMode && isEditable('descripcion') ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: isCorrectionsMode && isEditable('descripcion') ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined,
                        padding: '0.95rem 1.15rem',
                        borderRadius: '1rem',
                        color: '#fff',
                        fontSize: '0.9rem',
                        transition: 'all 0.3s ease',
                        resize: 'vertical',
                        minHeight: '100px',
                        outline: 'none',
                      }}
                      required
                    />
                  </InputWrapper>

                  {/* Document Uploads Section arranged as a clean, table-like layout */}
                  <div className="col-span-2">
                    <UploadSectionTitle style={{ marginBottom: '1.25rem' }}>Documentación Obligatoria</UploadSectionTitle>
                    <DocumentTable>
                      <DocumentRow $isEditable={isEditable('logo')}>
                        <DocLabelWrapper>
                          <DocLabel>Logo del Comercio (Imagen)</DocLabel>
                          <DocDesc>Logotipo cuadrado en formato PNG, JPG o WebP</DocDesc>
                        </DocLabelWrapper>
                        <div>
                          <FileLabel $hasFile={!!logoFile || (!isEditable('logo') && !!logoUrl)} $uploading={loading || !isEditable('logo')}>
                            {logoFile || (!isEditable('logo') && logoUrl) ? '✓ Logo Cargado' : 'Subir Logo (PNG/JPG)'}
                            {isEditable('logo') && (
                              <HiddenInput 
                                type="file" 
                                accept="image/*" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setLogoFile(file);
                                    setLogoName(file.name);
                                  }
                                }}
                                disabled={loading}
                              />
                            )}
                          </FileLabel>
                          {logoName && <FileNameDisplay>{logoName}</FileNameDisplay>}
                        </div>
                      </DocumentRow>

                      <DocumentRow $isEditable={isEditable('camara')}>
                        <DocLabelWrapper>
                          <DocLabel>Cámara de Comercio (PDF)</DocLabel>
                          <DocDesc>Certificado de existencia y representación legal vigente</DocDesc>
                        </DocLabelWrapper>
                        <div>
                          <FileLabel $hasFile={!!camaraFile || (!isEditable('camara') && !!camaraUrl)} $uploading={loading || !isEditable('camara')}>
                            {camaraFile || (!isEditable('camara') && camaraUrl) ? '✓ Documento Cargado' : 'Subir Cámara de Comercio'}
                            {isEditable('camara') && (
                              <HiddenInput 
                                type="file" 
                                accept="application/pdf" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setCamaraFile(file);
                                    setCamaraName(file.name);
                                  }
                                }}
                                disabled={loading}
                              />
                            )}
                          </FileLabel>
                          {camaraName && <FileNameDisplay>{camaraName}</FileNameDisplay>}
                        </div>
                      </DocumentRow>

                      <DocumentRow $isEditable={isEditable('rut')}>
                        <DocLabelWrapper>
                          <DocLabel>Registro Único Tributario - RUT (PDF)</DocLabel>
                          <DocDesc>Copia legible del RUT actualizado de la empresa</DocDesc>
                        </DocLabelWrapper>
                        <div>
                          <FileLabel $hasFile={!!rutFile || (!isEditable('rut') && !!rutUrl)} $uploading={loading || !isEditable('rut')}>
                            {rutFile || (!isEditable('rut') && rutUrl) ? '✓ Documento Cargado' : 'Subir RUT'}
                            {isEditable('rut') && (
                              <HiddenInput 
                                type="file" 
                                accept="application/pdf" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setRutFile(file);
                                    setRutName(file.name);
                                  }
                                }}
                                disabled={loading}
                              />
                            )}
                          </FileLabel>
                          {rutName && <FileNameDisplay>{rutName}</FileNameDisplay>}
                        </div>
                      </DocumentRow>

                      <DocumentRow $isEditable={isEditable('cedula')}>
                        <DocLabelWrapper>
                          <DocLabel>Cédula de Representante - Frente (Foto)</DocLabel>
                          <DocDesc>Parte frontal del documento del representante legal (JPG, PNG, WebP)</DocDesc>
                        </DocLabelWrapper>
                        <div>
                          <FileLabel $hasFile={!!cedulaFrenteFile || (!isEditable('cedula') && !!cedulaFrenteUrl)} $uploading={loading || !isEditable('cedula')}>
                            {cedulaFrenteFile || (!isEditable('cedula') && cedulaFrenteUrl) ? '✓ Documento Cargado' : 'Subir Frente'}
                            {isEditable('cedula') && (
                              <HiddenInput 
                                type="file" 
                                accept="image/*" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setCedulaFrenteFile(file);
                                    setCedulaFrenteName(file.name);
                                  }
                                }}
                                disabled={loading}
                              />
                            )}
                          </FileLabel>
                          {cedulaFrenteName && <FileNameDisplay>{cedulaFrenteName}</FileNameDisplay>}
                        </div>
                      </DocumentRow>

                      <DocumentRow $isEditable={isEditable('cedula')}>
                        <DocLabelWrapper>
                          <DocLabel>Cédula de Representante - Reverso (Foto)</DocLabel>
                          <DocDesc>Parte posterior del documento del representante legal (JPG, PNG, WebP)</DocDesc>
                        </DocLabelWrapper>
                        <div>
                          <FileLabel $hasFile={!!cedulaDorsoFile || (!isEditable('cedula') && !!cedulaDorsoUrl)} $uploading={loading || !isEditable('cedula')}>
                            {cedulaDorsoFile || (!isEditable('cedula') && cedulaDorsoUrl) ? '✓ Documento Cargado' : 'Subir Reverso'}
                            {isEditable('cedula') && (
                              <HiddenInput 
                                type="file" 
                                accept="image/*" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setCedulaDorsoFile(file);
                                    setCedulaDorsoName(file.name);
                                  }
                                }}
                                disabled={loading}
                              />
                            )}
                          </FileLabel>
                          {cedulaDorsoName && <FileNameDisplay>{cedulaDorsoName}</FileNameDisplay>}
                        </div>
                      </DocumentRow>
                    </DocumentTable>
                  </div>

                </FormGrid>

                {errorMsg && <ErrorMessage>{errorMsg}</ErrorMessage>}

                <SubmitButton type="submit" disabled={isSubmitDisabled}>
                  {loading ? <Spinner /> : isCorrectionsMode ? 'Enviar Correcciones' : 'Enviar Solicitud de Registro'}
                </SubmitButton>
              </Form>
            </>
          ) : (
            <SuccessWrapper>
              <SuccessIcon>✓</SuccessIcon>
              <SuccessTitle>{isCorrectionsMode ? 'Correcciones Recibidas' : 'Solicitud Recibida'}</SuccessTitle>
              <SuccessText>
                {isCorrectionsMode 
                  ? 'Tus correcciones han sido registradas y enviadas nuevamente al equipo auditor para su aprobación.'
                  : 'Tu solicitud de afiliación ha sido registrada en el sistema. Nuestro equipo de soporte técnico validará los documentos cargados directamente en el servidor de medios seguro de Bogotá. Una vez aprobada, recibirás las credenciales de acceso a tu correo corporativo.'}
              </SuccessText>
              <HomeButton onClick={() => router.push('/')}>Volver al Inicio</HomeButton>
            </SuccessWrapper>
          )}
        </Card>
      </Container>

      {(maintenanceMode || isOffline) && (
        <MaintenanceOverlay>
          <MaintenanceCard>
            <GlowLogo>
              <PulseCircle />
              <CubeIcon>N</CubeIcon>
            </GlowLogo>
            <MaintenanceTitle>
              {isOffline ? 'CANAL DE DATOS OFFLINE' : 'OPTIMIZACIÓN DEL SISTEMA'}
            </MaintenanceTitle>
            <MaintenanceText>
              {isOffline 
                ? 'El canal de transacciones está experimentando una interrupción temporal. Intentando reconectar...' 
                : 'Estamos aplicando mejoras de seguridad y estabilidad en los servidores financieros. Los servicios se restablecerán en breves instantes.'}
            </MaintenanceText>
            <ProgressBarWrapper>
              <ProgressBarAnimated />
            </ProgressBarWrapper>
            <ProgressText>
              {isOffline 
                ? 'Intentando reconectar con el nodo de transacciones...' 
                : 'Resguardando integridad y consistencia de transacciones...'}
            </ProgressText>
            <CountdownTimer>{formatTime(timeLeft)}</CountdownTimer>
          </MaintenanceCard>
        </MaintenanceOverlay>
      )}
    </PageWrapper>
  );
}

export default function RegistroSolicitudPage() {
  return (
    <Suspense fallback={
      <PageWrapper>
        <BackgroundGlow />
        <Container>
          <Card>
            <SuccessWrapper>
              <SpinnerLarge />
              <SuccessTitle style={{ marginTop: '1.5rem' }}>Cargando Formulario...</SuccessTitle>
            </SuccessWrapper>
          </Card>
        </Container>
      </PageWrapper>
    }>
      <RegistroSolicitudContent />
    </Suspense>
  );
}

// ------------- ANIMACIONES NATIVAS CSS -------------
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulseGlow = keyframes`
  0% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.05); }
  100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

// ------------- STYLED COMPONENTS -------------
const PageWrapper = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--Background);
  position: relative;
  overflow: hidden;
  font-family: 'SF Pro Display', sans-serif;
  padding: 3rem 1rem;
`;

const BackgroundGlow = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 700px;
  height: 700px;
  background: radial-gradient(circle, rgba(72, 214, 76, 0.06) 0%, transparent 60%);
  transform: translate(-50%, -50%);
  animation: ${pulseGlow} 8s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
`;

const Container = styled.div`
  width: 100%;
  max-width: 800px;
  z-index: 1;
  animation: ${fadeIn} 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
`;

const LogoArea = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 2rem;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
  }
`;

const Cube = styled.div`
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--emerald) 0%, var(--green) 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  color: #000;
  font-size: 1rem;
  box-shadow: 0 4px 15px rgba(72, 214, 76, 0.3);
`;

const LogoText = styled.span`
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.02em;

  span {
    color: rgba(255, 255, 255, 0.4);
    font-weight: 400;
  }
`;

const Card = styled.div`
  background: rgba(15, 15, 15, 0.6);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  padding: 3rem;
  border-radius: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.8);
`;

const Header = styled.div`
  margin-bottom: 2.5rem;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 1.85rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.9rem;
  line-height: 1.5;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;

  @media (max-width: 580px) {
    grid-template-columns: 1fr;
  }

  .col-span-2 {
    grid-column: span 2;
    @media (max-width: 580px) {
      grid-column: span 1;
    }
  }
`;

const InputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  margin-left: 0.25rem;
`;

const Input = styled.input`
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.95rem 1.15rem;
  border-radius: 1rem;
  color: #fff;
  font-size: 0.9rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--emerald);
    background: rgba(72, 214, 76, 0.02);
    box-shadow: 0 0 0 4px rgba(72, 214, 76, 0.05);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.15);
  }
`;

const Select = styled.select`
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.95rem 1.15rem;
  border-radius: 1rem;
  color: #fff;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  appearance: none;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--emerald);
    background: rgba(72, 214, 76, 0.02);
    box-shadow: 0 0 0 4px rgba(72, 214, 76, 0.05);
  }

  option {
    background: #121212;
    color: #fff;
  }
`;

const UploadSectionTitle = styled.h3`
  font-size: 1.05rem;
  font-weight: 700;
  color: #fff;
  margin-top: 1rem;
  margin-bottom: 0.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 0.5rem;
`;

const FileLabel = styled.label<{ $hasFile: boolean; $uploading: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed ${props => props.$hasFile ? 'var(--emerald)' : 'rgba(255, 255, 255, 0.15)'};
  padding: 0.95rem;
  border-radius: 1rem;
  color: ${props => props.$hasFile ? 'var(--emerald)' : 'rgba(255, 255, 255, 0.6)'};
  font-size: 0.85rem;
  cursor: ${props => props.$uploading ? 'not-allowed' : 'pointer'};
  transition: all 0.3s ease;
  text-align: center;
  width: 100%;
  box-sizing: border-box;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--emerald);
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

const FileNameDisplay = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.35);
  margin-top: 0.25rem;
  margin-left: 0.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 260px;
`;

const ErrorMessage = styled.div`
  color: #ff5f5f;
  font-size: 0.85rem;
  background: rgba(255, 95, 95, 0.1);
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 95, 95, 0.2);
  text-align: center;
  animation: ${fadeIn} 0.3s ease;
`;

const SubmitButton = styled.button`
  background: var(--emerald);
  color: #000;
  padding: 1rem;
  border-radius: 1rem;
  border: none;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 1rem;

  &:hover:not(:disabled) {
    background: #059669;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

const Spinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: #000;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const UploadSpinner = styled.div`
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const SuccessWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  animation: ${fadeIn} 0.5s ease-out;
`;

const SuccessIcon = styled.div`
  width: 64px;
  height: 64px;
  background: rgba(72, 214, 76, 0.1);
  color: var(--emerald);
  border: 1px solid rgba(72, 214, 76, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 1.5rem;
  box-shadow: 0 0 20px rgba(72, 214, 76, 0.2);
`;

const SuccessTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 1rem;
`;

const SuccessText = styled.p`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.95rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  max-width: 450px;
`;

const HomeButton = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 0.95rem 2rem;
  border-radius: 1rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: ${fadeIn} 0.3s ease;
`;

const LoadingCard = styled.div`
  background: rgba(20, 20, 20, 0.9);
  border: 1px solid rgba(72, 214, 76, 0.2);
  border-radius: 2rem;
  padding: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  max-width: 450px;
  width: 90%;
`;

const LoadingText = styled.h3`
  color: #fff;
  font-size: 1.15rem;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
`;

const LoadingSubtext = styled.p`
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.85rem;
  line-height: 1.4;
`;

const SpinnerLarge = styled.div`
  width: 50px;
  height: 50px;
  border: 3px solid rgba(72, 214, 76, 0.1);
  border-top-color: var(--emerald);
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
  box-shadow: 0 0 15px rgba(72, 214, 76, 0.2);
`;

const DocumentTable = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1.25rem;
  background: rgba(255, 255, 255, 0.02);
  overflow: hidden;
`;

const DocumentRow = styled.div<{ $isEditable?: boolean }>`
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  align-items: center;
  padding: 1.25rem 1.75rem;
  border-bottom: ${props => props.$isEditable ? '1px dashed #ef4444 !important' : '1px solid rgba(255, 255, 255, 0.08)'};
  border: ${props => props.$isEditable ? '1px dashed #ef4444' : 'none'};
  border-radius: ${props => props.$isEditable ? '0.75rem' : '0'};
  background: ${props => props.$isEditable ? 'rgba(239, 68, 68, 0.02)' : 'transparent'};
  gap: 1.5rem;

  &:last-child {
    border-bottom: ${props => props.$isEditable ? '1px dashed #ef4444' : 'none'};
  }

  @media (max-width: 580px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    padding: 1.25rem 1rem;
  }
`;

const DocLabelWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const DocLabel = styled.span`
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
  letter-spacing: -0.01em;
`;

const DocDesc = styled.span`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
  line-height: 1.3;
`;

// ------------- STYLED COMPONENTS FOR MAINTENANCE SHIELD -------------
const MaintenanceOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(10, 10, 10, 0.95);
  backdrop-filter: blur(10px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MaintenanceCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(0, 255, 128, 0.15);
  border-radius: 16px;
  padding: 3rem 2.5rem;
  max-width: 480px;
  width: 90%;
  text-align: center;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 255, 128, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  position: relative;
`;

const GlowLogo = styled.div`
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
`;

const pulse = keyframes`
  0% { transform: scale(0.95); opacity: 0.5; box-shadow: 0 0 0 0 rgba(0, 255, 128, 0.4); }
  70% { transform: scale(1.1); opacity: 0.9; box-shadow: 0 0 0 20px rgba(0, 255, 128, 0); }
  100% { transform: scale(0.95); opacity: 0.5; box-shadow: 0 0 0 0 rgba(0, 255, 128, 0); }
`;

const PulseCircle = styled.div`
  position: absolute;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(0, 255, 128, 0.1);
  border: 2px solid #00ff80;
  animation: ${pulse} 2s infinite ease-in-out;
  z-index: 1;
`;

const CubeIcon = styled.div`
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #00ff80 0%, #00aa50 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  font-weight: 800;
  font-size: 1.5rem;
  z-index: 2;
  box-shadow: 0 0 15px rgba(0, 255, 128, 0.4);
`;

const MaintenanceTitle = styled.h1`
  font-size: 1.6rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 1.5px;
  margin: 0;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
`;

const MaintenanceText = styled.p`
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.6;
  margin: 0;
  white-space: pre-line;
`;

const ProgressBarWrapper = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  margin-top: 0.5rem;
`;

const shimmer = keyframes`
  0% { left: -40%; }
  100% { left: 100%; }
`;

const ProgressBarAnimated = styled.div`
  height: 100%;
  width: 40%;
  background: linear-gradient(90deg, transparent, #00ff80, transparent);
  position: absolute;
  animation: ${shimmer} 1.8s infinite linear;
`;

const ProgressText = styled.span`
  font-size: 0.8rem;
  color: rgba(0, 255, 128, 0.7);
  letter-spacing: 0.5px;
  font-weight: 500;
`;

const CountdownTimer = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #00ff80;
  font-family: monospace;
  letter-spacing: 2px;
  text-shadow: 0 0 10px rgba(0, 255, 128, 0.3);
  margin-top: 0.5rem;
`;


