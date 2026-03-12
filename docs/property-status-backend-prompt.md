# Prompt para a IA do backend

Preciso ajustar o backend da API de imóveis para suportar a nova regra de status do imóvel, mantendo os endpoints já existentes.

## Objetivo

Substituir a lógica antiga baseada em `occupancyStatus` e `assetState` por uma regra explícita de negócio com:

- `status`
- `idleReason`

## Status válidos do imóvel

Use exatamente estes valores:

- `AVAILABLE`
- `LEASED`
- `INACTIVE`
- `FOR_SALE`
- `DEMANDS`
- `IDLE`

## Motivos válidos de ociosidade

Use exatamente estes valores:

- `RENOVATION`
- `TERMINATION`
- `LEGAL_PENDING`

## Regras de validação

1. `idleReason` é obrigatório quando `status == IDLE`.
2. `idleReason` deve ser `null` nos demais status.
3. Os campos antigos `occupancyStatus` e `assetState` não devem mais ser obrigatórios para criação, edição ou atualização de status.
4. Se ainda precisarem existir internamente por compatibilidade, o backend pode derivá-los, mas isso não deve mais ser exigido do frontend.

## Endpoints que devem ser ajustados

### `GET /api/imoveis`

Retornar em cada item:

- `status`
- `idleReason`

### `GET /api/imoveis/{id}`

Retornar:

- `status`
- `idleReason`

### `GET /api/imoveis/{id}/detalhe`

Retornar em `property`:

- `status`
- `idleReason`

### `POST /api/imoveis`

Atualizar o request para aceitar em `identity`:

```json
{
  "title": "string",
  "addressLine1": "string",
  "city": "string",
  "state": "string",
  "zipCode": "string",
  "propertyType": "string",
  "status": "AVAILABLE",
  "idleReason": null
}
```

### `PUT /api/imoveis/{id}`

Atualizar o request para aceitar em `identity`:

```json
{
  "title": "string",
  "addressLine1": "string",
  "city": "string",
  "state": "string",
  "zipCode": "string",
  "propertyType": "string",
  "status": "AVAILABLE",
  "idleReason": null
}
```

### `PATCH /api/imoveis/{id}/status`

Trocar o payload antigo por:

```json
{
  "status": "AVAILABLE",
  "idleReason": null
}
```

## Filtro da listagem

Em `GET /api/imoveis`, manter suporte ao query param:

- `status`

Opcionalmente também aceitar:

- `idleReason`

## Swagger / OpenAPI

Atualizar o Swagger para refletir:

- novos valores de `status`
- novos valores de `idleReason`
- novos contratos de `POST /api/imoveis`
- `PUT /api/imoveis/{id}`
- `PATCH /api/imoveis/{id}/status`
- responses de `GET /api/imoveis`, `GET /api/imoveis/{id}` e `GET /api/imoveis/{id}/detalhe`

## Compatibilidade

Se houver dados antigos persistidos com `occupancyStatus` e `assetState`, criar uma migração ou regra de conversão para preencher `status` e `idleReason` corretamente.
