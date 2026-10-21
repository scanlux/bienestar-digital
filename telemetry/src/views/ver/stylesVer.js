/**
 * Estilos CSS para el Módulo Multimedia tipo Instagram (/expl/ver)
 */
function getVerStyles() {
  return `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }

    body {
      background: #000000;
      color: #f3f4f6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      overflow-x: hidden;
    }

    .app-viewport {
      width: 100%;
      max-width: 480px;
      min-height: 100vh;
      background: #000000;
      border-left: 1px solid #1f2937;
      border-right: 1px solid #1f2937;
      display: flex;
      flex-direction: column;
      position: relative;
      padding-bottom: 74px; /* espacio para la barra de navegación inferior */
    }

    /* Top Bar */
    .top-bar {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(0, 0, 0, 0.88);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid #1f2937;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .brand-title {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.5px;
      background: linear-gradient(90deg, #ec4899, #8b5cf6, #3b82f6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .device-chip {
      font-size: 0.75rem;
      color: #9ca3af;
      background: #111827;
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid #1f2937;
      font-family: monospace;
      max-width: 160px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Post Card estilo Instagram */
    .post-card {
      background: #000000;
      border-bottom: 1px solid #1f2937;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .post-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 14px;
    }

    .post-author {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .author-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ec4899, #8b5cf6);
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 1.1rem;
      flex-shrink: 0;
    }

    .author-meta {
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .author-name {
      font-size: 0.88rem;
      font-weight: 700;
      color: #ffffff;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .post-date {
      font-size: 0.72rem;
      color: #9ca3af;
    }

    /* Media Container */
    .post-media-container {
      width: 100%;
      min-height: 280px;
      max-height: 520px;
      background: #0a0e17;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
      overflow: hidden;
    }

    .post-img {
      width: 100%;
      height: 100%;
      max-height: 520px;
      object-fit: contain;
      display: block;
    }

    .post-video {
      width: 100%;
      max-height: 520px;
      background: #000;
      outline: none;
    }

    .post-audio-container {
      width: 100%;
      padding: 30px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      background: linear-gradient(180deg, #111827 0%, #0b0f19 100%);
    }

    .audio-icon-box {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: rgba(139, 92, 246, 0.2);
      border: 1px solid rgba(139, 92, 246, 0.4);
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 2.2rem;
    }

    .post-audio {
      width: 100%;
      border-radius: 8px;
    }

    /* Acciones del Post */
    .post-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
    }

    .action-group-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .btn-action {
      background: transparent;
      border: none;
      color: #f3f4f6;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
      transition: transform 0.15s, color 0.15s;
      padding: 4px;
    }

    .btn-action:active {
      transform: scale(0.85);
    }

    .btn-star.favorited {
      color: #fbbf24;
      text-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
    }

    .btn-whatsapp {
      color: #25d366;
    }

    /* Detalles y Tags */
    .post-details {
      padding: 0 14px 14px 14px;
      font-size: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .post-filename {
      font-family: monospace;
      font-size: 0.8rem;
      color: #9ca3af;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .post-tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 2px;
    }

    .tag-badge {
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: #38bdf8;
      font-size: 0.72rem;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 600;
    }

    .post-notes {
      font-size: 0.82rem;
      color: #e5e7eb;
      line-height: 1.4;
      background: #0b0f19;
      padding: 6px 10px;
      border-radius: 8px;
      border-left: 3px solid #8b5cf6;
    }

    /* Bottom Navigation Bar Fija */
    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      max-width: 480px;
      background: rgba(0, 0, 0, 0.94);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border-top: 1px solid #1f2937;
      display: flex;
      justify-content: space-around;
      align-items: center;
      height: 56px;
      z-index: 100;
    }

    .nav-tab {
      background: transparent;
      border: none;
      color: #9ca3af;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      font-size: 0.7rem;
      font-weight: 600;
      cursor: pointer;
      flex: 1;
      padding: 6px 0;
      transition: color 0.15s;
    }

    .nav-tab.active {
      color: #38bdf8;
    }

    .nav-tab-icon {
      font-size: 1.25rem;
    }

    /* Modal Táctil de Etiquetado y Catalogación */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(6px);
      display: none;
      justify-content: center;
      align-items: flex-end;
      z-index: 200;
    }

    .modal-overlay.active {
      display: flex;
    }

    .modal-sheet {
      width: 100%;
      max-width: 480px;
      background: #111827;
      border-top-left-radius: 20px;
      border-top-right-radius: 20px;
      border: 1px solid #374151;
      border-bottom: none;
      padding: 20px 18px 28px 18px;
      box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.8);
      display: flex;
      flex-direction: column;
      gap: 14px;
      animation: slideUp 0.25s ease-out;
    }

    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    .sheet-handle {
      width: 42px;
      height: 4px;
      background: #4b5563;
      border-radius: 999px;
      align-self: center;
      margin-bottom: 4px;
    }

    /* Toast Notification */
    .toast {
      position: fixed;
      bottom: 70px;
      left: 50%;
      transform: translateX(-50%);
      background: #1f2937;
      border: 1px solid #374151;
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 600;
      display: none;
      z-index: 300;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
    }

    .toast.show {
      display: block;
      animation: fadeInOut 2.5s ease;
    }

    @keyframes fadeInOut {
      0% { opacity: 0; transform: translate(-50%, 10px); }
      15% { opacity: 1; transform: translate(-50%, 0); }
      85% { opacity: 1; transform: translate(-50%, 0); }
      100% { opacity: 0; transform: translate(-50%, -10px); }
    }
  `;
}

module.exports = {
  getVerStyles
};
