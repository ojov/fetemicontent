import { useState, useEffect } from 'react';

export default function useStickyState(defaultValue, key) {
  const [value, setValue] = useState(() => {
    try {
      const stickyValue = window.sessionStorage.getItem(key);
      if (stickyValue !== null) {
        return JSON.parse(stickyValue);
      }
    } catch (err) {
      console.error(`Error reading sessionStorage key "${key}":`, err);
    }
    return defaultValue;
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`Error writing sessionStorage key "${key}":`, err);
    }
  }, [key, value]);

  return [value, setValue];
}
