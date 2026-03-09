# Imoveis Web (Angular 21)

Frontend do sistema de gestao de imoveis.

## Stack
- Angular 21 (standalone)
- Rotas public/private lazy
- JWT + refresh via interceptors
- Guards de autenticacao e perfil
- Sidenav fixa + topbar fixa + breadcrumb
- Toast global para create/update/delete

## Rodar local

```bash
npm install
npm start
```

App: `http://localhost:4200`

## API esperada

Em desenvolvimento local, o fallback vem de `src/environments/environment.ts`:

- `http://localhost:5140/api`

Em container, o frontend carrega `public/env.js` em runtime. A imagem gera esse arquivo a partir da variavel de ambiente `API_URL`, entao no Coolify voce pode definir:

```env
API_URL=https://seu-backend.com/api
```

## Credenciais seed (backend)
- `admin@imoveis.dev` / `123456`
- `operador@imoveis.dev` / `123456`

## Build

```bash
npm run build
```
