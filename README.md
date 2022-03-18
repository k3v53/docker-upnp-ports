# docker-upnp-ports
This is a little Nodejs script which can open ports on a router dynamically based on the opened ports of your containers.

It searches for the label `upnp=true` on any container and opens those ports on your router via upnp.

Still under development but works already great for me.

## Usage
Start a docker container with the image `noxi/docker-upnp-ports` and map the file `/var/run/docker.sock:/var/run/docker.sock`.

`docker run --name docker-upnp-ports -d noxi/docker-upnp-ports -v "/var/run/docker.sock:/var/run/docker.sock"`

Or use the provided `docker-compose.yml`.
