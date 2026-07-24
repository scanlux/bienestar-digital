export interface RegistrationRequest {
  id: number;
  tipo_solicitud: 'commerce' | 'delivery_company';
  nit: string;
  nit_dv?: string;
  razon_social: string;
  email_contacto: string;
  nombres_contacto: string;
  apellidos_contacto: string;
  celular_contacto: string;
  telefono?: string;
  ciudad?: string;
  direccion?: string;
  descripcion?: string;
  logo_url?: string;
  documento_camara_comercio?: string;
  documento_rut?: string;
  documento_cedula?: string;
  documento_cedula_frente?: string;
  documento_cedula_dorso?: string;
  created_at?: string;
  estado?: 'pendiente' | 'aprobado' | 'rechazado' | 'espera_informacion';
  notas_system?: string;
  updated_at?: string;
  verified_fields?: any;
}

export interface Invitation {
  id: number;
  email: string;
  razon_social: string;
  created_at: string;
}
