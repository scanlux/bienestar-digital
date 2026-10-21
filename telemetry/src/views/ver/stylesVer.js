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
      height: 100vh;
      height: 100dvh;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
      margin: 0;
    }

    .app-viewport {
      width: 100%;
      max-width: 480px;
      height: 100vh;
      height: 100dvh;
      background: #000000;
      border-left: 1px solid #1f2937;
      border-right: 1px solid #1f2937;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    /* Top Bar con Buscador */
    .top-bar {
      flex-shrink: 0;
      min-height: 54px;
      background: rgba(0, 0, 0, 0.94);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid #1f2937;
      padding: 8px 10px;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 50;
    }

    .top-search-section,
    .top-search-container {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .top-search-bar {
      flex: 1;
      min-width: 0;
      height: 38px;
      display: flex;
      align-items: center;
      gap: 6px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 999px;
      padding: 0 12px;
      transition: border-color 0.15s;
    }

    .top-search-bar:focus-within {
      border-color: #38bdf8;
    }

    .top-search-group {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-search-trigger {
      background: #2563eb;
      border: none;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      flex-shrink: 0;
      transition: transform 0.15s ease, background 0.15s ease;
      padding: 0;
    }

    .btn-search-trigger:hover {
      background: #1d4ed8;
    }

    .btn-search-trigger:active {
      transform: scale(0.9);
      background: #1e40af;
    }

    .btn-search-trigger svg {
      width: 17px;
      height: 17px;
    }

    .top-search-input {
      width: 100%;
      background: transparent;
      border: none;
      color: #f8fafc;
      font-size: 0.82rem;
      outline: none;
      padding: 2px 0;
    }

    .top-search-input::placeholder {
      color: #64748b;
      font-size: 0.78rem;
    }

    .active-date-badge {
      background: rgba(56, 189, 248, 0.16);
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: #38bdf8;
      font-size: 0.72rem;
      font-weight: 700;
      border-radius: 999px;
      padding: 2px 8px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .active-date-badge .badge-remove {
      cursor: pointer;
      font-size: 0.75rem;
      color: #94a3b8;
      padding-left: 2px;
    }

    .active-date-badge .badge-remove:hover {
      color: #f87171;
    }

    .top-date-group {
      display: flex;
      align-items: center;
      position: relative;
      flex-shrink: 0;
    }

    .top-date-hidden {
      position: absolute;
      width: 0;
      height: 0;
      opacity: 0;
      pointer-events: none;
    }

    .btn-calendar-trigger {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 50%;
      color: #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      cursor: pointer;
      flex-shrink: 0;
      transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
      padding: 0;
    }

    .btn-calendar-trigger:hover {
      color: #38bdf8;
      border-color: #475569;
    }

    .btn-calendar-trigger:active {
      transform: scale(0.9);
      background: #334155;
      color: #38bdf8;
    }

    .btn-calendar-trigger svg {
      width: 17px;
      height: 17px;
    }

    .btn-clear-search {
      background: #334155;
      border: none;
      color: #f1f5f9;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      font-size: 0.75rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .btn-top-search-submit,
    .btn-nlp-search-submit {
      background: #2563eb;
      color: #ffffff;
      border: none;
      border-radius: 999px;
      padding: 0 14px;
      height: 38px;
      font-size: 0.78rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.15s, transform 0.1s;
    }

    .btn-top-search-submit:hover,
    .btn-nlp-search-submit:hover {
      background: #1d4ed8;
    }

    .btn-top-search-submit:active,
    .btn-nlp-search-submit:active {
      transform: scale(0.92);
      background: #1e40af;
    }

    .btn-top-search-submit svg,
    .btn-nlp-search-submit svg {
      width: 14px;
      height: 14px;
    }

    .top-bar-right {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .device-chip {
      font-size: 0.7rem;
      color: #94a3b8;
      background: #0f172a;
      padding: 4px 8px;
      border-radius: 999px;
      border: 1px solid #1e293b;
      font-family: monospace;
      max-width: 70px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Contenedor Principal */
    #mainContent {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    #feedList {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      scroll-snap-type: y mandatory;
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
      display: flex;
      flex-direction: column;
    }

    #favList, #searchResultsList {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 12px 10px 24px 10px;
    }

    .search-results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 6px 8px 6px;
      border-bottom: 1px solid #1f2937;
      margin-bottom: 4px;
    }

    /* Filas Horizontales de Favoritos y Resultados de Busqueda */
    .fav-row-card, .media-row-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 14px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      transition: background 0.15s ease, transform 0.15s ease, border-color 0.15s ease;
      position: relative;
    }

    .fav-row-card:active, .media-row-card:active {
      transform: scale(0.98);
      background: #1e293b;
      border-color: #334155;
    }

    .fav-thumb-box {
      width: 76px;
      height: 76px;
      min-width: 76px;
      border-radius: 10px;
      overflow: hidden;
      background: #020617;
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      border: 1px solid #1e293b;
      flex-shrink: 0;
    }

    .fav-thumb-img, .fav-thumb-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .fav-play-badge {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      pointer-events: none;
    }

    .fav-audio-icon {
      color: #c084fc;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .fav-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .fav-title {
      font-size: 0.88rem;
      font-weight: 700;
      color: #f3f4f6;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .fav-meta-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .fav-date, .fav-size {
      font-size: 0.72rem;
      color: #9ca3af;
    }

    .fav-tags-row {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .fav-star-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
      padding: 0;
    }

    .fav-star-btn.favorited {
      background: rgba(251, 191, 36, 0.12);
      border-color: rgba(251, 191, 36, 0.35);
      color: #fbbf24;
    }

    .fav-star-btn:active {
      transform: scale(0.88);
      background: rgba(255, 255, 255, 0.15);
    }

    /* Popup Modal de Visualizacion Multimedia */
    .media-popup-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.88);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: none;
      justify-content: center;
      align-items: center;
      padding: 12px;
      z-index: 250;
    }

    .media-popup-overlay.active {
      display: flex;
    }

    .media-popup-container {
      width: 100%;
      max-width: 460px;
      max-height: 94vh;
      background: #0b0f19;
      border: 1px solid #1f2937;
      border-radius: 18px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.9);
      animation: popInModal 0.2s ease-out;
    }

    .media-popup-header {
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1f2937;
      background: #111827;
      flex-shrink: 0;
    }

    .media-popup-meta {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .media-popup-title {
      font-size: 0.88rem;
      font-weight: 700;
      color: #f3f4f6;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 320px;
    }

    .btn-close-popup {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
      font-size: 1.15rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-shrink: 0;
      transition: background 0.15s, transform 0.15s;
    }

    .btn-close-popup:active {
      transform: scale(0.9);
      background: rgba(239, 68, 68, 0.5);
    }

    .media-popup-body {
      flex: 1;
      min-height: 220px;
      max-height: 56vh;
      background: #000000;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
      overflow: hidden;
    }

    .media-popup-body video {
      width: 100%;
      height: 100%;
      max-height: 56vh;
      object-fit: contain;
      outline: none;
    }

    .media-popup-body img {
      width: 100%;
      height: 100%;
      max-height: 56vh;
      object-fit: contain;
    }

    .media-popup-footer {
      padding: 12px 16px 16px 16px;
      background: #111827;
      border-top: 1px solid #1f2937;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .media-popup-actions {
      display: flex;
      align-items: center;
      justify-content: space-around;
      gap: 8px;
    }

    .popup-action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      color: #d1d5db;
      font-size: 0.72rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: color 0.15s, transform 0.15s, background 0.15s;
      padding: 8px 12px;
      flex: 1;
      justify-content: center;
    }

    .popup-action-btn:active {
      transform: scale(0.92);
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
    }

    .popup-action-btn.btn-wa {
      color: #25d366;
      border-color: rgba(37, 211, 102, 0.35);
    }

    .popup-action-btn.btn-fav.favorited {
      color: #fbbf24;
      border-color: rgba(251, 191, 36, 0.35);
    }

    /* Post Card estilo TikTok / Reels con scroll asistido */
    .post-card {
      background: #000000;
      border-bottom: 1px solid #1f2937;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      height: 100%;
      min-height: 100%;
      max-height: 100%;
      flex-shrink: 0;
      scroll-snap-align: start;
      scroll-snap-stop: normal;
      overflow: hidden;
    }

    .post-header {
      flex-shrink: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      background: rgba(0, 0, 0, 0.45);
      z-index: 5;
    }

    .post-author {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .author-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ec4899, #8b5cf6);
      display: flex;
      justify-content: center;
      align-items: center;
      flex-shrink: 0;
    }

    .author-meta {
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .author-name {
      font-size: 0.86rem;
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

    /* Media Container Flexible */
    .post-media-container {
      flex: 1;
      min-height: 0;
      width: 100%;
      background: #050811;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
      overflow: hidden;
    }

    .post-img {
      width: 100%;
      height: 100%;
      max-height: 100%;
      object-fit: contain;
      display: block;
    }

    .post-video {
      width: 100%;
      height: 100%;
      max-height: 100%;
      object-fit: contain;
      background: #000;
      outline: none;
      cursor: pointer;
    }

    .video-sound-badge {
      position: absolute;
      bottom: 14px;
      right: 14px;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      color: #ffffff;
      z-index: 10;
      transition: transform 0.15s, background 0.15s;
    }

    .video-sound-badge:active {
      transform: scale(0.9);
      background: rgba(0, 0, 0, 0.85);
    }

    .post-audio-container {
      width: 100%;
      height: 100%;
      padding: 30px 20px;
      display: flex;
      flex-direction: column;
      justify-content: center;
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
      color: #c084fc;
    }

    .post-audio {
      width: 100%;
      max-width: 360px;
      border-radius: 8px;
    }

    /* Barra vertical flotante de acciones a la derecha del contenido */
    .post-side-actions {
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      z-index: 25;
    }

    .side-action-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.72);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      border: 1px solid rgba(255, 255, 255, 0.22);
      color: #ffffff;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      text-decoration: none;
      transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45);
      padding: 0;
    }

    .side-action-btn:active {
      transform: scale(0.88);
      background: rgba(30, 41, 59, 0.92);
    }

    .side-action-btn.favorited {
      color: #fbbf24;
      border-color: rgba(251, 191, 36, 0.65);
    }

    .side-action-btn.btn-whatsapp {
      border-color: rgba(37, 211, 102, 0.45);
    }

    /* Acciones del Post (Vista compartida) */
    .post-actions {
      flex-shrink: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 14px;
      background: rgba(0, 0, 0, 0.65);
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
      flex-shrink: 0;
      padding: 0 14px 10px 14px;
      font-size: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 4px;
      background: rgba(0, 0, 0, 0.65);
    }

    .post-filename {
      font-family: monospace;
      font-size: 0.8rem;
      color: #9ca3af;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Indicador de carga de video */
    .video-loading-box {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 15;
      pointer-events: none;
      transition: opacity 0.25s ease;
    }

    .video-spinner {
      width: 42px;
      height: 42px;
      border: 3px solid rgba(255, 255, 255, 0.15);
      border-top-color: #ec4899;
      border-right-color: #8b5cf6;
      border-radius: 50%;
      animation: spinLoader 0.75s linear infinite;
    }

    @keyframes spinLoader {
      to { transform: rotate(360deg); }
    }

    .app-source-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.72rem;
      font-weight: 700;
      color: #38bdf8;
      background: rgba(15, 23, 42, 0.82);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      border: 1px solid rgba(56, 189, 248, 0.35);
      padding: 3px 9px;
      border-radius: 999px;
      width: fit-content;
      max-width: calc(100% - 70px);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .post-media-container .app-source-badge {
      position: absolute;
      bottom: 14px;
      left: 12px;
      z-index: 20;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.75);
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

    /* Bottom Navigation Bar */
    .bottom-nav {
      position: relative;
      flex-shrink: 0;
      width: 100%;
      background: rgba(11, 15, 25, 0.96);
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
      justify-content: center;
      gap: 2px;
      font-size: 0.65rem;
      font-weight: 600;
      letter-spacing: -0.2px;
      cursor: pointer;
      flex: 1;
      padding: 4px 2px;
      transition: color 0.15s;
      white-space: nowrap;
    }

    .nav-tab.active {
      color: #38bdf8;
    }

    .nav-tab-icon {
      font-size: 1.15rem;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }

    /* Modal Tactil de Etiquetado y Catalogacion (Elevado contra teclado movil) */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: none;
      justify-content: center;
      align-items: center;
      padding: 16px;
      z-index: 200;
    }

    .modal-overlay.active {
      display: flex;
    }

    .modal-sheet {
      width: 100%;
      max-width: 440px;
      background: #111827;
      border-radius: 18px;
      border: 1px solid #374151;
      padding: 22px 18px 24px 18px;
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.85);
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-bottom: 22vh;
      animation: popInModal 0.2s ease-out;
    }

    @keyframes popInModal {
      from { opacity: 0; transform: scale(0.92); }
      to { opacity: 1; transform: scale(1); }
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

    /* Contacts View & Call Analytics Styles */
    .contacts-container {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
      padding: 14px 12px 30px 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .explore-tags-container {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
      padding: 16px 14px 30px 14px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .contacts-search-input {
      width: 100%;
      background: #0b1120;
      border: 1px solid #1e293b;
      border-radius: 10px;
      padding: 10px 14px;
      color: #ffffff;
      font-size: 0.88rem;
      outline: none;
      transition: border-color 0.15s;
    }

    .contacts-search-input:focus {
      border-color: #38bdf8;
    }

    .contacts-kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }

    .contacts-kpi-card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 10px;
      padding: 8px 4px;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .contacts-kpi-num {
      font-size: 1.05rem;
      font-weight: 800;
    }

    .contacts-kpi-label {
      font-size: 0.62rem;
      text-transform: uppercase;
      font-weight: 700;
      color: #9ca3af;
      letter-spacing: 0.2px;
    }

    .contact-row-card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 12px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }

    .contact-row-card:active {
      background: #1f2937;
      border-color: #38bdf8;
    }

    .contact-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.95rem;
      color: #ffffff;
      flex-shrink: 0;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
    }

    .contact-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .contact-name {
      font-size: 0.9rem;
      font-weight: 700;
      color: #ffffff;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .contact-sub {
      font-size: 0.76rem;
      color: #9ca3af;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .contact-calls-summary {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
      flex-shrink: 0;
    }

    .call-badge-total {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 7px;
    }

    .call-chips-row {
      display: flex;
      gap: 5px;
      font-size: 0.65rem;
      font-weight: 700;
    }

    .call-chip-in { color: #34d399; }
    .call-chip-out { color: #38bdf8; }
    .call-chip-mis { color: #f87171; }

    .call-log-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 9px 12px;
      border-radius: 8px;
      background: #111827;
      border: 1px solid #1f2937;
    }

    /* NLP Dataset View Styles (Replica Exacta de Screenshot) */
    .nlp-container {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
      padding: 14px 12px 30px 12px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .nlp-search-box {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .nlp-search-input-wrap {
      position: relative;
      width: 100%;
    }

    .nlp-search-input-wrap .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #64748b;
      display: flex;
      align-items: center;
      pointer-events: none;
    }

    .nlp-search-input {
      width: 100%;
      background: #0b1120;
      border: 1px solid #1e293b;
      border-radius: 10px;
      padding: 10px 14px 10px 38px;
      color: #ffffff;
      font-size: 0.88rem;
      outline: none;
      transition: border-color 0.15s;
    }

    .nlp-search-input:focus {
      border-color: #38bdf8;
    }

    .nlp-count-badge {
      align-self: flex-start;
      background: rgba(147, 51, 234, 0.15);
      color: #c084fc;
      border: 1px solid rgba(147, 51, 234, 0.3);
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 4px 12px;
      letter-spacing: 0.2px;
    }

    .nlp-app-card {
      background: #0e1626;
      border: 1px solid #1e293b;
      border-radius: 14px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
      transition: border-color 0.15s, transform 0.12s ease;
      cursor: pointer;
    }

    .nlp-app-card:hover {
      border-color: #38bdf8;
    }

    .nlp-app-card:active {
      transform: scale(0.985);
      border-color: #38bdf8;
    }

    .nlp-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }

    .nlp-app-title-box {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .nlp-app-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .nlp-app-icon svg {
      width: 32px;
      height: 32px;
    }

    .nlp-app-name {
      font-size: 1.05rem;
      font-weight: 800;
      color: #ffffff;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .nlp-badge-escritos {
      background: rgba(147, 51, 234, 0.15);
      color: #c084fc;
      border: 1px solid rgba(147, 51, 234, 0.3);
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 4px 10px;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .nlp-badge-coincidencias {
      background: rgba(56, 189, 248, 0.18);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.45);
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 4px 10px;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .nlp-card-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.8rem;
    }

    .nlp-pkg-text {
      color: #64748b;
      font-family: monospace;
      font-size: 0.78rem;
      word-break: break-all;
    }

    .nlp-activity-text {
      color: #94a3b8;
    }

    .nlp-activity-text strong {
      color: #ffffff;
      font-weight: 700;
    }

    .nlp-card-footer {
      display: flex;
      justify-content: flex-end;
      margin-top: 4px;
    }

    .nlp-btn-ver-registros {
      background: #2563eb;
      color: #ffffff;
      font-weight: 700;
      font-size: 0.82rem;
      padding: 7px 14px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: background 0.15s, transform 0.1s;
      pointer-events: none;
    }

    .nlp-btn-ver-registros:active {
      transform: scale(0.96);
      background: #1d4ed8;
    }

    /* NLP Records (Nivel 2) */
    .nlp-record-item {
      background: #0e1626;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .nlp-record-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .nlp-record-text-box {
      background: #070b14;
      border: 1px solid #1a2234;
      border-radius: 8px;
      padding: 10px 12px;
      color: #f1f5f9;
      font-size: 0.88rem;
      line-height: 1.45;
      word-break: break-word;
      white-space: pre-wrap;
    }

    .nlp-highlight {
      background: #fbbf24;
      color: #000000;
      font-weight: 800;
      padding: 1px 4px;
      border-radius: 4px;
    }

    .nlp-matched-record {
      border-color: #38bdf8 !important;
      box-shadow: 0 0 16px rgba(56, 189, 248, 0.4) !important;
      background: #0f1c34 !important;
      transition: border-color 0.3s, box-shadow 0.3s;
    }
  `;
}

module.exports = {
  getVerStyles
};
