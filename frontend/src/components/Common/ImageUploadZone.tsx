'use client';

import React, { useState, useRef } from 'react';
import styled, { css } from 'styled-components';
import axios from 'axios';
import { Spinner } from './UIElements';
import { getAuthToken } from '@/utils/auth';
import { getFullImageUrl } from '@/utils';
import { API_URL } from '@/constants';


interface ImageUploadZoneProps {
  onUploadSuccess: (url: string) => void;
  initialImage?: string;
  label?: string;
  endpoint?: string;
  placeholderText?: string;
  helperText?: string;
}

export const ImageUploadZone: React.FC<ImageUploadZoneProps> = ({ 
  onUploadSuccess, 
  initialImage,
  label = "Imagen",
  endpoint = "/api/upload/store",
  placeholderText = "Subir Imagen",
  helperText = "Haz clic o arrastra una imagen aquí"
}) => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(initialImage || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar previsualización cuando cambia la imagen inicial (ej. al editar diferentes sedes)
  React.useEffect(() => {
    setPreview(initialImage || null);
  }, [initialImage]);

  const handleFile = async (file: File) => {
    if (!file) return;
    
    // Reset estado
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const token = getAuthToken();
      
      const response = await axios.post(`${API_URL}${endpoint}`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}` 
        }
      });

      if (response.data.success) {
        let newUrl = response.data.url;
        
        // Sanitización: Si el servidor devuelve una URL con localhost o relativa, la forzamos a producción
        if (!newUrl.startsWith('https://')) {
          // Si es localhost o relativa, la convertimos a la URL oficial de producción
          const PRODUCTION_DOMAIN = 'https://trendy.sytes.net';
          if (newUrl.includes('/uploads/')) {
             const pathParts = newUrl.split('/uploads/');
             newUrl = `${PRODUCTION_DOMAIN}/uploads/${pathParts[pathParts.length - 1]}`;
          }
        }
        
        // Doble check: reemplazo explícito de localhost
        newUrl = newUrl.replace(/http:\/\/(localhost|127\.0\.0\.1):[0-9]+/, 'https://trendy.sytes.net');

        setPreview(newUrl);
        onUploadSuccess(newUrl);
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      const msg = err.response?.data?.error || 'Error al subir la imagen. Verifica el tamaño y formato.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const onContainerClick = () => {
    fileInputRef.current?.click();
  };

  // getFullImageUrl importado desde @/utils

  return (
    <UploadContainer>
      <Label>{label}</Label>
      <DropZone 
        onClick={onContainerClick} 
        $hasError={!!error}
        $isLoading={loading}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={onFileChange} 
          accept="image/*" 
          style={{ display: 'none' }} 
        />
        
        {loading ? (
          <div className="status-box">
            <Spinner />
            <p>Optimizando foto original...</p>
          </div>
        ) : preview ? (
          <PreviewWrapper>
            <img src={getFullImageUrl(preview)} alt="Preview" />
            <div className="overlay">
              <span>Clic para cambiar imagen</span>
            </div>
          </PreviewWrapper>
        ) : (
          <div className="placeholder">
            <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/></svg>
            <p>{placeholderText}</p>
            <span>{helperText}</span>
          </div>
        )}
      </DropZone>
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </UploadContainer>
  );
};

const UploadContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
`;

const Label = styled.label`
  font-size: 0.85rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const DropZone = styled.div<{ $hasError: boolean; $isLoading: boolean }>`
  width: 100%;
  height: 200px;
  border-radius: 16px;
  border: 2px dashed ${props => props.$hasError ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'};
  background: rgba(255, 255, 255, 0.02);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    border-color: ${props => props.$hasError ? '#ef4444' : 'var(--emerald, #10b981)'};
    background: rgba(255, 255, 255, 0.04);
  }

  ${props => props.$isLoading && css`
    pointer-events: none;
    cursor: default;
  `}

  .status-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    p { font-size: 0.85rem; color: #10b981; font-weight: 600; }
  }

  .placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: rgba(255, 255, 255, 0.2);
    
    svg { width: 32px; height: 32px; }
    p { font-size: 0.95rem; font-weight: 600; color: rgba(255, 255, 255, 0.4); }
    span { font-size: 0.75rem; color: rgba(255, 255, 255, 0.2); }
  }
`;

const PreviewWrapper = styled.div`
  width: 100%;
  height: 100%;
  position: relative;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s;
    span { color: #fff; font-weight: 600; border: 1px solid #fff; padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; }
  }

  &:hover .overlay {
    opacity: 1;
  }
`;

const ErrorMessage = styled.p`
  color: #ef4444;
  font-size: 0.8rem;
  font-weight: 600;
  margin-top: 4px;
`;
