FROM zazukoians/node-java:1.0.0

WORKDIR /hydra-validator

ADD tsconfig.json .
ADD *.ts ./
ADD package*.json ./

RUN npm ci
RUN npm run build
RUN mkdir tests

ENTRYPOINT ["node", "entrypoint.js"]
