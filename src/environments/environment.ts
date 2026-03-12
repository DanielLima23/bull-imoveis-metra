import { resolveApiUrl } from '../app/core/config/runtime-environment';

export const environment = {
  production: false,
  apiUrl: resolveApiUrl('http://localhost:5140/api')
};
