FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# install curl for healthchecks
RUN apk add --no-cache curl

RUN npm install

COPY . .

EXPOSE 4000

CMD ["npm", "run", "dev"]
