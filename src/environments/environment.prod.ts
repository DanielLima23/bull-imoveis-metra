const runtimeApiUrl =
  typeof window !== 'undefined' && typeof (window as Window & { __env?: { apiUrl?: string } }).__env?.apiUrl === 'string'
    ? (window as Window & { __env?: { apiUrl?: string } }).__env!.apiUrl!
    : undefined;

export const environment = {
  production: true,
  apiUrl: runtimeApiUrl ?? 'https://api.example.com/api'
};
