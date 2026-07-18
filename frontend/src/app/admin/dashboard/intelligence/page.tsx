'use client';

import React, { useState, useEffect } from 'react';
import {
  Container, Header, TitleGroup, Title, Subtitle, Actions, StatusMsg,
  ActionButton, Grid, Card, CardHeader, CardTitle, Badge, Table,
  ProductCell, ProductImg, ProductName, StoreTag, Count, DateText,
  LoadingText, StatsContainer, StatCard, StatTitle, StatValue,
  StatDesc, ProgressWrapper, ProgressBar, ProgressText
} from './IntelligenceStyles';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';
import { API_URL } from '@/constants';


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
  const { showConfirm } = useAlert();
  const [ranking, setRanking] = useState<PopularProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');

  const fetchRanking = async () => {
    try {
      const res = await fetch(`${API_URL}/api/manage/analytics/popularity`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setRanking(data);
      } else {
        setRanking([]);
        if (data && data.error) {
          setMessage(data.error);
        }
      }
    } catch (e) {
      console.error(e);
      setRanking([]);
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
      const res = await fetch(`${API_URL}/api/manage/analytics/trigger`, {
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

  const handleGenerateTags = () => {
    showConfirm({
      title: 'Confirmar Normalización',
      message: '¿Seguro que deseas normalizar y auto-generar los tags de todo el catálogo?\n\nEste proceso puede tardar unos minutos dependiendo del tamaño del catálogo.',
      confirmText: 'Iniciar Proceso',
      cancelText: 'Cancelar',
      onConfirm: executeTagGeneration
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
        const res = await fetch(`${API_URL}/api/manage/intelligence/generate-tags`, {
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
                        <ProductImg src={item.image_url?.startsWith('http') ? item.image_url : `${API_URL}${item.image_url}`} />
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


    </Container>
  );
}


