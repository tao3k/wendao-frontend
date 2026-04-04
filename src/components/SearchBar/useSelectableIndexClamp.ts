import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { clampSelectableIndex } from './searchKeyboardUtils';

interface UseSelectableIndexClampParams {
  selectedIndex: number;
  selectableCount: number;
  setSelectedIndex: Dispatch<SetStateAction<number>>;
}

export function useSelectableIndexClamp({
  selectedIndex,
  selectableCount,
  setSelectedIndex,
}: UseSelectableIndexClampParams): void {
  useEffect(() => {
    if (selectedIndex < 0 || selectedIndex >= selectableCount) {
      setSelectedIndex(clampSelectableIndex(selectedIndex, selectableCount));
    }
  }, [selectedIndex, selectableCount, setSelectedIndex]);
}
