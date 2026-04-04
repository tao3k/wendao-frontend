/**
 * Storage utility for persisting values to localStorage
 */
export const createStorage = <T>(key: string, defaultValue: T) => {
  return {
    get: (): T => {
      try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : defaultValue;
      } catch {
        return defaultValue;
      }
    },
    set: (value: T): void => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Storage might be full or disabled
      }
    },
    remove: (): void => {
      try {
        localStorage.removeItem(key);
      } catch {
        // Storage might be disabled
      }
    },
  };
};

/**
 * Hook-friendly storage wrapper
 */
export const useStorageValue = <T>(key: string, defaultValue: T): [T, (value: T) => void] => {
  const storage = createStorage(key, defaultValue);

  const getValue = (): T => storage.get();
  const setValue = (value: T): void => storage.set(value);

  return [getValue(), setValue];
};
