FROM node:20-alpine

WORKDIR /app

RUN mkdir -p /app/data

COPY package*.json ./
RUN npm ci --omit=dev

COPY dist/ ./dist/
COPY public/ ./public/

VOLUME /app/data

ENV NODE_ENV=production
EXPOSE 3010

CMD ["node", "dist/server.js"]
