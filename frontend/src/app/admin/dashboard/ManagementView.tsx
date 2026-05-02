'use client';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { fadeIn } from '@/components/Common/UIElements';
import { LoadingState, Spinner, ActionButton } from '@/components/Common/UIElements';
import { getAuthHeaders } from '@/utils/auth';
import { getFullImageUrl } from '@/utils';
import { API_URL } from '@/constants';

/**
 * ManagementView - Orquestador de Navegacion Rapida
 * 
 * Vista simplificada que muestra los comercios registrados
 * y permite navegar directamente a sus paginas de gestion dedicadas.
 * 
 * Toda la logica de CRUD fue movida a:
 * - /admin/dashboard/commerce (Catalogo de Comercios)
 * - /admin/dashboard/stores/[storeId] (Detalle de Sede)
 */
export default function ManagementView() {
  const router = useRouter();
  const [commerces, setCommerces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommerces();
  }, []);

  const fetchCommerces = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/manage/commerces`, {
        headers: getAuthHeaders()
      });
      setCommerces(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <LoadingState>
        <Spinner />
        <p>Cargando comercios...</p>
      </LoadingState>
    );
  }

  return (
    <Container>
      <Header>
        <h2>Vista Rapida de Comercios</h2>
        <ActionButton 
          $variant="success" 
          onClick={() => router.push('/admin/dashboard/commerce')}
        >
          Ir al Catalogo Completo
        </ActionButton>
      </Header>

      <Grid>
        {commerces.map((commerce) => (
          <Card 
            key={commerce.id}
            onClick={() => router.push('/admin/dashboard/commerce')}
          >
            <CardImage>
              <img 
                src={getFullImageUrl(commerce.logo_url) || 'https://via.placeholder.com/150'} 
                alt={commerce.nombre} 
              />
            </CardImage>
            <CardBody>
              <h3>{commerce.nombre}</h3>
              <p className="type">{commerce.type}</p>
              {commerce.descripcion && (
                <p className="desc">{commerce.descripcion}</p>
              )}
              <span className="link">Gestionar &rarr;</span>
            </CardBody>
          </Card>
        ))}
      </Grid>
    </Container>
  );
}

// === STYLED COMPONENTS ===

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  animation: ${fadeIn} 0.3s ease;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;

  h2 {
    font-size: 1.5rem;
    font-weight: 300;
    color: #fff;
    letter-spacing: -0.02em;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
`;

const Card = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #10b981;
    transform: translateY(-4px);
    background: rgba(255, 255, 255, 0.04);
  }
`;

const CardImage = styled.div`
  height: 120px;
  background: #0a0a0a;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const CardBody = styled.div`
  padding: 16px;

  h3 {
    font-size: 1.1rem;
    font-weight: 700;
    color: #fff;
    margin-bottom: 4px;
  }

  .type {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.3);
    margin-bottom: 8px;
  }

  .desc {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.4);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin-bottom: 12px;
  }

  .link {
    font-size: 0.8rem;
    font-weight: 700;
    color: #10b981;
  }
`;
