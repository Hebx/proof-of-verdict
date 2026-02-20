FROM --platform=linux/amd64 oven/bun:1.2-alpine

USER root
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile 2>/dev/null || bun install

COPY src/ ./src/
COPY tsconfig.json ./

EXPOSE 3001

ENV PORT=3001
ENV NODE_ENV=production

CMD ["bun", "run", "src/index.ts"]
