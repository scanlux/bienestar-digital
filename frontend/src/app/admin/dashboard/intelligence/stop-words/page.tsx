'use client';

import React, { useState, useEffect } from 'react';
import {
  Container, Header, TitleGroup, Title, Subtitle, Content,
  AddSection, Input, Grid, WordCard, WordText, DeleteBtn, EmptyMsg
} from './StopWordsStyles';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ActionButton, LoadingState, Spinner, HeaderBackButton } from '@/components/Common/UIElements';
import { useAlert } from '@/context/AlertContext';
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
  const { showAlert, showConfirm } = useAlert();
  const [words, setWords] = useState<StopWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWord, setNewWord] = useState('');
  const [adding, setAdding] = useState(false);

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
    showConfirm({
      title: 'Eliminar Palabra',
      message: `¿Estás seguro de que deseas eliminar "${word}" de la lista negra?\n\nEl motor de inteligencia volverá a considerar esta palabra para el etiquetado semántico.`,
      confirmText: 'Eliminar de la lista',
      cancelText: 'Cancelar',
      onConfirm: () => executeDelete(id, word)
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
      } else {
        const errorData = await res.json();
        // Usar el Modal Inteligente para mostrar el error de permisos/API
        showAlert({
          title: 'Error de Permisos / Servidor',
          message: `No se pudo eliminar la palabra:\n\n${errorData.error || 'Error desconocido'}\n\nPor favor, verifica los privilegios de la base de datos.`,
          confirmText: 'Aceptar'
        });
      }
    } catch (e) {
      toast.error('Error de conexión al eliminar');
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


    </Container>
  );
}


