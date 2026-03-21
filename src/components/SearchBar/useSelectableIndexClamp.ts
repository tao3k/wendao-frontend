import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { clampSelectableIndex } from './searchKeyboardUtils';

interface UseSelectableIndexClampParams {
  selectedIndex: number;
  totalSelectableItems: number;
  setSelectedIndex: Dispatch<SetStateAction<number>>;
}

export function useSelectableIndexClamp({
  selectedIndex,
  totalSelectableItems,
  setSelectedIndex,
}: UseSelectableIndexClampParams): void {
  useEffect(() => {
    if (selectedIndex < 0 || selectedIndex >= totalSelectableItems) {
      setSelectedIndex(clampSelectableIndex(selectedIndex, totalSelectableItems));
    }
  }, [selectedIndex, setSelectedIndex, totalSelectableItems]);
}
