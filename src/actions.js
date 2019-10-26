const request = require('request');
const state = require('../src/state');

exports.Actions = class Actions {
    constructor(currentServer, servers) {
        this.currentServer = currentServer;
        this.servers = servers;
        this.state = new state.State();
        this.updateServersStatus(this);
    }

    updateServersStatus(obj) {
        setInterval(() => {
            obj.servers.forEach(async function (server) {
                const options = {
                    url: 'http://' + server + '/ping',
                    method: 'GET',
                };
                obj.state.servers[server] = await obj._sendRequest(options);
            });

            if (!obj.isLeaderAvailable()) {
                obj.state.leader = undefined;
            }
            if (obj.state.leader === undefined) {
                obj.initCurrentServerLeader();
            } else {
                if (obj.state.isLeader) {
                    const leader = obj.getAnotherLeader();
                    console.log(obj.currentServer, 'Another leader - ', leader);
                    obj.merge(leader);
                }
            }
        }, 10000);
    }

    isLeaderAvailable() {
        console.log(this.currentServer, this.state.servers[this.currentServer]);
        if (this.state.servers[this.currentServer] === undefined) {
            return false;
        }
        if (this.state.servers[this.currentServer]['error'] !== undefined) {
            return false;
        }
        if (this.state.servers[this.currentServer]['status'] === 'Ok') {
            return true;
        }

        return false;
    }

    initCurrentServerLeader() {
        console.log('initCurrentServerLeader');
        this.state.groupNumber = new Date().getTime();
        this.state.leader = this.currentServer;
        this.state.groupServers = [this.currentServer];
        this.state.isLeader = true;
        console.log(this);
    }

    getAnotherLeader() {
        const obj = this;
        return this.servers.filter(function(i) {
            return obj.state.groupServers.indexOf(i) < 0;
        });
    }

    async merge(leader) {
        const options = {
            url: 'http://' + leader,
            body: JSON.stringify({
                action: 'merge',
                groupNumber: this.state.groupNumber,
                leader: this.state.leader
            }),
            method: 'POST',
            headers: {
                'Content-Type':'application/json'
            }
        };

        const servers = await this._sendRequest(options);
        console.log(this.currentServer, 'servers', servers);
        this.state.groupServers.push(...servers['servers']);
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

    async mergeAction(body) {
        console.log('/merge request');
        this.state.groupNumber = body.groupNumber;
        this.state.leader = body.leader;
        for (const i in this.state.groupServers) {
            const server = this.state.groupServers[i];
            if (server === this.currentServer) {
                continue;
            }

            const options = {
                url: 'http://' + server,
                body: JSON.stringify({
                    action: 'merge',
                    groupNumber: this.state.groupNumber,
                    leader: this.state.leader
                }),
                method: 'POST',
                headers: {
                    'Content-Type':'application/json'
                }
            };

            await this._sendRequest(options);
        }
        const result = this.state.groupServers;
        this.state.groupServers = [];
        console.log(this.currentServer, 'result', result);
        return {servers: result};
    }
}