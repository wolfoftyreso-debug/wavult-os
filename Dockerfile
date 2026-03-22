# =============================================
# Hypbit OMS — Dockerfile
# Node 20 Alpine, kör via tsx (TypeScript direct)
# Uses server/ package with all backend dependencies
# =============================================

FROM node:20-alpine AS base

# Säkerhet: kör inte som root
RUN addgroup -g 1001 -S nodejs && adduser -S hypbit -u 1001

WORKDIR /app

# Kopiera server/package.json (har express, cors, etc.)
COPY server/package.json ./package.json

# Skapa package-lock från server om den finns, annars låt npm skapa
COPY package-lock.json ./

# Installera produktionsberoenden + tsx (behövs i runtime)
RUN npm install --include=dev && npm cache clean --force

# Kopiera källkod från server/
COPY server/tsconfig.json ./tsconfig.json
COPY server/src/ ./src/
COPY server/trigger/ ./trigger/

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
