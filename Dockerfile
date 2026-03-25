# =============================================
# pixdrift API — Dockerfile
# Node 20 Alpine, kör via tsx (TypeScript direct)
# =============================================

FROM node:20-alpine AS base

# Säkerhet: kör inte som root
RUN addgroup -g 1001 -S nodejs && adduser -S pixdrift -u 1001

WORKDIR /app

# Kopiera server/package.json och installera deps
COPY server/package.json ./package.json

# npm install i /app (standalone, ej workspace)
RUN npm install --production=false && npm cache clean --force

# Kopiera källkod
COPY server/src/ ./src/
COPY server/tsconfig.json ./tsconfig.json

# Äg filerna
RUN chown -R pixdrift:nodejs /app
USER pixdrift

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

# Starta
CMD ["npx", "tsx", "src/index.ts"]
