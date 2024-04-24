const tr = require('tr-064');
const tr064 = new tr.TR064();
const http = require('http');
const dns = require('dns');
const net = require('net');
const SSDP = require('node-ssdp').Client
const ssdpClient = new SSDP();

let routerAddr = process.env.ROUTER_HOST || 'fritz.box';
let routerPort = process.env.ROUTER_PORT || 49000;
let routerSsdpSet = !!process.env.ROUTER_HOST;

const refreshEvery = process.env.REFRESH || 10; // minutes

(async () => {
    let lastDevice;

    const cb2promise = (fn, ...args) => {
        return new Promise((accept, rekt) => {
            fn(...args, (...ret) => {
                accept(ret);
            })
        });
    }

    const netConnect = (cfg) => {
        return new Promise((accept, rekt) => {
            const client = net.connect(cfg, () => {
                accept(client);
            });
        });
    }

    const getHostIP = async () => {
        const dockerIpResult = await new Promise((a)=>dns.lookup('host.docker.internal',a))
        const dockerIp = dockerIpResult?.[1];
        if(!dockerIp) {
            const client = await netConnect({port: 80, host:"google.com"});
            const localAddress = client.localAddress;
            client.end();
            return localAddress;
        }
        return dockerIp;
    }

    const hostIP = await getHostIP();

    const getIGDDevice = () => {
        return new Promise((acccept, reject) => {
            if(lastDevice) return   acccept(lastDevice);
                
            tr064.initIGDDevice(routerAddr, routerPort, function (err, device) {
                  if (!err) {
                  lastDevice = device;
                  acccept(lastDevice);
                  } else {
                      reject(err);
                  }
              });
            
        });
    }
    
    const getDockerContainer = () => {
        return new Promise((accept, rekt) => {
            const options = {
                socketPath: '/var/run/docker.sock',
                path: '/v1.24/containers/json?all=1',
            };

            const callback = res => {
                res.setEncoding('utf8');
                // Build response body in a string
                let resBody = '';

                // Listen for data and add
                res.on('data', function (chunk) {
                    resBody += chunk
                });

                res.on('end', data => {
                    try {
                        accept(JSON.parse(resBody));
                    } catch (e) {
                        rekt(e);
                    }
                });
                res.on('error', data => rekt(resBody));
            };
            
            const clientRequest = http.request(options, callback);
            clientRequest.end();
        })
    }

    const getDockerPorts = async() => {
        const data = await getDockerContainer();
        const portcfgs = [];
        for(let containerNo in data) {
            const container = data[containerNo];
            if(!container?.Labels?.['upnp']) {
                console.log('skipping container (no upnp label)', container?.Names?.[0], container?.Id);
                continue;
            }
            console.log('inspecting container', container?.Names?.[0], container?.Id);
            const whitelist = container?.Labels?.['upnp-whitelist']?.split(/[,\s]+/);
            for(let portNo in container.Ports) {
                const port = container.Ports[portNo];
                if(!whitelist || whitelist.includes('' + port.PublicPort)){
                    console.log('inspecting container port', container?.Names?.[0], container?.Id, port.PublicPort);
                    portcfgs.push({...port, container})
                } else {
                    console.log('skipping container (not in upnp-whitelist label)', container?.Names?.[0], container?.Id, port.PublicPort);
                }
            }
        }
        return portcfgs;
    }

  
    /**
     * openPort
     * 
     * port: int Port
     * proto: "tcp"/"udp"
     * 
     * urn:schemas-upnp-org:service:WANIPConnection:1
        # AddPortM  ing
        IN : NewRemoteHost
        IN : NewExternalPort
        IN : NewProtocol
        IN : NewInternalPort
        IN : NewInternalClient
        IN : NewEnabled
        IN : NewPortMappingDescription
        IN : NewLeaseDuration

        # DeletePortMapping()
        IN : NewRemoteHost
        IN : NewExternalPort
        IN : NewProtocol
     **/
    const openPort = async (portcfg) => {
        const device = await getIGDDevice();

        const f = device?.services?.['urn:schemas-upnp-org:service:WANIPConnection:1']?.actions?.AddPortMapping;
        const options = {
            NewRemoteHost: portcfg.IP,
            NewExternalPort: portcfg.PublicPort,
            NewProtocol: portcfg.Type,
            NewInternalPort: portcfg.PublicPort,
            NewInternalClient: hostIP,
            NewEnabled: '1',
            NewPortMappingDescription: 'auto-docker-upnp',
            NewLeaseDuration: refreshEvery * 60 * 2,
        };
        try {
            const ret = await cb2promise(f,
                options
            );
            
        } catch (error) {
            console.error(error)
            console.log("There was an error trying to open a port, retrying in "+refreshEvery+" Minutes")
        }
        console.log(new Date().toUTCString(), "+Opened Port\n", options);
    }

    const runRepeated = async () => {
        const portcfgs = await getDockerPorts();
        for(let portcfgNo in portcfgs) {
            const portcfg = portcfgs[portcfgNo];
            openPort(portcfg);
        }
    };

    const run = async () => {
        setInterval(runRepeated, refreshEvery * 60 * 1000);
        runRepeated();
    };

    ssdpClient.on('response', function (headers, statusCode, rinfo) {
        console.log(new Date().toUTCString(), 'Got a response to an m-search.', headers, statusCode, rinfo);
        const url = new URL(headers?.LOCATION);
        if (url?.hostname && !routerSsdpSet) {
            routerSsdpSet = true;
            ssdpClient.stop();
            routerAddr = url?.hostname;
            routerPort = url?.port;
            run();
        }
    });
    console.log(new Date().toUTCString(), 'Searching routers...');
    ssdpClient.search('urn:schemas-upnp-org:device:InternetGatewayDevice:1');
})();
