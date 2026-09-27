FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 4200

# --poll: file-watch reliability for bind-mounted source on Docker Desktop
# (Windows/macOS), where native fs events don't cross the VM boundary.
CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--port", "4200", "--poll", "2000"]
