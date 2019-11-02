const request = require('request');
const state = require('../src/state');

exports.Actions = class Actions {
    constructor(currentServer, servers) {
        this.currentServer = currentServer;
        this.servers = servers;
        this.state = new state.State();
        this._initCurrentServerAsLeader();
        this.configureIntervalTasks();
    }

    _initCurrentServerAsLeader() {
        console.log('_initCurrentServerAsLeader');
        this.state.groupNumber = new Date().getTime();
        this.state.leader = this.currentServer;
        this.state.groupServers = [this.currentServer];
        this.state.isLeader = true;
        console.log(this);
    }

    _updateServersStatus() {
        const obj = this;
        obj.servers.forEach(async function (server) {
            const options = {
                url: 'http://' + server + '/ping',
                method: 'GET',
            };
            obj.state.servers[server] = await obj._sendRequest(options);
        });
    }

    configureIntervalTasks() {
        const obj = this;

        setInterval(() => {
            obj._updateServersStatus();
            if (obj.state.isLeader) {
                const leader = obj.getAnotherLeader();
                console.log(obj.currentServer, 'Another leader - ', leader);
                if (leader !== undefined) {
                    if (this.state.currentAction === undefined) {
                        obj.sendMergeRequest(
                            leader,
                            this.currentServer,
                            this.state.groupNumber
                        );
                    }
                } else {
                    console.log('Another leader does not exist.');
                }
            }
        }, 10000);
    }

    getAnotherLeader() {
        const obj = this;
        return this.servers.find(function(serverAddr) {
            const server = obj.state.servers[serverAddr];
            return (
                (server !== undefined) &&
                (server.status === 'Ok') &&
                (server.isLeader) &&
                (obj.state.groupServers.indexOf(serverAddr) < 0)
            );
        });
    }

    async sendMergeRequest(server, leader, groupNumber) {
        const options = {
            url: 'http://' + server,
            body: JSON.stringify({
                action: 'merge',
                groupNumber: groupNumber,
                leader: leader,
            }),
            method: 'POST',
            headers: {
                'Content-Type':'application/json'
            }
        };
        await this._sendRequest(options);
    }

    async _sendRequest(options) {
        try {
            let result = await new Promise(function(resolve, reject) {
                request(options, function(err, resp, body) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(body);
                    }
                })
            });
            return JSON.parse(result);
        } catch (err) {
            return {error: err};
        }
    }

    async acceptAction(body) {
        if (this.state.currentAction !== undefined) {
            console.log('Error: current action: ' + this.state.currentAction);
            return {error: 'Current action: ' + this.state.currentAction};
        }
        this.state.currentAction = 'accept';

        if (this.state.isLeader) {
            this.state.groupServers.push(body.server); // @todo: validate uniqness of groupServers items.
            this.state.currentAction = undefined;
            return  {
                status: 'Ok',
                groupNumber: this.state.groupNumber,
            };
        }

        this.state.currentAction = undefined;
        return  {
            error: 'Server is not leader',
        };
    }

    async mergeAction(body) {
        if (this.state.currentAction !== undefined) {
            console.log('Error: current action: ' + this.state.currentAction);
            return {error: 'Current action: ' + this.state.currentAction};
        }
        this.state.currentAction = 'merge';
        console.log('merge request');
        if (this.state.isLeader) {
            for (const i in this.state.groupServers) {
                const server = this.state.groupServers[i];
                if (server === this.currentServer) {
                    continue;
                }

                await this.sendMergeRequest(server, body.leader, body.groupNumber);
            }
        }

        const acceptResult = await this.sendAcceptRequest(body.leader);
        if (acceptResult['status'] === 'Ok') {
            this.state.isLeader = false;
            this.state.leader = body.leader;
            this.state.groupNumber = acceptResult['groupNumber'];
            this.state.groupServers = [];
        }
        this.state.currentAction = undefined;
    }

    async sendAcceptRequest(leader) {
        const acceptOtions = {
            url: 'http://' + leader,
            body: JSON.stringify({
                action: 'accept',
                server: this.currentServer
            }),
            method: 'POST',
            headers: {
                'Content-Type':'application/json'
            }
        };

        return await this._sendRequest(acceptOtions);
    }
}