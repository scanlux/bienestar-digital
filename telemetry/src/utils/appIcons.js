/**
 * SVG Icon Vector Catalog for Known Android Application Packages
 */
const getAppIcon = (pkg) => {
  if (!pkg || pkg === 'unknown') {
    return `<svg class="app-icon-svg" viewBox="0 0 24 24" fill="none"><path fill="#D97706" d="M3 7l9-4 9 4v10l-9 4-9-4V7z"/><path fill="#F59E0B" d="M12 3v18l9-4V7l-9-4z"/><path stroke="#78350F" stroke-width="1.5" d="M12 3l9 4-9 4-9-4 9-4zm0 4v14"/></svg>`;
  }
  const p = pkg.toLowerCase();
  
  // 1. Google Chrome
  if (p.includes('chrome')) {
    return `<svg class="app-icon-svg" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" fill="#FFF"/><path fill="#4CAF50" d="M24 4C12.95 4 4 12.95 4 24c0 1.25.12 2.47.34 3.66L15.41 16h22.93C34.75 8.76 29.75 4 24 4z"/><path fill="#FFC107" d="M43.66 20.34A19.92 19.92 0 0144 24c0 11.05-8.95 20-20 20-4.7 0-9.01-1.62-12.44-4.34L22.63 28h18.78c1.45-2.34 2.25-5.07 2.25-8z"/><path fill="#F44336" d="M4 24c0 6.63 3.23 12.5 8.22 16.14l11.07-19.17H4.34A19.8 19.8 0 014 24z"/><circle cx="24" cy="24" r="9" fill="#2196F3"/></svg>`;
  }
  
  // 2. WhatsApp
  if (p.includes('whatsapp')) {
    return `<svg class="app-icon-svg" viewBox="0 0 24 24" fill="none"><path fill="#25D366" d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.762.459 3.48 1.332 5.001L2 22l5.123-1.341c1.472.802 3.134 1.225 4.885 1.226h.004c5.507 0 9.99-4.478 9.99-9.985 0-2.667-1.039-5.176-2.926-7.062A9.924 9.924 0 0012.012 2z"/><path fill="#FFF" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z"/></svg>`;
  }
  
  // 3. Instagram
  if (p.includes('instagram')) {
    return `<svg class="app-icon-svg" viewBox="0 0 24 24" fill="none"><defs><radialGradient id="igG" cx="30%" cy="107%" r="130%"><stop offset="0%" stop-color="#fdf497"/><stop offset="5%" stop-color="#fdf497"/><stop offset="45%" stop-color="#fd5949"/><stop offset="60%" stop-color="#d6249f"/><stop offset="90%" stop-color="#285AEB"/></radialGradient></defs><rect width="20" height="20" x="2" y="2" rx="6" fill="url(#igG)"/><path fill="#FFF" d="M12 7a5 5 0 100 10 5 5 0 000-10zm0 8a3 3 0 110-6 3 3 0 010 6zm5.25-8.5a1.25 1.25 0 100 2.5 1.25 1.25 0 000-2.5z"/></svg>`;
  }
  
  // 4. Messenger
  if (p.includes('messenger') || p.includes('orca')) {
    return `<svg class="app-icon-svg" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="msG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00B2FF"/><stop offset="50%" stop-color="#006AFF"/><stop offset="100%" stop-color="#9900FF"/></linearGradient></defs><path fill="url(#msG)" d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.455 5.5 3.734 7.195V22l3.42-1.879a10.4 10.4 0 002.846.396c5.523 0 10-4.145 10-9.259C22 6.145 17.523 2 12 2z"/><path fill="#FFF" d="M6.5 13.5l3.5-3.5 2 2 4.5-4.5-3.5 3.5-2-2-4.5 4.5z"/></svg>`;
  }
  
  // 5. Facebook
  if (p.includes('facebook') || p.includes('katana')) {
    return `<svg class="app-icon-svg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#1877F2"/><path fill="#FFF" d="M14 12.5h-1.5V18h-2.5v-5.5H8.5V10h1.5V8.5C10 7.12 10.88 6 12.5 6H14v2.5h-1c-.55 0-.5.22-.5.5V10h2l-.5 2.5z"/></svg>`;
  }
  
  // 6. Telegram
  if (p.includes('telegram')) {
    return `<svg class="app-icon-svg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#24A1DE"/><path fill="#FFF" d="M17.5 7.5L4.8 12.4c-.9.36-.88.86-.16 1.08l3.24 1.01 7.52-4.74c.36-.22.68-.1.4.14l-6.1 5.5-.23 3.25c.32 0 .46-.15.64-.32l1.53-1.49 3.18 2.35c.59.32 1.01.16 1.16-.54l2.1-9.9c.21-.86-.32-1.24-.88-1.04z"/></svg>`;
  }
  
  // 7. TikTok
  if (p.includes('tiktok') || p.includes('musically') || p.includes('trill')) {
    return `<svg class="app-icon-svg" viewBox="0 0 24 24" fill="none"><rect width="20" height="20" x="2" y="2" rx="5" fill="#000"/><path fill="#25F4EE" d="M16.5 9a4.5 4.5 0 01-3.5-2V14a3.5 3.5 0 11-3.5-3.5c.2 0 .4.02.6.06V8.5A5.5 5.5 0 1015 14V9.5a6.5 6.5 0 003 1.5V9a4.5 4.5 0 01-1.5 0z"/><path fill="#FE2C55" d="M16 8.5a4.5 4.5 0 01-3-1.5V13.5a3.5 3.5 0 11-3.5-3.5c.2 0 .4.02.6.06V8.5A5.5 5.5 0 1014.5 14V9a6.5 6.5 0 003 1.5V8.5a4.5 4.5 0 01-1.5 0z"/></svg>`;
  }
  
  // 8. Mensajes / SMS
  if (p.includes('messaging') || p.includes('mms') || p.includes('sms')) {
    return `<svg class="app-icon-svg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#1A73E8"/><path fill="#FFF" d="M7 9h10v6H7V9zm2 2v2h6v-2H9z"/></svg>`;
  }
  
  // 9. YouTube
  if (p.includes('youtube')) {
    return `<svg class="app-icon-svg" viewBox="0 0 24 24" fill="none"><path fill="#FF0000" d="M21.58 7.19a2.78 2.78 0 00-1.95-1.96C17.9 4.7 12 4.7 12 4.7s-5.9 0-7.63.53c-.97.26-1.73 1.02-1.95 1.96C2 8.92 2 12 2 12s0 3.08.42 4.81c.22.94.98 1.7 1.95 1.96 1.73.53 7.63.53 7.63.53s5.9 0 7.63-.53c.97-.26 1.73-1.02 1.95-1.96.42-1.73.42-4.81.42-4.81s0-3.08-.42-4.81z"/><path fill="#FFF" d="M10 15l5-3-5-3v6z"/></svg>`;
  }
  
  // 10. AnySoftKeyboard
  if (p.includes('anysoftkeyboard') || p.includes('keyboard')) {
    return `<svg class="app-icon-svg" viewBox="0 0 24 24" fill="none"><rect width="20" height="14" x="2" y="5" rx="3" fill="#3F51B5"/><path fill="#FFF" d="M5 8h2v2H5V8zm4 0h2v2H9V8zm4 0h2v2h-2V8zm4 0h2v2h-2V8zm-12 3h2v2H5v-2zm4 0h2v2H9v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zm-10 3h8v1H7v-1z"/></svg>`;
  }
  
  // Default Fallback: Cajita 📦
  return `<svg class="app-icon-svg" viewBox="0 0 24 24" fill="none"><path fill="#D97706" d="M3 7l9-4 9 4v10l-9 4-9-4V7z"/><path fill="#F59E0B" d="M12 3v18l9-4V7l-9-4z"/><path stroke="#78350F" stroke-width="1.5" d="M12 3l9 4-9 4-9-4 9-4zm0 4v14"/></svg>`;
};

module.exports = {
  getAppIcon
};
