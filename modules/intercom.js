const zmq = require('zeromq');
const pushSocket = zmq.socket('push', {});
const pullSocket = zmq.socket('pull', {});
const pm2 = require('pm2');
console.debug = 'development' == process.env.PROFILE ? console.debug : () => { };

const serverInfo = {
    type: 0,
    node: {}
};

const setup = {
    pm_id: null,

    getPullSocket: () => {
        return pullSocket;
    },
    getPushSocket: () => {
        return pushSocket;
    },

    getCPUInfo: (callback) => {
        const _this = this;
        pm2.describe(_this.pm_id, (err, proc) => {
            serverInfo.node.monit = proc[0].monit;
            serverInfo.node.PID = proc[0].pid;
            serverInfo.node.pm_id = proc[0].pm_id;
            callback();
        });
    },

    pm2Manipulations: () => {
        const _this = this;
        repSocket.on('message', (response) => {
            const status = JSON.parse(response);

            switch (status.action) {
                case 'stop':
                    pm2.stop(_this.pm_id, err => {
                        console.log('stop Error: ', err)
                    });
                    break;
                case 'reload':
                    pm2.reload(_this.pm_id, err => {
                        console.log('reload Error: ', err);
                    });
                    break;
                case 'restart':
                    pm2.restart(_this.pm_id, err => {
                        console.log('restart Error: ', err);
                    });
                    break;
                default:
                    break;
            }
        });
    },

    sendInfo: () => {
        setInterval(() => {
            setup.getCPUInfo(() => {
                pushSocket.send(JSON.stringify([serverInfo]));
            });
        }, 10000);
    },

    openTCPConnection: (runningAddress) => {
        const { host, port } = runningAddress;
        const tcpAddress = 'tcp://' + host + ':' + port;

        pullSocket.bindSync(tcpAddress);
        serverInfo.node.runningAddress = runningAddress;

        return true;
    },

    connectToTCP: (connectionAddress) => {
        const { host, port } = connectionAddress;
        const tcpAddress = 'tcp://' + host + ':' + port;
        pushSocket.connect(tcpAddress);
        return true;
    },

    init: (configs) => {
        const _this = this;
        const {
            serverId,
            nodeId,
            kind,
            connectionAddress,
            runningAddress,
        } = configs;


        if (serverId && nodeId && connectionAddress.host && connectionAddress.port && runningAddress.host && runningAddress.port && kind) {
            pm2.list(function errback(err, result) {
                result.forEach(function (r) {
                    if (r.pm2_env.NODE_ID == process.env.NODE_ID)
                        _this.pm_id = r.pm2_env.pm_id;
                });

                const tcpConnected = setup.connectToTCP(connectionAddress);

                serverInfo.node.serverId = serverId;
                serverInfo.node.nodeId = nodeId;
                serverInfo.node.serverAddress = serverAddress;
                serverInfo.node.kind = kind;

                const tcpOpened = setup.openTCPConnection(runningAddress);

                if (tcpConnected && tcpOpened) {
                    console.log("Server's TCP connections successfully setup");
                    setup.sendInfo();
                } else {
                    console.log("Server cant be set, Something is not working");
                }
            });
        } else {
            throw Error("Parameters are not correct or are not valid");
        }

    },

    setConnectionInfo: (info) => {
        serverInfo.info = info;
    }
};

module.exports = setup;
