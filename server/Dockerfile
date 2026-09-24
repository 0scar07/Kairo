# Backend de Kairo. Compatible con Render, Railway, Fly.io o cualquier host con Docker.
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

# Primero las dependencias (mejor caché de capas)
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# No corre como root
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/health" || exit 1

CMD ["node", "index.js"]
