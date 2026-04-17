# syntax=docker/dockerfile:1

# ── Build stage ──────────────────────────────────────────────────────
FROM docker.io/library/node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci
COPY . .
RUN npm run build

# ── Serve stage ──────────────────────────────────────────────────────
FROM docker.io/library/nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY <<'NGINX_CONF' /etc/nginx/conf.d/default.conf
resolver 127.0.0.11 valid=10s;

server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    set $wendao_gateway wendao-gateway:9517;
    set $daochang xiuxian-daochang:18092;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to wendao-gateway
    location /api/ {
        proxy_pass http://$wendao_gateway;
        proxy_set_header Host $host;
    }

    # Proxy Arrow Flight gRPC-Web to wendao-gateway
    location /arrow.flight.protocol.FlightService/ {
        proxy_pass http://$wendao_gateway;
        proxy_set_header Host $host;
    }

    # Proxy AI SDK streaming to daochang
    location /vercel/ {
        proxy_pass http://$daochang;
        proxy_set_header Host $host;
        proxy_buffering off;
        proxy_cache off;
    }
}
NGINX_CONF
EXPOSE 80
