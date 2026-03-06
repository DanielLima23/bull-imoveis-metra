FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
WORKDIR /usr/share/nginx/html

COPY --from=build /app/dist/imoveis-web/browser/ ./
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/40-env-js.sh /docker-entrypoint.d/40-env-js.sh
RUN chmod +x /docker-entrypoint.d/40-env-js.sh

ENV API_URL=http://localhost:5140/api
EXPOSE 80
