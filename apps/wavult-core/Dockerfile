FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3007
HEALTHCHECK --interval=30s --timeout=10s CMD wget -qO- http://localhost:3007/health || exit 1
CMD ["node", "dist/index.js"]
