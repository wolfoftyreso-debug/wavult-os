FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
COPY tsconfig.json ./
RUN npx tsc --noEmit 2>/dev/null || true
EXPOSE 3010
HEALTHCHECK --interval=30s --timeout=10s CMD node -e "require('http').get('http://localhost:3010/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
CMD ["node", "-r", "tsx/cjs", "src/index.ts"]
