// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { GetStartedButton } from '@/components';
import MaskText from '@/components/Common/MaskText';

const Wrapper = styled.div<any>`
  padding-top: 150px;
  min-height: 100vh;
  background-color: var(--Background);
  color: var(--white);
`;

const Inner = styled.div<any>`
  width: 90%;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 3rem;
`;

const Header = styled.div<any>`
  text-align: center;
  margin-bottom: 2rem;
`;

const FormContainer = styled.div<any>`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const InputGroup = styled.div<any>`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label<any>`
  font-size: 1rem;
  color: var(--grey);
`;

const Input = styled.input<any>`
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

const Button = styled.button<any>`
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

const ResultsContainer = styled.div<any>`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const CommentList = styled.div<any>`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const CommentItem = styled.div<any>`
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

const Checkbox = styled.input<any>`
  margin-top: 0.3rem;
  width: 1.2rem;
  height: 1.2rem;
  cursor: pointer;
  accent-color: var(--emerald);
`;

const CommentText = styled.p<any>`
  font-size: 1rem;
  line-height: 1.5;
  color: var(--grey);
  margin: 0;
`;

const ActionPanel = styled.div<any>`
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

const StatusMessage = styled.div<any>`
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 8px;
  background: ${(props: any) => props.type === 'success' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${(props: any) => props.type === 'success' ? 'var(--emerald)' : 'var(--white)'};
  text-align: center;
`;

export default function AnalyzePage() {
  const [url, setUrl] = useState("");
  const [selector, setSelector] = useState(".comment-item");
  const [comments, setComments] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [aiResponse, setAiResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleScrape = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });
    setComments([]);
    setAiResponse("");

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, selector })
      });
      const data = await res.json();
      
      if (data.success) {
        setComments(data.data);
        setStatus({ type: 'success', message: `Se extrajeron ${data.data.length} comentarios exitosamente.` });
      } else {
        setStatus({ type: 'error', message: data.error || 'Error al analizar la página' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Error de conexión con el servidor' });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: any) => {
    setSelectedIds((prev: any) => 
      prev.includes(id) ? prev.filter((i: any) => i !== id) : [...prev, id]
    );
  };

  const handleGenerateAI = async () => {
    if (selectedIds.length === 0) return;
    
    setAiLoading(true);
    const selectedTexts = comments
      .filter((c: any) => selectedIds.includes(c.id))
      .map((c: any) => c.text)
      .join('\n\n');

    const prompt = `Analiza los siguientes comentarios extraídos de un sitio web y proporciona un resumen de las preocupaciones principales y una sugerencia de respuesta para cada uno:\n\n${selectedTexts}`;

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();

      if (data.success) {
        setAiResponse(data.response);
      } else {
        setStatus({ type: 'error', message: data.error || 'Error al generar respuesta IA' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Error de conexión con el servicio de IA' });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <Wrapper>
      <Inner>
        <Header>
          <MaskText phrases={["Analizador de Respuestas", "Impulsado por Gemini AI"]} />
        </Header>

        <FormContainer>
          <InputGroup>
            <Label>URL del Sitio (Blog, Foro, YouTube...)</Label>
            <Input 
              type="text" 
              placeholder="https://ejemplo.com/comentarios" 
              value={url}
              onChange={(e: any) => setUrl(e.target.value)}
            />
          </InputGroup>
          <InputGroup>
            <Label>Selector CSS de Comentarios</Label>
            <Input 
              type="text" 
              placeholder=".comment-body o div.text" 
              value={selector}
              onChange={(e: any) => setSelector(e.target.value)}
            />
          </InputGroup>
          <Button onClick={handleScrape} disabled={loading || !url || !selector}>
            {loading ? "Analizando sitio..." : "Extraer Comentarios"}
          </Button>

          {status.message && (
            <StatusMessage type={status.type}>
              {status.message}
            </StatusMessage>
          )}
        </FormContainer>

        {comments.length > 0 && (
          <ResultsContainer>
            <h3>Comentarios Encontrados ({comments.length})</h3>
            <p style={{ color: 'var(--grey)' }}>Selecciona los comentarios que deseas analizar con la IA.</p>
            <CommentList>
              {comments.map((comment: any) => (
                <CommentItem key={comment.id}>
                  <Checkbox 
                    type="checkbox" 
                    checked={selectedIds.includes(comment.id)}
                    onChange={() => toggleSelection(comment.id)}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.3rem', color: 'var(--emerald)' }}>
                      {comment.author || 'Anónimo'}
                    </div>
                    <CommentText>{comment.text}</CommentText>
                  </div>
                </CommentItem>
              ))}
            </CommentList>
          </ResultsContainer>
        )}

        {selectedIds.length > 0 && (
          <ActionPanel>
            <div>
              <span style={{ fontWeight: 600 }}>{selectedIds.length} seleccionado(s)</span>
              <p style={{ fontSize: '0.8rem', color: 'var(--grey)', margin: 0 }}>Listo para procesar con Gemini Flash</p>
            </div>
            <Button onClick={handleGenerateAI} disabled={aiLoading}>
              {aiLoading ? "Generando Análisis..." : "Analizar con Gemini AI"}
            </Button>
          </ActionPanel>
        )}

        {aiResponse && (
          <ResultsContainer style={{ marginTop: '2rem', padding: '2rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '24px' }}>
            <h3 style={{ color: 'var(--emerald)' }}>Análisis de IA</h3>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {aiResponse}
            </div>
          </ResultsContainer>
        )}
      </Inner>
    </Wrapper>
  );
}
