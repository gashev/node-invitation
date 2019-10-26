const request = require('request');
const state = require('../src/state');

exports.Actions = class Actions {
    constructor(currentServer, servers) {
        this.currentServer = currentServer;
        this.servers = servers;
        this.state = new state.State();
        this.configureIntervalTasks();
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

        obj.initCurrentServerLeader();

        setInterval(() => {
            obj._updateServersStatus();
            if (obj.state.isLeader) {
                const leader = obj.getAnotherLeader();
                console.log(obj.currentServer, 'Another leader - ', leader);
                if (leader !== undefined) {
                    obj.merge(leader);
                } else {
                    console.log('Another leader does not exist.');
                }
            }
        }, 10000);
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

    async merge(leader) {
        if (this.state.currentAction !== undefined) {
            return {error: 'Current action: ' + this.state.currentAction}
        }
        this.state.currentAction = 'merge';
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
        console.log(this.currentServer, 'options', options);
        const servers = await this._sendRequest(options);
        console.log(this.currentServer, 'servers', servers);
        if (servers['servers'] !== undefined) {
            this.state.groupServers.push(...servers['servers']);

        }
        this.state.currentAction = undefined;
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
        if (this.state.currentAction !== undefined) {
            console.log('Error: current action: ' + this.state.currentAction);
            return {error: 'Current action: ' + this.state.currentAction};
        }
        this.state.currentAction = 'merge';
        console.log('merge request');
        const result = this.state.groupServers;
        this.state.groupNumber = body.groupNumber;
        this.state.leader = body.leader;
        this.state.isLeader = false;
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
        this.state.groupServers = [];
        console.log(this.currentServer, 'result', result, JSON.stringify({servers: result}));
        this.state.currentAction = undefined;
        return {servers: result};
    }
}