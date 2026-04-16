export { colors, gradients, shadows } from './color';
export { lightColors } from './lightTheme';
export { spacing } from './spacing';
export { typography } from './typography';
export { radius } from './radius';

// Shared theme type — both dark and light themes conform to this shape
export type AppTheme = typeof import('./color').colors;
