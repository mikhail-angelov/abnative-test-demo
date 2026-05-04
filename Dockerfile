FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

FROM node:20-alpine
WORKDIR /app
RUN mkdir -p /app/data
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist/ ./dist/
COPY public/ ./public/
VOLUME /app/data
ENV NODE_ENV=production
EXPOSE 3010
CMD ["node", "dist/server.js"]
