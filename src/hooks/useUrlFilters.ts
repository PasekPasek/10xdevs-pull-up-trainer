import { useState, useEffect, useCallback, useRef } from "react";

export interface FilterSerializer<T> {
  serialize: (filters: T) => URLSearchParams;
  deserialize: (params: URLSearchParams) => T;
}

interface UseUrlFiltersOptions<T> {
  storageKey: string;
  defaultValue: T;
  serializer: FilterSerializer<T>;
}

/**
 * Custom hook for managing filters with URL and localStorage synchronization
 * Provides bidirectional sync between component state, URL params, and localStorage
 *
 * @param options - Configuration options
 * @returns Filters state and setter function
 */
export function useUrlFilters<T>({
  storageKey,
  defaultValue,
  serializer,
}: UseUrlFiltersOptions<T>): [T, (filters: T) => void] {
  const [mounted, setMounted] = useState(false);
  const [filters, setFiltersInternal] = useState<T>(defaultValue);

  // Store serializer and defaultValue in refs to avoid dependency issues
  const serializerRef = useRef(serializer);
  const defaultValueRef = useRef(defaultValue);

  // Update refs when props change
  useEffect(() => {
    serializerRef.current = serializer;
    defaultValueRef.current = defaultValue;
  }, [serializer, defaultValue]);

  // Initialize filters from URL or localStorage on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlFilters = serializerRef.current.deserialize(searchParams);

    // Check if URL has any filters
    const hasUrlFilters = (Object.keys(urlFilters) as (keyof T)[]).some((key) => {
      const value = urlFilters[key];
      const defaultVal = defaultValueRef.current[key];
      return value !== defaultVal && value !== undefined;
    });

    if (hasUrlFilters) {
      setFiltersInternal(urlFilters);
    } else {
      // Try to load from localStorage
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsedFilters = JSON.parse(stored);
          setFiltersInternal(parsedFilters);
        }
      } catch (error) {
        globalThis.reportError?.(error);
      }
    }

    setMounted(true);
  }, [storageKey]);

  // Sync filters to URL and localStorage whenever they change
  useEffect(() => {
    if (!mounted) return;

    const params = serializerRef.current.serialize(filters);
    const queryString = params.toString();
    const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;

    window.history.replaceState(null, "", newUrl);

    // Save to localStorage
    try {
      localStorage.setItem(storageKey, JSON.stringify(filters));
    } catch (error) {
      globalThis.reportError?.(error);
    }
  }, [filters, mounted, storageKey]);

  const setFilters = useCallback((newFilters: T) => {
    setFiltersInternal(newFilters);
  }, []);

  return [filters, setFilters];
}
