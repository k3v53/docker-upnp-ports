#!/bin/bash
docker-compose build
docker tag kartoffel:5000/upnp noxi/docker-upnp-ports:v1
docker tag kartoffel:5000/upnp noxi/docker-upnp-ports:$1
docker tag kartoffel:5000/upnp noxi/docker-upnp-ports:latest
docker push noxi/docker-upnp-ports:v1
docker push noxi/docker-upnp-ports:$1
docker push noxi/docker-upnp-ports:latest

