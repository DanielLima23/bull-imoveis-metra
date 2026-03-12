import { resolveApiUrl } from '../app/core/config/runtime-environment';

export const environment = {
  production: true,
  apiUrl: resolveApiUrl('https://api.imoveis-metra.dw-softwares.com.br/api')
};
