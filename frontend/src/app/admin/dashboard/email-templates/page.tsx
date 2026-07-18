'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthHeaders } from '@/utils/auth';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { API_URL } from '@/constants';
import { LoadingState, Spinner } from '../AdminDashboardStyles';

interface EmailTemplate {
  id: number;
  name: string;
  label: string;
  category: string;
  subject: string;
  html_body: string;
  variables: Array<{ key: string; desc: string }> | null;
  is_system: number;
  updated_at: string;
}

const CATEGORIES: Record<string, { label: string; icon: string }> = {
  affiliations: { label: 'Afiliaciones', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  support: { label: 'Soporte', icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z' },
  alerts: { label: 'Alertas del Sistema', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  reports: { label: 'Informes', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  system: { label: 'Sistema', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  general: { label: 'General', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' }
};

const S = {
  page: { display: 'flex', gap: '20px', flex: 1, minHeight: 0 } as React.CSSProperties,
  editorWrap: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' as const, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px' },
  toolbar: { padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' as const },
  toggleGroup: { display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '3px', gap: '2px' },
  subjectBar: { padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px' },
  codeArea: { width: '100%', minHeight: '300px', background: 'rgba(0,0,0,0.2)', color: '#a5f3fc', border: 'none', outline: 'none', padding: '20px', fontFamily: "'JetBrains Mono','Cascadia Code',monospace", fontSize: '0.78rem', lineHeight: 1.6, resize: 'vertical' as const, overflow: 'hidden', boxSizing: 'border-box' as const },
  previewFrame: { width: '100%', border: 'none', background: '#fff', display: 'block' } as React.CSSProperties,
  varsBar: { padding: '10px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const },
  navPanel: { width: '260px', flexShrink: 0, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column' as const },
  navHeader: { padding: '16px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  navScroll: { flex: 1, overflowY: 'auto' as const, padding: '8px 0' },
  catBtn: { width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: '0.7rem', fontWeight: 800 as const, textTransform: 'uppercase' as const, letterSpacing: '0.07em', cursor: 'pointer', textAlign: 'left' as const },
  emptyEditor: { flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'rgba(255,255,255,0.25)' },
  modalBackdrop: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalCard: { background: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '28px', width: '440px' },
  formInput: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff', padding: '10px 14px', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const },
  formLabel: { fontSize: '0.72rem', fontWeight: 700 as const, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', display: 'block', marginBottom: '6px' }
};

function toggleBtn(active: boolean): React.CSSProperties {
  return { padding: '5px 14px', borderRadius: '8px', border: 'none', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: active ? 'rgba(99,102,241,0.25)' : 'transparent', color: active ? '#a5b4fc' : 'rgba(255,255,255,0.4)' };
}

function tplItemStyle(active: boolean): React.CSSProperties {
  return { width: '100%', padding: '7px 18px 7px 34px', background: active ? 'rgba(99,102,241,0.12)' : 'none', border: 'none', borderLeft: `2px solid ${active ? '#6366f1' : 'transparent'}`, color: active ? '#a5b4fc' : 'rgba(255,255,255,0.55)', fontSize: '0.82rem', fontWeight: active ? 700 : 400, cursor: 'pointer', textAlign: 'left' };
}

export default function EmailTemplatesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const [editSubject, setEditSubject] = useState('');
  const [editHtml, setEditHtml] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({
    affiliations: true, support: true, alerts: true, reports: true, system: true, general: true
  });
  const [showModal, setShowModal] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', label: '', category: 'affiliations', subject: '' });
  const [creating, setCreating] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const codeRef = useRef<HTMLTextAreaElement>(null);

  const resizeIframe = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc?.body) {
        iframe.style.height = doc.body.scrollHeight + 40 + 'px';
      }
    } catch { /* sandbox */ }
  }, []);

  const resizeTextarea = useCallback(() => {
    const ta = codeRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.max(300, ta.scrollHeight) + 'px';
  }, []);

  const parseVars = (raw: any): Array<{ key: string; desc: string }> => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
    }
    return [];
  };

  const hasAccess = user?.permissions?.includes('manage_email_templates');

  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ['emailTemplates'],
    queryFn: async ({ signal }) => {
      const res = await axios.get(`${API_URL}/api/manage/email-templates`, { headers: getAuthHeaders(), signal });
      return res.data;
    },
    enabled: !authLoading && !!user && !!hasAccess
  });

  const { data: selectedTemplate } = useQuery<EmailTemplate>({
    queryKey: ['emailTemplate', selectedName],
    queryFn: async ({ signal }) => {
      const res = await axios.get(`${API_URL}/api/manage/email-templates/${selectedName}`, { headers: getAuthHeaders(), signal });
      return res.data;
    },
    enabled: !!selectedName
  });

  useEffect(() => {
    if (selectedTemplate) {
      setEditSubject(selectedTemplate.subject);
      setEditHtml(selectedTemplate.html_body);
      setIsDirty(false);
      setViewMode('code');
      setTimeout(resizeTextarea, 50);
    }
  }, [selectedTemplate, resizeTextarea]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await axios.put(
        `${API_URL}/api/manage/email-templates/${selectedName}`,
        { subject: editSubject, html_body: editHtml },
        { headers: getAuthHeaders() }
      );
    },
    onSuccess: () => {
      toast.success('Plantilla guardada correctamente.');
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['emailTemplate', selectedName] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Error al guardar la plantilla.');
    }
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.name || !newForm.label || !newForm.subject) {
      toast.error('Completa todos los campos requeridos.');
      return;
    }
    setCreating(true);
    try {
      const slug = newForm.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const parts = [
        '<div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 40px;">',
        '<div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden;">',
        '<div style="background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 30px; text-align: center; color: #fff;">',
        '<h1 style="margin:0; font-size:24px;">' + newForm.label + '</h1>',
        '</div><div style="padding: 40px;"><p>Hola,</p><p>Contenido de la plantilla...</p></div>',
        '<div style="background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">',
        'Copyright {{year}} Bienestar Digital S.A.S.</div></div></div>'
      ];
      await axios.post(
        `${API_URL}/api/manage/email-templates`,
        { ...newForm, name: slug, html_body: parts.join(''), variables: [] },
        { headers: getAuthHeaders() }
      );
      toast.success('Plantilla creada correctamente.');
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
      setShowModal(false);
      setNewForm({ name: '', label: '', category: 'affiliations', subject: '' });
      setTimeout(() => setSelectedName(slug), 500);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al crear la plantilla.');
    } finally {
      setCreating(false);
    }
  };

  const buildPreview = useCallback(() => {
    const samples: Record<string, string> = {
      razon_social: 'Empresa Ejemplo S.A.S.',
      registro_url: 'https://trendy.sytes.net/registro-solicitud',
      year: new Date().getFullYear().toString()
    };
    let html = editHtml;
    Object.entries(samples).forEach(([k, v]) => {
      html = html.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
    });
    return html;
  }, [editHtml]);

  const grouped = templates.reduce((acc, t) => {
    const cat = t.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {} as Record<string, EmailTemplate[]>);

  const allCats = Array.from(new Set([...Object.keys(CATEGORIES), ...Object.keys(grouped)]));

  if (authLoading || isLoading) {
    return <LoadingState><Spinner /> Cargando plantillas...</LoadingState>;
  }

  if (!hasAccess) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', border: '1px solid rgba(255,0,0,0.1)', borderRadius: '12px' }}>
        <h2 style={{ color: '#ef4444' }}>Acceso Denegado</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>No posees el permiso manage_email_templates requerido.</p>
      </div>
    );
  }

  return (
    <>
      <div style={S.page}>
        {/* LEFT: Editor */}
        <div style={S.editorWrap}>
          <div style={S.toolbar}>
            <div style={{ flex: 1 }}>
              {selectedTemplate ? (
                <>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{selectedTemplate.label}</div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                    {CATEGORIES[selectedTemplate.category]?.label || selectedTemplate.category}
                    {' · Ultima edicion: '}
                    {new Date(selectedTemplate.updated_at).toLocaleString('es-CO')}
                    {selectedTemplate.is_system ? ' · Sistema' : ''}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.3)' }}>Selecciona una plantilla del panel derecho</div>
              )}
            </div>
            <div style={S.toggleGroup}>
              <button onClick={() => setViewMode('code')} style={toggleBtn(viewMode === 'code')}>Codigo</button>
              <button onClick={() => setViewMode('preview')} disabled={!selectedTemplate} style={toggleBtn(viewMode === 'preview')}>Vista Previa</button>
            </div>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={!isDirty || saveMutation.isPending}
              style={{ padding: '7px 18px', background: 'rgba(72,214,76,0.15)', color: '#48d64c', border: '1px solid rgba(72,214,76,0.3)', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700, cursor: isDirty ? 'pointer' : 'default', opacity: !isDirty ? 0.5 : 1 }}
            >
              {saveMutation.isPending ? 'Guardando...' : isDirty ? 'Guardar Cambios' : 'Sin Cambios'}
            </button>
          </div>

          {selectedTemplate ? (
            <>
              <div style={S.subjectBar}>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>Asunto</label>
                <input
                  type="text"
                  value={editSubject}
                  placeholder="Asunto del correo..."
                  onChange={(e) => { setEditSubject(e.target.value); setIsDirty(true); }}
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.9)', fontSize: '0.875rem', fontWeight: 600, fontFamily: 'inherit' }}
                />
              </div>
              {viewMode === 'code' ? (
                <textarea
                  ref={codeRef}
                  value={editHtml}
                  onChange={(e) => { setEditHtml(e.target.value); setIsDirty(true); setTimeout(resizeTextarea, 0); }}
                  onFocus={resizeTextarea}
                  spellCheck={false}
                  style={S.codeArea}
                />
              ) : (
                <iframe ref={iframeRef} srcDoc={buildPreview()} title="Vista previa de la plantilla" sandbox="allow-same-origin" onLoad={resizeIframe} style={S.previewFrame} />
              )}
              {parseVars(selectedTemplate.variables).length > 0 && (
                <div style={S.varsBar}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.25)', marginRight: '4px' }}>Variables</span>
                  {parseVars(selectedTemplate.variables).map((v) => (
                    <button
                      key={v.key}
                      title={v.desc}
                      onClick={() => {
                        setEditHtml(prev => prev + `{{${v.key}}}`);
                        setIsDirty(true);
                        toast.success(`Variable {{${v.key}}} insertada al final del codigo.`);
                      }}
                      style={{ background: 'rgba(99,102,241,0.08)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '6px', padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'monospace' }}
                    >
                      {`{{${v.key}}}`}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={S.emptyEditor}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.3}>
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Selecciona una plantilla del panel derecho para editarla</p>
            </div>
          )}
        </div>

        {/* RIGHT: Navigator */}
        <div style={S.navPanel}>
          <div style={S.navHeader}>
            <h3 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)' }}>Plantillas</h3>
            <button onClick={() => setShowModal(true)} style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', padding: '5px 10px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
              + Nueva
            </button>
          </div>
          <div style={S.navScroll}>
            {allCats.map((cat) => {
              const catItems = grouped[cat] || [];
              const cfg = CATEGORIES[cat] || CATEGORIES.general;
              const isOpen = openCats[cat] !== false;
              return (
                <div key={cat} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <button onClick={() => setOpenCats(prev => ({ ...prev, [cat]: !prev[cat] }))} style={S.catBtn}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d={cfg.icon} />
                    </svg>
                    {cfg.label}
                    <span style={{ marginLeft: 'auto', fontSize: '0.6rem', opacity: 0.5, display: 'inline-block', transition: 'transform 0.25s', transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                      &#9660;
                    </span>
                  </button>
                  {isOpen && (
                    catItems.length === 0
                      ? <p style={{ padding: '3px 18px 4px 34px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', margin: 0, fontStyle: 'italic' }}>Sin plantillas</p>
                      : catItems.map((t) => (
                        <button key={t.name} onClick={() => setSelectedName(t.name)} style={tplItemStyle(selectedName === t.name)}>
                          {t.label}
                        </button>
                      ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showModal && (
        <div onClick={() => setShowModal(false)} style={S.modalBackdrop}>
          <div onClick={(e) => e.stopPropagation()} style={S.modalCard}>
            <h2 style={{ margin: '0 0 20px', fontSize: '1.1rem', fontWeight: 700 }}>Nueva Plantilla</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={S.formLabel}>Nombre (slug)</label>
                <input type="text" placeholder="ej: support_ticket" value={newForm.name} onChange={(e) => setNewForm(p => ({ ...p, name: e.target.value }))} required style={S.formInput} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={S.formLabel}>Etiqueta visible</label>
                <input type="text" placeholder="ej: Ticket de Soporte" value={newForm.label} onChange={(e) => setNewForm(p => ({ ...p, label: e.target.value }))} required style={S.formInput} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={S.formLabel}>Asunto del correo</label>
                <input type="text" placeholder="Asunto del correo electronico" value={newForm.subject} onChange={(e) => setNewForm(p => ({ ...p, subject: e.target.value }))} required style={S.formInput} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={S.formLabel}>Categoria</label>
                <select value={newForm.category} onChange={(e) => setNewForm(p => ({ ...p, category: e.target.value }))} style={S.formInput}>
                  {Object.entries(CATEGORIES).map(([k, v]) => (
                    <option key={k} value={k} style={{ background: '#0f1117' }}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={creating} style={{ padding: '8px 20px', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '10px', color: '#a5b4fc', fontSize: '0.875rem', fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.5 : 1 }}>
                  {creating ? 'Creando...' : 'Crear Plantilla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
