FROM node:alpine
USER root
WORKDIR /home/node/app
CMD [ "node", "src/sesame.js" ]
COPY ./ /home/node/app
RUN cd /home/node/app && npm ci
RUN ls -la /home/node/app/*
