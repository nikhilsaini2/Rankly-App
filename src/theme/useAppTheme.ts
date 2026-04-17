import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { colors as darkColors } from './color';
import { lightColors } from './lightTheme';

export function useAppTheme() {
  const mode = useSelector((state: RootState) => state.theme.mode);
  return mode === 'dark' ? darkColors : lightColors;
}
