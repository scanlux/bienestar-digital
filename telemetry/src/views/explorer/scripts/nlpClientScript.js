/**
 * Script de cliente para Registros Conversacionales de Teclado NLP
 */
function getNlpClientScript({ items = [] }) {
  return `
    const rawItems = ${JSON.stringify(items)};
    let currentMode = 'both';

    function reconstruirTextoLimpio(fragmentos) {
      if (!fragmentos || fragmentos.length === 0) return '';
      const textos = fragmentos.map(f => {
        let raw = f.textoL || f.texto || f.textoC || '';
        return raw.replace(/.\\u0332/g, '').replace(/⌫/g, '').trim();
      }).filter(Boolean);

      if (textos.length === 0) return '';
      let resultado = textos[0];
      for (let i = 1; i < textos.length; i++) {
        const actual = textos[i];
        if (!actual || resultado.endsWith(actual)) continue;
        let overlapIndex = 0;
        const minLen = Math.min(resultado.length, actual.length);
        for (let len = minLen; len > 0; len--) {
          if (resultado.endsWith(actual.substring(0, len))) {
            overlapIndex = len;
            break;
          }
        }
        if (overlapIndex > 0) {
          resultado += actual.substring(overlapIndex);
        } else {
          resultado += ' ' + actual;
        }
      }
      return resultado.replace(/\\s+/g, ' ').trim();
    }

    function agruparMensajes(muestras, umbralTiempoMs = 60000) {
      if (!muestras || muestras.length === 0) return [];
      const ordenadas = [...muestras].sort((a, b) => {
        const tA = a.ts_inicio || a.ts || (a.created_at ? new Date(a.created_at).getTime() : 0);
        const tB = b.ts_inicio || b.ts || (b.created_at ? new Date(b.created_at).getTime() : 0);
        return tA - tB;
      });

      const bloques = [];
      let bloqueActual = null;

      for (const muestra of ordenadas) {
        const tsMuestra = muestra.ts_inicio || muestra.ts || (muestra.created_at ? new Date(muestra.created_at).getTime() : Date.now());
        const tsFinMuestra = muestra.ts_fin || muestra.ts || tsMuestra;

        if (!bloqueActual) {
          bloqueActual = {
            sessionId: muestra.session_id || null,
            appContexto: muestra.app_contexto || 'unknown',
            tsInicio: tsMuestra,
            tsFin: tsFinMuestra,
            fragmentos: [muestra]
          };
          continue;
        }

        const mismaSesion = muestra.session_id && bloqueActual.sessionId && muestra.session_id === bloqueActual.sessionId;
        const mismaApp = (muestra.app_contexto || 'unknown') === bloqueActual.appContexto;
        const diff = Math.abs(tsMuestra - bloqueActual.tsFin);
        const cercano = mismaApp && diff <= umbralTiempoMs;

        if (mismaSesion || cercano) {
          bloqueActual.fragmentos.push(muestra);
          bloqueActual.tsFin = Math.max(bloqueActual.tsFin, tsFinMuestra);
          if (!bloqueActual.sessionId && muestra.session_id) {
            bloqueActual.sessionId = muestra.session_id;
          }
        } else {
          bloques.push(finalizarBloque(bloqueActual));
          bloqueActual = {
            sessionId: muestra.session_id || null,
            appContexto: muestra.app_contexto || 'unknown',
            tsInicio: tsMuestra,
            tsFin: tsFinMuestra,
            fragmentos: [muestra]
          };
        }
      }
      if (bloqueActual) {
        bloques.push(finalizarBloque(bloqueActual));
      }
      return bloques.reverse();
    }

    function finalizarBloque(bloque) {
      const textoLimpio = reconstruirTextoLimpio(bloque.fragmentos);
      const textoCrudoCompleto = bloque.fragmentos.map(f => f.textoC || f.texto || '').join(' ');
      return {
        sessionId: bloque.sessionId,
        appContexto: bloque.appContexto,
        tsInicio: bloque.tsInicio,
        tsFin: bloque.tsFin,
        duracionSegundos: Math.round(Math.max(0, bloque.tsFin - bloque.tsInicio) / 1000),
        textoLimpio: textoLimpio,
        textoCrudo: textoCrudoCompleto,
        totalFragmentos: bloque.fragmentos.length,
        fragmentos: bloque.fragmentos
      };
    }

    function formatCompactRecordDate(ts) {
      if (!ts) return 'Reciente';
      const d = new Date(ts);
      if (isNaN(d.getTime())) return 'Reciente';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return day + '/' + month + '/' + year + ' ' + hours + ':' + mins;
    }

    const bloquesAgrupados = agruparMensajes(rawItems);
    const searchInput = document.getElementById('searchInput');
    const recordsList = document.getElementById('recordsList');
    const countBadge = document.getElementById('countBadge');

    function renderRecords() {
      const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
      const filtered = bloquesAgrupados.filter(b => {
        if (!query) return true;
        return b.textoLimpio.toLowerCase().includes(query) || b.textoCrudo.toLowerCase().includes(query);
      });

      if (countBadge) countBadge.textContent = 'Mensajes Conversacionales: ' + filtered.length;
      if (!recordsList) return;
      recordsList.innerHTML = '';

      if (filtered.length === 0) {
        recordsList.innerHTML = '<div style="color:#9ca3af; padding:40px; text-align:center; background:#111827; border-radius:12px; border:1px solid #1f2937;">No se encontraron escritos que coincidan con la búsqueda.</div>';
        return;
      }

      filtered.forEach(bloque => {
        const card = document.createElement('div');
        card.className = 'record-card';
        
        const textClean = bloque.textoLimpio || 'Sin texto registrado';
        const dateStartStr = formatCompactRecordDate(bloque.tsInicio);
        const dateEndStr = formatCompactRecordDate(bloque.tsFin);
        const timeDisplay = dateStartStr === dateEndStr ? dateStartStr : (dateStartStr + ' - ' + dateEndStr + ' (' + bloque.duracionSegundos + 's)');

        let contentHtml = '<div class="record-content-box">';
        if (currentMode === 'both' || currentMode === 'clean') {
          contentHtml += '<div>' +
            '<div class="record-label" style="display:flex; justify-content:space-between; align-items:center;">' +
              '<span>✨ Texto Limpio (Conversación Unificada):</span>' +
              '<span class="badge badge-purple" style="font-size:0.75rem;">' + bloque.totalFragmentos + ' fragmento(s)</span>' +
            '</div>' +
            '<div class="text-box clean">' + escapeHtml(textClean) + '</div>' +
          '</div>';
        }
        if (currentMode === 'both' || currentMode === 'raw') {
          const fragmentosListHtml = bloque.fragmentos.map((f, i) => {
            const fClean = f.textoL || f.texto || '';
            const fRaw = f.textoC || f.texto || '';
            const fEvento = f.tipo_evento ? ('[' + f.tipo_evento + ']') : '';
            return '<div style="margin-top:6px; padding:6px 10px; background:#0b0f19; border-radius:6px; border:1px solid #1f2937; font-size:0.82rem;">' +
              '<div style="color:#9ca3af; font-size:0.75rem; display:flex; justify-content:space-between;">' +
                '<span>#' + (i + 1) + ' ' + fEvento + '</span>' +
                '<span>' + formatCompactRecordDate(f.ts_fin || f.ts || f.created_at) + '</span>' +
              '</div>' +
              '<div style="color:#38bdf8;">' + escapeHtml(fClean) + '</div>' +
              '<div style="color:#f59e0b; font-family:monospace; font-size:0.78rem;">' + escapeHtml(fRaw) + '</div>' +
            '</div>';
          }).join('');

          contentHtml += '<div>' +
            '<div class="record-label">📜 Historial Crudo & Fragmentos (' + bloque.totalFragmentos + '):</div>' +
            '<div class="text-box raw">' + fragmentosListHtml + '</div>' +
          '</div>';
        }
        contentHtml += '</div>';

        card.innerHTML = '<div class="record-header">' +
            '<span>⏰ ' + timeDisplay + '</span>' +
            '<button type="button" class="copy-btn" onclick="copyText(\\'' + escapeHtml(textClean).replace(/'/g, "\\\\'") + '\\')">📋 Copiar</button>' +
          '</div>' +
          contentHtml;

        recordsList.appendChild(card);
      });
    }

    function escapeHtml(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function copyText(txt) {
      navigator.clipboard.writeText(txt);
      alert('Texto copiado al portapapeles');
    }

    const btnBoth = document.getElementById('toggleBoth');
    const btnClean = document.getElementById('toggleClean');
    const btnRaw = document.getElementById('toggleRaw');

    if (btnBoth) btnBoth.addEventListener('click', (e) => { setMode('both', e.target); });
    if (btnClean) btnClean.addEventListener('click', (e) => { setMode('clean', e.target); });
    if (btnRaw) btnRaw.addEventListener('click', (e) => { setMode('raw', e.target); });

    function setMode(mode, btn) {
      currentMode = mode;
      document.querySelectorAll('.view-toggle button').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      renderRecords();
    }

    if (searchInput) searchInput.addEventListener('input', renderRecords);
    renderRecords();
  `;
}

function getNlpAppsClientScript() {
  return `
    const searchInput = document.getElementById('searchInput');
    const cardsGrid = document.getElementById('cardsGrid');
    const countBadge = document.getElementById('countBadge');

    if (searchInput && cardsGrid) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const cards = cardsGrid.querySelectorAll('.card-item');
        let visibleCount = 0;
        cards.forEach(card => {
          const match = (card.getAttribute('data-search') || '').includes(query);
          card.style.display = match ? 'flex' : 'none';
          if (match) visibleCount++;
        });
        if (countBadge) countBadge.textContent = 'Resultados: ' + visibleCount;
      });
    }
  `;
}

module.exports = {
  getNlpClientScript,
  getNlpAppsClientScript
};
