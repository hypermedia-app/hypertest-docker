FROM zazukoians/node-java:2.0.0

WORKDIR /hydra-validator

ADD tsconfig.json .
ADD *.ts ./
ADD package*.json ./
ADD docker.env ./

RUN npm ci
RUN npm run build
RUN npm i -g dotenv-cli

ENTRYPOINT ["dotenv", "-e", "docker.env", "node", "entrypoint.js"]
