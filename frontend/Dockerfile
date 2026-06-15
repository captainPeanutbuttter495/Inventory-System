# Production build of the Next.js app. Two stages so the final image doesn't carry
# build-only cruft. Using node:24-slim (Debian/glibc) rather than alpine (musl): this
# repo is developed on Windows, and the glibc prebuilt binaries for Next's SWC and
# Tailwind v4's lightningcss resolve far more reliably than the musl ones.

# ---- Build stage ----
FROM node:24-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_* values are inlined into the browser bundle at BUILD time, so the API
# URL must be baked in HERE — setting it at `docker compose up` time would do nothing.
# It's http://localhost:8000 because the fetch runs in the user's BROWSER (a Client
# Component), and the browser reaches Django via the host-published port, NOT the
# compose service name "web" (which only resolves inside the Docker network).
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

# ---- Run stage ----
FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000
CMD ["npm", "start"]
