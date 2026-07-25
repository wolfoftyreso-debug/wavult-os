FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build && npm run rtm:verify

FROM node:22-alpine
WORKDIR /app
RUN addgroup -S aero && adduser -S aero -G aero
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/openapi.yaml ./openapi.yaml
USER aero
EXPOSE 3017
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3017/health || exit 1
CMD ["node", "dist/index.js"]
