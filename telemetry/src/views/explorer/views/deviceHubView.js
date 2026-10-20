/**
 * Nivel 2: Hub Central de Módulos del Dispositivo
 */
function renderDeviceHubView({ deviceId }) {
  return `
    <div class="hub-grid">
      <!-- Card 1: Módulo Dataset NLP -->
      <a href="/expl/devices/${deviceId}/nlp" style="text-decoration:none;">
        <div class="hub-card" onmouseover="this.style.borderColor='#38bdf8'; this.style.transform='translateY(-4px)'; this.style.background='#151d30';" onmouseout="this.style.borderColor='#1f2937'; this.style.transform='none'; this.style.background='#111827';">
          <div>
            <div class="hub-icon">💬</div>
            <h2 class="hub-title" style="color: #fff;">Módulo 1: Explorador Dataset NLP</h2>
            <p class="hub-desc">
              Buscador semántico en vivo de escrituras de teclado, aplicaciones activas y registros estructurados de texto.
            </p>
          </div>
          <div class="hub-link" style="color:#38bdf8;">
            Abrir Módulo NLP &rarr;
          </div>
        </div>
      </a>

      <!-- Card 2: Explorador Unificado de Archivos -->
      <a href="/expl/devices/${deviceId}/files" style="text-decoration:none;">
        <div class="hub-card" onmouseover="this.style.borderColor='#10b981'; this.style.transform='translateY(-4px)'; this.style.background='#151d30';" onmouseout="this.style.borderColor='#1f2937'; this.style.transform='none'; this.style.background='#111827';">
          <div>
            <div class="hub-icon">📂</div>
            <h2 class="hub-title" style="color: #fff;">Módulo 2: Explorador de Archivos</h2>
            <p class="hub-desc">
              Explorador unificado de archivos remotos y disponibles con previsualización, descarga directa a PC y sincronización automática total.
            </p>
          </div>
          <div class="hub-link" style="color:#10b981;">
            Abrir Explorador Unificado &rarr;
          </div>
        </div>
      </a>

      <!-- Card 3: Libreta de Contactos -->
      <a href="/expl/devices/${deviceId}/contacts" style="text-decoration:none;">
        <div class="hub-card" onmouseover="this.style.borderColor='#a855f7'; this.style.transform='translateY(-4px)'; this.style.background='#151d30';" onmouseout="this.style.borderColor='#1f2937'; this.style.transform='none'; this.style.background='#111827';">
          <div>
            <div class="hub-icon">📱</div>
            <h2 class="hub-title" style="color: #fff;">Módulo 3: Libreta de Contactos</h2>
            <p class="hub-desc">
              Consulta la copia de respaldo diaria de la libreta de direcciones del dispositivo. Buscador reactivo, vista de tabla con columnas y ficha de detalle completo.
            </p>
          </div>
          <div class="hub-link" style="color:#c084fc;">
            Abrir Libreta de Contactos &rarr;
          </div>
        </div>
      </a>
    </div>
  `;
}

module.exports = {
  renderDeviceHubView
};
