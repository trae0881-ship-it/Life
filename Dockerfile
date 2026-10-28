FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
WORKDIR /app
RUN groupadd --system --gid 1001 life && useradd --system --uid 1001 --gid life life
COPY --from=builder --chown=life:life /app/.next/standalone ./
COPY --from=builder --chown=life:life /app/.next/static ./.next/static
COPY --from=builder --chown=life:life /app/data ./data
# Next's file tracer cannot infer the native add-on's dynamically selected binary.
COPY --from=builder --chown=life:life /app/node_modules/@swisseph/node ./node_modules/@swisseph/node
USER life
EXPOSE 3000
CMD ["node", "server.js"]
