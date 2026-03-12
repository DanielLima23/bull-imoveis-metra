declare global {
  interface Window {
    __env?: {
      apiUrl?: string;
    };
  }
}

function readRuntimeApiUrl(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const value = window.__env?.apiUrl?.trim();
  return value ? value.replace(/\/+$/, '') : null;
}

export function resolveApiUrl(fallback: string): string {
  return readRuntimeApiUrl() ?? fallback.replace(/\/+$/, '');
}
