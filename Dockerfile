FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -S next
COPY --from=build /app/public ./public
COPY --from=build --chown=next:nodejs /app/.next/standalone ./
COPY --from=build --chown=next:nodejs /app/.next/static ./.next/static
# drizzle-kit + schema so `pnpm db:push` can run inside the container
COPY --from=build /app/node_modules/.bin/drizzle-kit ./node_modules/.bin/drizzle-kit
RUN mkdir -p /data/uploads && chown -R next:nodejs /data/uploads
USER next
EXPOSE 3000
CMD ["node", "server.js"]
