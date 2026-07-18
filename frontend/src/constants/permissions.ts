export const PERMISSIONS = {
  // Seguridad (6)
  VIEW_SECURITY_LOGS: 'view_security_logs',
  MANAGE_RBAC: 'manage_rbac',
  CREATE_SYSTEM_USER: 'create_system_user',
  VIEW_MAINTENANCE_STATUS: 'view_maintenance_status',
  MANAGE_MAINTENANCE: 'manage_maintenance',
  VIEW_SYSTEM_LOGS: 'view_system_logs',

  // Afiliaciones (2)
  MANAGE_REGISTRATION_REQUESTS: 'manage_registration_requests',
  MANAGE_EMAIL_TEMPLATES: 'manage_email_templates',

  // Catálogo Maestro (11)
  VIEW_COMMERCES: 'view_commerces',
  CREATE_COMMERCE: 'create_commerce',
  EDIT_COMMERCE: 'edit_commerce',
  VIEW_STORES: 'view_stores',
  CREATE_STORE: 'create_store',
  EDIT_STORE_BASIC: 'edit_store_basic',
  EDIT_STORE_ADVANCED: 'edit_store_advanced',
  VIEW_CATALOG: 'view_catalog',
  ENABLE_STORE_CATALOG: 'enable_store_catalog',
  WRITE_CATALOG: 'write_catalog',
  DELETE_CATALOG: 'delete_catalog',

  // Operaciones (5)
  VIEW_ORDERS: 'view_orders',
  MANAGE_ORDERS: 'manage_orders',
  VIEW_STORE_ADMINS: 'view_store_admins',
  MANAGE_STORE_ADMINS: 'manage_store_admins',
  MANAGE_ORDER_ACCEPTANCE: 'manage_order_acceptance',

  // Videos/Reels (2)
  UPLOAD_VIDEOS: 'upload_videos',
  DELETE_VIDEOS: 'delete_videos',

  // Planes (3)
  MANAGE_UPGRADES_CATALOG: 'manage_upgrades_catalog',
  VIEW_UPGRADES_MARKET: 'view_upgrades_market',
  PURCHASE_UPGRADES: 'purchase_upgrades',

  // Inteligencia (2)
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_INTELLIGENCE: 'manage_intelligence',

  // Finanzas DOMI (15)
  VIEW_LEDGER: 'view_ledger',
  PURCHASE_DOMIS: 'purchase_domis',
  CHECKOUT_DOMIS: 'checkout_domis',
  SPEND_DOMIS: 'spend_domis',
  WITHDRAW_DOMIS: 'withdraw_domis',
  TRANSFER_DOMIS: 'transfer_domis',
  PAY_SUBSCRIPTIONS_DOMIS: 'pay_subscriptions_domis',
  MINT_MANUAL_DOMIS: 'mint_manual_domis',
  BURN_MANUAL_DOMIS: 'burn_manual_domis',
  VIEW_CASH_VAULT: 'view_cash_vault',
  MANAGE_CASH_VAULT: 'manage_cash_vault',
  REGISTER_BANK_DEPOSIT: 'register_bank_deposit',
  RECONCILE_BANK_DEPOSIT: 'reconcile_bank_deposit',
  SUSPEND_WITHDRAWALS: 'suspend_withdrawals',
  MANAGE_PROTOCOL_RULES: 'manage_protocol_rules',

  // Logística (1)
  MANAGE_DRIVERS: 'manage_drivers',

  // IA Generativa (1)
  USE_AI_GENERATION: 'use_ai_generation'
} as const;

export type PermissionType = typeof PERMISSIONS[keyof typeof PERMISSIONS];
