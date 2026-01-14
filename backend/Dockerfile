FROM mcr.microsoft.com/playwright:v1.41.0-jammy

WORKDIR /app

COPY package*.json ./

# curl is usually included in jammy, but ensuring it for healthchecks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

RUN npm install

COPY . .

EXPOSE 4000

CMD ["npm", "run", "dev"]
