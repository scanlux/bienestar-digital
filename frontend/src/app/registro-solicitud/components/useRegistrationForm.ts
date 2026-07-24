import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_URL } from '@/constants';
import { useEmailValidation } from '@/hooks/useEmailValidation';

// Canvas image compression helper
export const compressImage = (file: File): Promise<Blob> => {
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
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas compression failed'));
        }, 'image/jpeg', 0.8);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const scanPdfForExploits = (file: File): Promise<boolean> => {
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
          return resolve(true);
        }
      }
      resolve(false);
    };
    reader.onerror = () => resolve(true);
    reader.readAsArrayBuffer(file);
  });
};

export function useRegistrationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [step, setStep] = useState(1);
  const nextStep = () => setStep((s) => Math.min(s + 1, 3));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  // Step 1: Commerce Info
  const [tipoSolicitud, setTipoSolicitud] = useState<'commerce' | 'delivery_company'>('commerce');
  const [nit, setNit] = useState('');
  const [nitDv, setNitDv] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [telefono, setTelefono] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [direccion, setDireccion] = useState('');
  const [descripcion, setDescripcion] = useState('');

  // Documents
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

  // Step 2: Admin Email & Password
  const [emailContacto, setEmailContacto] = useState('');
  const { emailStatus } = useEmailValidation(emailContacto);
  const [nombresContacto, setNombresContacto] = useState('');
  const [apellidosContacto, setApellidosContacto] = useState('');
  const [celularContacto, setCelularContacto] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 3: Terms & Captcha
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [captchaValue, setCaptchaValue] = useState('');
  const [signature, setSignature] = useState('');

  // Corrections Mode
  const [isCorrectionsMode, setIsCorrectionsMode] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [initialEmail, setInitialEmail] = useState('');
  const [documentUrls, setDocumentUrls] = useState<any>({});

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

          setDocumentUrls({
            logo: request.logo_url,
            camara: request.documento_camara_comercio,
            rut: request.documento_rut,
            cedula_frente: request.documento_cedula_frente,
            cedula_dorso: request.documento_cedula_dorso
          });
        }
      } catch (err: any) {
        setErrorMsg(err.response?.data?.error || 'Token inválido.');
      } finally {
        setLoading(false);
      }
    };
    verifyToken();
  }, [token]);

  const isEditable = (key: string) => !isCorrectionsMode || missingFields.includes(key);
  const docRequired = (key: string) => !isCorrectionsMode || missingFields.includes(key);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }
    if (!acceptTerms || !signature || captchaValue !== '5') {
      setErrorMsg('Debes aceptar los términos, firmar y resolver el captcha (el resultado es 5).');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccess(false);

    try {
      const pdfs = [];
      if (camaraFile && camaraFile.type === 'application/pdf') pdfs.push({ file: camaraFile, name: 'Cámara de Comercio' });
      if (rutFile && rutFile.type === 'application/pdf') pdfs.push({ file: rutFile, name: 'RUT' });

      for (const pdf of pdfs) {
        const hasExploit = await scanPdfForExploits(pdf.file);
        if (hasExploit) throw new Error(`El PDF de ${pdf.name} contiene scripts no permitidos.`);
      }

      let logoBlob = null;
      if (logoFile) logoBlob = await compressImage(logoFile);

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
      formData.append('password_hash', password);
      formData.append('signature', signature);
      
      if (isCorrectionsMode && token) {
        formData.append('token', token);
        Object.entries(documentUrls).forEach(([k, v]) => formData.append(`documento_${k}`, v as string));
      }

      if (logoFile && logoBlob) formData.append('logo', logoBlob, 'logo.jpg');
      if (camaraFile) formData.append('camara', camaraFile, camaraFile.name);
      if (rutFile) formData.append('rut', rutFile, rutFile.name);
      if (cedulaFrenteFile) formData.append('cedula_frente', cedulaFrenteFile, cedulaFrenteFile.name);
      if (cedulaDorsoFile) formData.append('cedula_dorso', cedulaDorsoFile, cedulaDorsoFile.name);

      const mediaServer = process.env.NEXT_PUBLIC_MEDIA_URL || 'http://localhost:4001';
      const response = await axios.post(`${mediaServer}/api/public/requests`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data && response.data.success) {
        setSuccess(true);
      } else {
        throw new Error('Error al registrar la solicitud.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Ocurrió un error al procesar tu solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return {
    step, nextStep, prevStep,
    formState: {
      tipoSolicitud, setTipoSolicitud, nit, setNit, nitDv, setNitDv, razonSocial, setRazonSocial,
      telefono, setTelefono, ciudad, setCiudad, direccion, setDireccion, descripcion, setDescripcion,
      logoFile, setLogoFile, logoName, setLogoName, camaraFile, setCamaraFile, camaraName, setCamaraName,
      rutFile, setRutFile, rutName, setRutName, cedulaFrenteFile, setCedulaFrenteFile, cedulaFrenteName, setCedulaFrenteName,
      cedulaDorsoFile, setCedulaDorsoFile, cedulaDorsoName, setCedulaDorsoName,
      emailContacto, setEmailContacto, nombresContacto, setNombresContacto, apellidosContacto, setApellidosContacto,
      celularContacto, setCelularContacto, password, setPassword, confirmPassword, setConfirmPassword,
      acceptTerms, setAcceptTerms, captchaValue, setCaptchaValue, signature, setSignature,
      isCorrectionsMode, missingFields, initialEmail, documentUrls
    },
    validation: { emailStatus, isEditable, docRequired, loading, success, errorMsg, router },
    handleSubmit
  };
}
