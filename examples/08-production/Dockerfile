# docker build -t coding-agent -f examples/08-production/Dockerfile .

FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY . .

FROM oven/bun:1-slim
WORKDIR /app
# The official Bun image already ships an unprivileged "bun" user.
USER bun
COPY --from=build --chown=bun:bun /app /app
# Secrets are read from the environment at runtime, never baked into the image:
# pass ANTHROPIC_API_KEY and TELEGRAM_BOT_TOKEN with `docker run -e`.
ENV NODE_ENV=production
CMD ["bun", "run", "examples/08-production/webhook-server.ts"]
