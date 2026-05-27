'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AlertModal } from '@/components/Common/AlertModal';

interface PopularProduct {
  id: number;
  nombre: string;
  image_url: string;
  sales_count: number;
  last_update: string;
  commerce_name: string;
}

export default function IntelligencePage() {
  const router = useRouter();
  const { token } = useAuth();
  const [ranking, setRanking] = useState<PopularProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  
  // Modal State
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmAction: null as (() => void) | null
  });

  const fetchRanking = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/manage/analytics/popularity`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setRanking(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchRanking();
  }, [token]);

  const handleTriggerUpdate = async () => {
    setUpdating(true);
    setMessage('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/manage/analytics/trigger`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMessage('Ranking actualizado con éxito');
        fetchRanking();
      }
    } catch (e) {
      setMessage('Error al actualizar');
    } finally {
      setUpdating(false);
    }
  };

  const handleGenerateTags = async () => {
    setModal({
      isOpen: true,
      title: 'Confirmar Normalización',
      message: '¿Seguro que deseas normalizar y auto-generar los tags de todo el catálogo?\n\nEste proceso puede tardar unos minutos dependiendo del tamaño del catálogo.',
      confirmAction: executeTagGeneration
    });
  };

  const executeTagGeneration = async () => {
    setGenerating(true);
    setProgress(0);
    setMessage('');
    
    let currentOffset = 0;
    let finished = false;
    let totalUpdated = 0;

    try {
      while (!finished) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/manage/intelligence/generate-tags`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ offset: currentOffset, limit: 50 })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        currentOffset = data.nextOffset;
        finished = data.isFinished;
        totalUpdated += data.updated;
        
        const percentage = Math.round((currentOffset / data.total) * 100);
        setProgress(percentage);
      }
      
      setMessage(`Proceso completado. ${totalUpdated} productos actualizados.`);
    } catch (e: any) {
      setMessage(`Error: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Container>
      <Header>
        <TitleGroup>
          <Title>Motor de Inteligencia</Title>
          <Subtitle>Control de algoritmos semánticos y popularidad global</Subtitle>
        </TitleGroup>
        
        <Actions>
          {message && <StatusMsg>{message}</StatusMsg>}
          <ActionButton onClick={handleTriggerUpdate} disabled={updating}>
            {updating ? 'Procesando...' : 'Actualizar Ranking Ahora'}
          </ActionButton>
        </Actions>
      </Header>

      <Grid>
        <Card>
          <CardHeader>
            <CardTitle>Top Productos (Global)</CardTitle>
            <Badge>Ventas Totales</Badge>
          </CardHeader>
          
          {loading ? (
            <LoadingText>Cargando datos del motor...</LoadingText>
          ) : ranking.length === 0 ? (
            <LoadingText style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              No hay datos suficientes para calcular el ranking. 
              <br/>Realice ventas o ejecute el cálculo del motor.
            </LoadingText>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Comercio</th>
                  <th>Ventas</th>
                  <th>Última Act.</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <ProductCell>
                        <ProductImg src={item.image_url?.startsWith('http') ? item.image_url : `${process.env.NEXT_PUBLIC_API_URL}${item.image_url}`} />
                        <ProductName>{item.nombre}</ProductName>
                      </ProductCell>
                    </td>
                    <td><StoreTag>{item.commerce_name}</StoreTag></td>
                    <td><Count>{item.sales_count}</Count></td>
                    <td><DateText>{new Date(item.last_update).toLocaleDateString()}</DateText></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <StatsContainer>
          <StatCard>
            <StatTitle>Estado del Motor</StatTitle>
            <StatValue color="var(--emerald)">ACTIVO</StatValue>
            <StatDesc>Cálculo programado cada 24h</StatDesc>
          </StatCard>
          
          <StatCard>
            <StatTitle>Algoritmo VIP Displacement</StatTitle>
            <StatValue>Semántico</StatValue>
            <StatDesc>Basado en tags y ventas</StatDesc>
          </StatCard>

          <StatCard>
            <StatTitle>Mantenimiento de Catálogo</StatTitle>
            <StatValue style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Tags Semánticos</StatValue>
            
            {generating && (
              <ProgressWrapper>
                <ProgressBar width={progress} />
                <ProgressText>{progress}% procesado</ProgressText>
              </ProgressWrapper>
            )}

            <ActionButton 
              onClick={handleGenerateTags} 
              disabled={generating}
              style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem' }}
            >
              {generating ? 'Procesando Lote...' : 'Normalizar Catálogo Completo'}
            </ActionButton>

            <ActionButton 
              onClick={() => router.push('/admin/dashboard/intelligence/stop-words')} 
              style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', marginTop: '0.5rem' }}
            >
              Configurar Lista Negra
            </ActionButton>
          </StatCard>
        </StatsContainer>
      </Grid>

      <AlertModal 
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal({ ...modal, isOpen: false })}
        onConfirm={modal.confirmAction || undefined}
        onCancel={modal.confirmAction ? (() => setModal({ ...modal, isOpen: false })) : undefined}
        confirmText={modal.confirmAction ? 'Iniciar Proceso' : 'Aceptar'}
      />
    </Container>
  );
}

// ------------- STYLED COMPONENTS -------------

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TitleGroup = styled.div``;

const Title = styled.h1`
  font-size: 1.8rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.95rem;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
`;

const StatusMsg = styled.span`
  color: var(--emerald);
  font-size: 0.9rem;
  font-weight: 500;
`;

const ActionButton = styled.button`
  background: var(--emerald);
  color: #000;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(72, 214, 76, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 2rem;
`;

const Card = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 1.5rem;
  padding: 1.5rem;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const CardTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
`;

const Badge = styled.span`
  background: rgba(255, 255, 255, 0.05);
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th {
    text-align: left;
    padding: 1rem;
    color: rgba(255, 255, 255, 0.3);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  td {
    padding: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    color: #fff;
    font-size: 0.9rem;
  }
`;

const ProductCell = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const ProductImg = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: cover;
`;

const ProductName = styled.span`
  font-weight: 500;
`;

const StoreTag = styled.span`
  background: rgba(72, 214, 76, 0.1);
  color: var(--emerald);
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  font-size: 0.8rem;
`;

const Count = styled.span`
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
`;

const DateText = styled.span`
  color: rgba(255, 255, 255, 0.4);
`;

const LoadingText = styled.div`
  padding: 4rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.2);
`;

const StatsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border-radius: 1.2rem;
  padding: 1.5rem;
  border-left: 4px solid var(--emerald);
`;

const StatTitle = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 0.5rem;
`;

const StatValue = styled.div<{ color?: string }>`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.color || '#fff'};
  margin-bottom: 0.25rem;
`;

const StatDesc = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.2);
`;

const ProgressWrapper = styled.div`
  margin-bottom: 1rem;
`;

const ProgressBar = styled.div<{ width: number }>`
  height: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  position: relative;
  overflow: hidden;
  margin-bottom: 0.5rem;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: ${props => props.width}%;
    background: var(--emerald);
    transition: width 0.3s ease;
    box-shadow: 0 0 10px rgba(72, 214, 76, 0.5);
  }
`;

const ProgressText = styled.div`
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
`;
