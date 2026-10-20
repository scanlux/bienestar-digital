/**
 * Stylesheet central para el Explorador de Telemetría
 */
function getExplorerStyles() {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0b0f19; color: #f3f4f6; line-height: 1.5; padding-top: 70px; padding-bottom: 24px; padding-left: 24px; padding-right: 24px; min-height: 100vh; display: flex; flex-direction: column; justify-content: space-between; }
    .container { max-width: 1240px; margin: 0 auto; width: 100%; flex: 1; }
    .footer-quote { text-align: center; margin-top: 48px; padding-top: 24px; border-top: 1px solid #1f2937; color: #6b7280; font-size: 0.88rem; font-style: italic; }
    .footer-quote span { font-style: normal; font-weight: 600; color: #9ca3af; margin-left: 6px; }
    
    .navbar-fixed { position: fixed; top: 0; left: 0; width: 100vw; height: 56px; background: rgba(17, 24, 39, 0.95); backdrop-filter: blur(10px); border-bottom: 1px solid #1f2937; display: flex; align-items: center; padding: 0 24px; z-index: 999; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
    .nav-breadcrumbs { display: flex; align-items: center; gap: 8px; font-size: 0.88rem; color: #9ca3af; flex-wrap: nowrap; overflow-x: auto; width: 100%; scrollbar-width: none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch; }
    .nav-breadcrumbs::-webkit-scrollbar { display: none; width: 0; height: 0; }
    .nav-breadcrumbs a { color: #38bdf8; text-decoration: none; font-weight: 500; display: inline-flex; align-items: center; gap: 4px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0; }
    .nav-breadcrumbs a:hover { text-decoration: underline; }
    .nav-breadcrumbs .separator { color: #4b5563; flex-shrink: 0; }
    .nav-breadcrumbs .current { color: #f3f4f6; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0; }
    .btn-status-logout { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; text-decoration: none; transition: all 0.2s; flex-shrink: 0; margin-right: 12px; border: 1px solid transparent; cursor: pointer; }
    .btn-status-logout.offline { background: rgba(107, 114, 128, 0.15); color: #9ca3af; border-color: rgba(107, 114, 128, 0.3); }
    .btn-status-logout.offline .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #6b7280; box-shadow: 0 0 4px #6b7280; }
    .btn-status-logout.online { background: rgba(16, 185, 129, 0.15); color: #10b981; border-color: rgba(16, 185, 129, 0.3); }
    .btn-status-logout.online .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981; animation: pulseDot 2s infinite; }
    @keyframes pulseDot { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }
    .btn-status-logout:hover { opacity: 0.85; transform: translateY(-1px); }
    
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #1f2937; padding-bottom: 20px; flex-wrap: wrap; gap: 16px; margin-top: 10px; }
    .header-title { font-size: 1.5rem; font-weight: 800; color: #ffffff; display: flex; align-items: center; gap: 12px; letter-spacing: -0.025em; }
    .header-subtitle { color: #9ca3af; font-size: 0.9rem; margin-top: 4px; }
    
    .search-box { display: flex; gap: 12px; background: #111827; padding: 14px 18px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #1f2937; flex-wrap: wrap; align-items: center; }
    .search-input { background: #0b0f19; border: 1px solid #374151; color: #f3f4f6; padding: 10px 16px; border-radius: 8px; font-size: 0.92rem; flex: 1; min-width: 240px; outline: none; transition: all 0.2s; }
    .search-input:focus { border-color: #38bdf8; box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2); }

    /* Media queries responsivas globales */
    @media (max-width: 768px) {
      body { padding-top: 66px; padding-left: 12px; padding-right: 12px; padding-bottom: 20px; }
      .navbar-fixed { padding: 0 12px; }
      .btn-logout { padding: 4px 8px; font-size: 0.75rem; margin-right: 8px; }
      .nav-breadcrumbs { gap: 6px; font-size: 0.82rem; }
      .nav-breadcrumbs a, .nav-breadcrumbs .current { max-width: 110px; }
      .header { flex-direction: column; align-items: flex-start; gap: 12px; margin-bottom: 16px; padding-bottom: 14px; }
      .header-title { font-size: 1.2rem; }
      .header-subtitle { font-size: 0.82rem; }
      .search-box { padding: 10px 14px; margin-bottom: 16px; }
      .search-input { width: 100%; min-width: 100%; }

      /* Mobile Level 1 & Hubs */
      .grid-cards { grid-template-columns: 1fr; gap: 14px; }
      .card-item { padding: 16px; }
      .card-title { font-size: 1rem; }
      .card-actions { margin-top: 14px; }

      .hub-grid { grid-template-columns: 1fr; gap: 16px; margin-top: 16px; }
      .hub-card { padding: 20px; border-radius: 14px; }
      .hub-icon { font-size: 2rem; margin-bottom: 12px; }
      .hub-title { font-size: 1.15rem; }
      .hub-desc { font-size: 0.85rem; margin-bottom: 14px; }

      /* Mobile Level 3 - NLP Apps & Records */
      .nlp-controls-right { width: 100%; justify-content: space-between; }
      .view-toggle { width: 100%; display: flex; }
      .view-toggle button { flex: 1; padding: 8px 6px; font-size: 0.8rem; text-align: center; }
      .record-card { padding: 14px; border-radius: 10px; }
      .record-header { font-size: 0.8rem; gap: 8px; flex-wrap: wrap; }
      .text-box { font-size: 0.85rem; padding: 10px 12px; word-break: break-word; overflow-wrap: anywhere; }

      /* Mobile Level 4 - Files & Folders Dual View */
      .desktop-table-view { display: none !important; }
      .mobile-cards-view { display: flex !important; flex-direction: column; gap: 10px; }
      .folder-grid { grid-template-columns: 1fr !important; gap: 10px; }

      /* Mobile Level 5 - Bottom Sheet Modals */
      .modal-overlay { align-items: flex-end; padding: 0; }
      .modal-card {
        max-width: 100% !important;
        width: 100% !important;
        max-height: 85vh !important;
        border-radius: 24px 24px 0 0 !important;
        border-bottom: none !important;
        animation: bottomSheetSlideUp 0.25s ease-out !important;
      }
      .modal-header { padding: 14px 18px 12px 18px; flex-direction: column; align-items: stretch; gap: 8px; }
      .bottom-sheet-handle { display: block; }
      .modal-body { padding: 16px; max-height: calc(85vh - 65px); }
    }

    .desktop-table-view { display: block; }
    .mobile-cards-view { display: none; }
    .folder-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .folder-card { background: #151d30; border: 1px solid #1f2937; border-radius: 10px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; text-decoration: none; color: inherit; transition: all 0.2s ease; cursor: pointer; }
    .folder-card:hover { border-color: #38bdf8; transform: translateY(-2px); box-shadow: 0 4px 14px rgba(0,0,0,0.3); background: #1a233a; }
    
    .btn { background: #3b82f6; color: white; border: none; padding: 9px 18px; border-radius: 8px; cursor: pointer; font-size: 0.88rem; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; white-space: nowrap; flex-shrink: 0; }
    .btn:hover { background: #2563eb; transform: translateY(-1px); }
    .btn-secondary { background: #1f2937; color: #e5e7eb; border: 1px solid #374151; }
    .btn-secondary:hover { background: #374151; }

    .badge { background: rgba(56, 189, 248, 0.1); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); padding: 4px 12px; border-radius: 20px; font-size: 0.82rem; font-weight: 600; }
    .badge-purple { background: rgba(168, 85, 247, 0.1); color: #c084fc; border-color: rgba(168, 85, 247, 0.3); }

    .app-icon { font-size: 1.35rem; display: inline-flex; align-items: center; justify-content: center; vertical-align: middle; transform: scale(1.15); margin-right: 6px; }
    .app-icon-svg { width: 28px; height: 28px; display: inline-block; vertical-align: middle; margin-right: 8px; flex-shrink: 0; }

    /* Level 1 Grid - Devices */
    .grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px; }
    .card-item { background: #111827; border: 1px solid #1f2937; border-radius: 14px; padding: 20px; text-decoration: none; color: inherit; transition: all 0.2s ease; display: flex; flex-direction: column; justify-content: space-between; }
    .card-item:hover { border-color: #38bdf8; transform: translateY(-3px); box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); background: #151d30; }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .card-title { font-weight: 700; color: #f9fafb; font-size: 1.05rem; word-break: break-all; display: flex; align-items: center; }
    .card-meta { color: #9ca3af; font-size: 0.85rem; display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }

    /* Hubs Level 2 & 2.5 */
    .hub-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; margin-top: 24px; }
    .hub-card { background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 28px; transition: all 0.3s; display: flex; flex-direction: column; justify-content: space-between; height: 100%; }
    .hub-card:hover { border-color: #38bdf8; transform: translateY(-4px); background: #151d30; }
    .hub-card-available { border-color: #10b981; }
    .hub-card-available:hover { border-color: #34d399; }
    .hub-card-remote { border-color: #38bdf8; }
    .hub-card-remote:hover { border-color: #60a5fa; }
    .hub-icon { font-size: 2.5rem; margin-bottom: 16px; }
    .hub-title { font-size: 1.3rem; font-weight: 700; margin-bottom: 8px; }
    .hub-desc { font-size: 0.88rem; color: #9ca3af; line-height: 1.5; margin-bottom: 20px; }
    .hub-link { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.9rem; }

    /* Level 3 Records */
    .records-list { display: flex; flex-direction: column; gap: 16px; }
    .record-card { background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 18px 22px; font-size: 0.92rem; transition: border-color 0.2s; position: relative; }
    .record-card:hover { border-color: #374151; }
    .record-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #1f2937; font-size: 0.82rem; color: #9ca3af; }
    .record-content-box { display: flex; flex-direction: column; gap: 10px; }
    .record-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
    .text-box { background: #0b0f19; border: 1px solid #1f2937; padding: 12px 16px; border-radius: 8px; font-family: 'Fira Code', 'Consolas', monospace; font-size: 0.9rem; line-height: 1.6; word-break: break-word; overflow-wrap: anywhere; white-space: pre-wrap; }
    .text-box.clean { color: #34d399; }
    .text-box.raw { color: #fbbf24; }
    
    .view-toggle { display: flex; background: #0b0f19; padding: 3px; border-radius: 8px; border: 1px solid #374151; }
    .view-toggle button { background: none; border: none; color: #9ca3af; padding: 6px 14px; font-size: 0.82rem; font-weight: 600; border-radius: 6px; cursor: pointer; transition: all 0.2s; white-space: nowrap; flex: 1; text-align: center; }
    .view-toggle button.active { background: #3b82f6; color: white; }

    .copy-btn { background: #1f2937; color: #9ca3af; border: 1px solid #374151; padding: 4px 10px; border-radius: 6px; font-size: 0.78rem; cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
    .copy-btn:hover { background: #374151; color: #f3f4f6; }

    /* Modal Overlay Styles & Bottom Sheets */
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(4px); display: none; justify-content: center; align-items: center; z-index: 1000; padding: 20px; }
    .modal-overlay.active { display: flex; }
    .modal-card { background: #111827; border: 1px solid #374151; border-radius: 16px; width: 100%; max-width: 580px; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 20px 40px rgba(0,0,0,0.6); overflow: hidden; animation: modalFadeIn 0.2s ease-out; }
    @keyframes modalFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    @keyframes bottomSheetSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .bottom-sheet-handle { width: 38px; height: 4px; background: #374151; border-radius: 2px; margin: 0 auto 6px auto; display: none; }
    .modal-header { padding: 18px 22px; border-bottom: 1px solid #1f2937; display: flex; justify-content: space-between; align-items: center; background: #151d30; }
    .modal-title { font-size: 1.05rem; font-weight: 700; color: #f9fafb; display: flex; align-items: center; gap: 8px; }
    .modal-close { background: #1f2937; border: 1px solid #374151; color: #9ca3af; font-size: 1.2rem; cursor: pointer; padding: 4px 10px; border-radius: 8px; transition: all 0.2s; }
    .modal-close:hover { color: #f3f4f6; background: #374151; }
    .modal-body { padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
    .sys-event-item { background: #0b0f19; border: 1px solid #1f2937; border-radius: 10px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; font-size: 0.88rem; }
    .sys-event-time { color: #38bdf8; font-weight: 600; font-family: monospace; }
    .sys-event-badge { color: #10b981; font-weight: 600; font-size: 0.8rem; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 3px 10px; border-radius: 12px; }
  `;
}

module.exports = {
  getExplorerStyles
};
