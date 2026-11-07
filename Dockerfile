FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8081

# Run expo web server accessible to host
CMD ["npx", "expo", "start", "--web", "--host", "lan"]
