// ============================================
// COLOR SYSTEM
// Lock-In Fitness Competition App
// Sports-inspired, competitive aesthetic
// ============================================

export const colors = {
  // Primary palette - Electric Orange/Red
  primary: {
    50: '#FFF5F0',
    100: '#FFE8DB',
    200: '#FFD1B8',
    300: '#FFB088',
    400: '#FF8A57',
    500: '#FF6B35', // Main primary
    600: '#E85A2A',
    700: '#C44A22',
    800: '#9E3B1B',
    900: '#7A2E15',
  },
  
  // Secondary palette - Deep Navy
  secondary: {
    50: '#F0F4FF',
    100: '#E0E8FF',
    200: '#C7D4FF',
    300: '#A3B8FF',
    400: '#7A94FF',
    500: '#5B73FF',
    600: '#4A5CF0',
    700: '#3D4BD4',
    800: '#343FAB',
    900: '#2D3587',
  },
  
  // Accent - Neon Green (for wins/positive)
  accent: {
    50: '#F0FFF4',
    100: '#C6F6D5',
    200: '#9AE6B4',
    300: '#68D391',
    400: '#48BB78',
    500: '#38A169', // Main accent
    600: '#2F855A',
    700: '#276749',
    800: '#22543D',
    900: '#1C4532',
  },
  
  // Background colors
  background: {
    primary: '#0A0A0F',
    secondary: '#12121A',
    tertiary: '#1A1A25',
    card: '#1E1E2A',
    elevated: '#252535',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  
  // Text colors
  text: {
    primary: '#FFFFFF',
    secondary: '#A0A0B0',
    tertiary: '#6B6B7B',
    inverse: '#0A0A0F',
    accent: '#FF6B35',
    success: '#48BB78',
    error: '#FC8181',
    warning: '#F6AD55',
  },
  
  // Status colors
  status: {
    success: '#48BB78',
    error: '#FC8181',
    warning: '#F6AD55',
    info: '#63B3ED',
  },
  
  // Gradient presets
  gradients: {
    primary: ['#FF6B35', '#FF8A57'],
    secondary: ['#5B73FF', '#7A94FF'],
    accent: ['#38A169', '#48BB78'],
    dark: ['#1A1A25', '#0A0A0F'],
    fire: ['#FF6B35', '#FF8A57', '#FFB088'],
    victory: ['#FFD700', '#FFA500', '#FF6B35'],
    playoff: ['#9B59B6', '#8E44AD', '#6C3483'],
  },
  
  // Sport-specific colors
  sport: {
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32',
    champion: '#FFD700',
  },
  
  // Border colors
  border: {
    default: '#2A2A3A',
    light: '#3A3A4A',
    focus: '#FF6B35',
  },
};

// Light theme overrides
export const lightColors = {
  ...colors,
  background: {
    primary: '#FFFFFF',
    secondary: '#F8F9FA',
    tertiary: '#F0F1F3',
    card: '#FFFFFF',
    elevated: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  text: {
    primary: '#0A0A0F',
    secondary: '#6B6B7B',
    tertiary: '#A0A0B0',
    inverse: '#FFFFFF',
    accent: '#E85A2A',
    success: '#2F855A',
    error: '#C53030',
    warning: '#C05621',
  },
  border: {
    default: '#E2E8F0',
    light: '#EDF2F7',
    focus: '#FF6B35',
  },
};

// Get theme colors based on mode
export function getThemeColors(isDark: boolean) {
  return isDark ? colors : lightColors;
}

// Utility functions
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getContrastColor(bgColor: string): string {
  // Simple luminance calculation
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#0A0A0F' : '#FFFFFF';
}

// Rank colors
export function getRankColor(rank: number): string {
  if (rank === 1) return colors.sport.gold;
  if (rank === 2) return colors.sport.silver;
  if (rank === 3) return colors.sport.bronze;
  return colors.text.secondary;
}

// Score comparison colors
export function getScoreColor(myScore: number, opponentScore: number): string {
  if (myScore > opponentScore) return colors.status.success;
  if (myScore < opponentScore) return colors.status.error;
  return colors.text.secondary;
}

// Win/Loss colors
export function getWinLossColor(isWin: boolean | null): string {
  if (isWin === true) return colors.status.success;
  if (isWin === false) return colors.status.error;
  return colors.text.secondary;
}

