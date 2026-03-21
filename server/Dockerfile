# =============================================
# Hypbit OMS — Dockerfile
# Node 20 Alpine, kör via tsx (TypeScript direct)
# =============================================

FROM node:20-alpine AS base

# Säkerhet: kör inte som root
RUN addgroup -g 1001 -S nodejs && adduser -S hypbit -u 1001

WORKDIR /app

# Kopiera package-filer först (layer cache)
COPY package.json package-lock.json ./

# Installera produktionsberoenden + tsx (behövs i runtime)
RUN npm ci --include=dev && npm cache clean --force

# Kopiera källkod
COPY tsconfig.json ./
COPY src/ ./src/
COPY trigger/ ./trigger/

# Äg filerna av rätt användare
RUN chown -R hypbit:nodejs /app

USER hypbit

# Exponera port
EXPOSE 3001

# Healthcheck — kollar /api/health var 30:e sekund
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

# Startkommando
CMD ["npx", "tsx", "src/index.ts"]
