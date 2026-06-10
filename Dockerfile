FROM node:20-bookworm-slim AS base

WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts

RUN npm run build
RUN npm prune --omit=dev

EXPOSE 4000

CMD ["node", "dist/server.js"]
