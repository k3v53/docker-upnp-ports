# docker-upnp-ports
This is a little Nodejs script which can open ports on a router dynamically based on the opened ports of your containers.

## Quickstart
Start a docker container with the image [`noxi/docker-upnp-ports`](https://hub.docker.com/r/noxi/docker-upnp-ports) and map the file `/var/run/docker.sock:/var/run/docker.sock` also use the host network or use the provided [`docker-compose.yml`](https://github.com/alex-vg/docker-upnp-ports/blob/master/docker-compose.yml).

`docker run -v /var/run/docker.sock:/var/run/docker.sock --net=host --name docker-upnp-ports --restart unless-stopped -d noxi/docker-upnp-ports`


## Container-Labels
- It searches for the label `upnp=true` on any container and opens those ports on your router via upnp.
- `upnp-whitelist=8080,4200,80` Limits the opened ports to a whitelist limiting to the given ports on the container.

## Environment
- `ROUTER_HOST` (default: `fritz.box`) specifies your router host or IP
    - If unchanged, the script tries to find your router first via upnp. It will then override `ROUTER_HOST` and `ROUTER_PORT` with the first router found on the network. When you specify `ROUTER_HOST`, there is no autodetection.
- `ROUTER_PORT` (default: `49000`) specifies your router upnp port
- `REFRESH` (default: 10) number in minutes between the port checks. Port lease time is `REFRESH`*2. 

Still under development but already works great for me. 😄

