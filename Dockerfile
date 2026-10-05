FROM node:20-slim
WORKDIR /app

# Copy dependency definition
COPY package*.json ./

# Install dependencies inside the container
RUN npm install

# Copy source code (node_modules is excluded via .dockerignore)
COPY . .

# Build both frontend (dist) and backend (server.js)
RUN npm run build

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

CMD ["node", "server.js"]
