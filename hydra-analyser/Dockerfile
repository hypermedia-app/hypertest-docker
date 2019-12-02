FROM node:lts-alpine

WORKDIR /hydra-validator

ADD tsconfig.json .
ADD *.ts ./
ADD package*.json ./

RUN npm ci
RUN npm run build

ENTRYPOINT ["node", "entrypoint.js"]
