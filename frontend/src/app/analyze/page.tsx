'use client';

import { useState } from 'react';
import styled from 'styled-components';
import { GetStartedButton } from '@/components';
import MaskText from '@/components/Common/MaskText';

const Wrapper = styled.div`
  padding-top: 150px;
  min-height: 100vh;
  background-color: var(--Background);
  color: var(--white);
`;

const Inner = styled.div`
  width: 90%;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 3rem;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const FormContainer = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 1rem;
  color: var(--grey);
`;

const Input = styled.input`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem;
  color: var(--white);
  font-size: 1rem;
  outline: none;
  transition: border-color 0.3s ease;

  &:focus {
    border-color: var(--emerald);
  }
`;

const Button = styled.button`
  background-color: var(--emerald);
  color: var(--Background);
  border: none;
  border-radius: 30px;
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
  align-self: flex-start;

  &:hover {
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ResultsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const CommentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const CommentItem = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const Checkbox = styled.input`
  margin-top: 0.3rem;
  width: 1.2rem;
  height: 1.2rem;
  cursor: pointer;
  accent-color: var(--emerald);
`;

const CommentText = styled.p`
  font-size: 1rem;
  line-height: 1.5;
  color: var(--grey);
  margin: 0;
`;

const ActionPanel = styled.div`
  position: sticky;
  bottom: 2rem;
  background: var(--Background);
  border: 1px solid var(--emerald);
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;

const StatusMessage = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 8px;
  background: ${props => props.type === 'success' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => props.type === 'success' ? 'var(--emerald)' : 'var(--white)'};
  text-align: center;
`;

export default function AnalyzePage() {
  const [url, setUrl] = useState('');
  const [selector, setSelector] = useState('');
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [selectedComments, setSelectedComments] = useState<number[]>([]);
  const [responseStatus, setResponseStatus] = useState<{ type: string, message: string } | null>(null);

  const handleAnalyze = async () => {
    if (!url || !selector) return;

    setLoading(true);
    setComments([]);
    setResponseStatus(null);

    try {
      console.log('Sending request to http://localhost:4000/api/analyze');
      const res = await fetch('http://localhost:4000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, selector }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log('Received data:', data);

      if (data.success) {
        setComments(data.data);
      } else {
        console.error('Backend returned success: false');
      }
    } catch (error) {
      console.error('Error analyzing:', error);
      alert('Error al conectar con el servidor. Revisa la consola para más detalles.');
    } finally {
      setLoading(false);
    }
  };

  const toggleComment = (id: number) => {
    setSelectedComments(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleRespond = async () => {
    if (selectedComments.length === 0) return;

    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: selectedComments }),
      });

      const data = await res.json();
      if (data.success) {
        setResponseStatus({
          type: 'success',
          message: `¡Éxito! Se ha respondido a ${data.respondedCount} comentarios con: "Dios los bendiga"`
        });
        setSelectedComments([]);
      }
    } catch (error) {
      console.error('Error responding:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Wrapper>
      <Inner>
        <Header>
          <MaskText phrases={['Análisis de Discurso']} tag="h1" />
          <MaskText phrases={['Analiza y modera comentarios automáticamente']} tag="p" />
        </Header>

        <FormContainer>
          <InputGroup>
            <Label>URL a analizar</Label>
            <Input
              type="text"
              placeholder="https://ejemplo.com/articulo"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </InputGroup>
          <InputGroup>
            <Label>Selector de comentarios</Label>
            <Input
              type="text"
              placeholder=".comment-body, #comments li"
              value={selector}
              onChange={(e) => setSelector(e.target.value)}
            />
          </InputGroup>
          <Button onClick={handleAnalyze} disabled={loading || !url || !selector}>
            {loading ? 'Procesando...' : 'Analizar comentarios'}
          </Button>
        </FormContainer>

        {comments.length > 0 && (
          <ResultsContainer>
            <MaskText phrases={['Comentarios Detectados']} tag="h2" />
            <CommentList>
              {comments.map((comment) => (
                <CommentItem key={comment.id}>
                  <Checkbox
                    type="checkbox"
                    checked={selectedComments.includes(comment.id)}
                    onChange={() => toggleComment(comment.id)}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--emerald)' }}>{comment.author}</span>
                    <CommentText>{comment.text}</CommentText>
                  </div>
                </CommentItem>
              ))}
            </CommentList>

            {selectedComments.length > 0 && (
              <ActionPanel>
                <div>
                  <strong>{selectedComments.length}</strong> comentarios seleccionados
                </div>
                <Button onClick={handleRespond} disabled={loading}>
                  {loading ? 'Enviando...' : 'Responder con IA'}
                </Button>
              </ActionPanel>
            )}
          </ResultsContainer>
        )}

        {responseStatus && (
          <StatusMessage type={responseStatus.type}>
            {responseStatus.message}
          </StatusMessage>
        )}
      </Inner>
    </Wrapper>
  );
}
