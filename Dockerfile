# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN yarn build

# Stage 2: Production
FROM node:22-alpine AS runner
WORKDIR /app

# ติดตั้งเฉพาะ production deps
COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile

# เอา node_modules, prisma schema, และ build output จาก builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma      ./prisma
COPY --from=builder /app/.next        ./.next
COPY --from=builder /app/public       ./public
COPY --from=builder /app/next.config.ts    ./
COPY --from=builder /app/postcss.config.mjs ./
COPY --from=builder /app/tailwind.config.ts ./

EXPOSE 3000

# รัน migration ตอนเริ่ม container และเริ่มแอป
CMD ["sh", "-c", "npx prisma migrate deploy && yarn start"]
