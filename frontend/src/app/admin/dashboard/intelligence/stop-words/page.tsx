'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ActionButton, LoadingState, Spinner, HeaderBackButton } from '@/components/Common/UIElements';
import { AlertModal } from '@/components/Common/AlertModal';
import { API_URL } from '@/constants';


interface StopWord {
  id: number;
  word: string;
  created_at: string;
}

export default function StopWordsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const toast = useToast();
  const [words, setWords] = useState<StopWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWord, setNewWord] = useState('');
  const [adding, setAdding] = useState(false);

  // Modal State
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmAction: null as (() => void) | null
  });

  useEffect(() => {
    if (token) fetchWords();
  }, [token]);

  const fetchWords = async () => {
    try {
      const res = await fetch(`${API_URL}/api/manage/intelligence/stop-words`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setWords(data);
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar la lista negra');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;
    
    setAdding(true);
    try {
      const res = await fetch(`${API_URL}/api/manage/intelligence/stop-words`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ word: newWord })
      });
      
      if (res.ok) {
        toast.success('Palabra agregada');
        setNewWord('');
        fetchWords();
      }
    } catch (e) {
      toast.error('Error al agregar palabra');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteWord = (id: number, word: string) => {
    setModal({
      isOpen: true,
      title: 'Eliminar Palabra',
      message: `¿Estás seguro de que deseas eliminar "${word}" de la lista negra?\n\nEl motor de inteligencia volverá a considerar esta palabra para el etiquetado semántico.`,
      confirmAction: () => executeDelete(id, word)
    });
  };

  const executeDelete = async (id: number, word: string) => {
    try {
      const res = await fetch(`${API_URL}/api/manage/intelligence/stop-words/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        toast.success(`"${word}" eliminada correctamente`);
        fetchWords();
        setModal(prev => ({ ...prev, isOpen: false }));
      } else {
        const errorData = await res.json();
        // Usar el Modal Inteligente para mostrar el error de permisos/API
        setModal({
          isOpen: true,
          title: 'Error de Permisos / Servidor',
          message: `No se pudo eliminar la palabra:\n\n${errorData.error || 'Error desconocido'}\n\nPor favor, verifica los privilegios de la base de datos.`,
          confirmAction: null // Al ser null, solo mostrará botón de "Aceptar"
        });
      }
    } catch (e) {
      toast.error('Error de conexión al eliminar');
      setModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  if (loading) {
    return (
      <LoadingState>
        <Spinner />
        <p>Cargando lista negra...</p>
      </LoadingState>
    );
  }

  return (
    <Container>
      <HeaderBackButton onClick={() => router.back()}>← Volver</HeaderBackButton>
      <Header>
        <TitleGroup>
          <Title>Gestión de Lista Negra (Stop Words)</Title>
          <Subtitle>Palabras que el motor de inteligencia ignorará al generar tags automáticamente.</Subtitle>
        </TitleGroup>
      </Header>

      <Content>
        <AddSection onSubmit={handleAddWord}>
          <Input 
            type="text" 
            placeholder="Ej: ingrediente, fresco, delicioso (puedes usar espacios o comas)" 
            value={newWord}
            onChange={(e) => setNewWord(e.target.value.toLowerCase())}
            disabled={adding}
          />
          <ActionButton type="submit" disabled={adding || !newWord.trim()} $variant="success-solid">
            {adding ? 'Agregando...' : 'Agregar Palabras'}
          </ActionButton>
        </AddSection>

        <Grid>
          {words.length === 0 ? (
            <EmptyMsg>La lista negra está vacía.</EmptyMsg>
          ) : (
            words.map((w) => (
              <WordCard key={w.id}>
                <WordText>{w.word}</WordText>
                <DeleteBtn onClick={() => handleDeleteWord(w.id, w.word)} title="Eliminar">×</DeleteBtn>
              </WordCard>
            ))
          )}
        </Grid>
      </Content>

      <AlertModal 
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal({ ...modal, isOpen: false })}
        onConfirm={modal.confirmAction || undefined}
        onCancel={() => setModal({ ...modal, isOpen: false })}
        confirmText="Eliminar de la lista"
      />
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

const Content = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 1.5rem;
  padding: 2rem;
`;

const AddSection = styled.form`
  display: flex;
  gap: 1rem;
  margin-bottom: 2.5rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

const Input = styled.input`
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 0.8rem 1.2rem;
  color: #fff;
  font-size: 1rem;
  &:focus { outline: 1px solid var(--emerald); }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
`;

const WordCard = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  padding: 0.6rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-2px);
  }
`;

const WordText = styled.span`
  color: #fff;
  font-weight: 500;
  font-size: 0.9rem;
`;

const DeleteBtn = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: none;
  color: rgba(255, 255, 255, 0.3);
  font-size: 1.1rem;
  cursor: pointer;
  line-height: 1;
  padding: 0.4rem;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
  
  &:hover {
    background: rgba(255, 77, 77, 0.2);
    color: #ff4d4d;
    transform: scale(1.1);
  }
`;

const EmptyMsg = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 3rem;
  color: rgba(255, 255, 255, 0.2);
`;
