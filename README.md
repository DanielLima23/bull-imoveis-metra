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

Por padrao usa `src/environments/environment.ts`:

- `https://localhost:7083/api`

## Credenciais seed (backend)
- `admin@imoveis.dev` / `123456`
- `operador@imoveis.dev` / `123456`

## Build

```bash
npm run build
```
