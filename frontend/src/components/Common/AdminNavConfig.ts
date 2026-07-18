export interface NavSubItem {
  label: string;
  path: string;
  permission?: string;
  rootOnly?: boolean;
  risk?: 'normal' | 'high' | 'critical';
}

export interface NavItem {
  label: string;
  path?: string;
  icon: string;
  subItems?: NavSubItem[];
  rootOnly?: boolean;
  permission?: string;
  risk?: 'normal' | 'high' | 'critical';
}

export const ADMIN_BRANDING = {
  cubeLetter: 'A',
  cubeBg: 'linear-gradient(135deg, var(--emerald) 0%, var(--green) 100%)',
  cubeColor: '#000',
  activeLinkBg: 'rgba(72, 214, 76, 0.1)',
  activeIconColor: 'var(--emerald)'
};
