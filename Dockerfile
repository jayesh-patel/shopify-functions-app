FROM node:20-bullseye AS builder
WORKDIR /app
ENV DATABASE_URL="file:./prisma/dev.db"
COPY package.json .
COPY web/package.json web/package.json
COPY extensions/x-for-y-discount/package.json extensions/x-for-y-discount/package.json
RUN npm install
COPY . .
RUN npm run build

FROM node:20-bullseye AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=builder /app .
EXPOSE 8080
CMD ["npm", "run", "deploy"]
