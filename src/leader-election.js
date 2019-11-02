const request = require('request');
const state = require('../src/state');

exports.Node = class Node {
    constructor(currentServer, servers) {
        this.currentServer = currentServer;
        this.servers = servers;
        this.state = new state.State();
        this._initCurrentServerAsLeader();
        this._configureIntervalTasks();
    }

    _initCurrentServerAsLeader() {
        console.log('_initCurrentServerAsLeader');
        this.state.groupNumber = new Date().getTime();
        this.state.leader = this.currentServer;
        this.state.emptyGroupServersList();
        this.state.addServerToGroup(this.currentServer);
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

    _checkLeaderStatus() {
        if (this.state.isLeader) {
            return;
        }

        if(this.state.servers[this.state.leader] === undefined) {
            return;
        }

        if ((this.state.servers[this.state.leader].error !== undefined) ||
            (!this.state.servers[this.state.leader].isLeader)
        ) {
            this.state.isLeader = true;
            this.state.emptyGroupServersList();
            this.state.addServerToGroup(this.currentServer);
            this.state.leader = this.currentServer;
        }
    }

    _checkAnotherLeader() {
        if (!this.state.isLeader) {
            return;
        }

        const leader = this._getAnotherLeader();
        console.log(this.currentServer, 'Another leader - ', leader);

        if (leader === undefined) {
            console.log('Another leader does not exist.');
            return;
        }

        if (this.state.currentAction === undefined) {
            this._sendMergeRequest(
                leader,
                this.currentServer,
                this.state.groupNumber
            );
        }
    }

    _configureIntervalTasks() {
        const obj = this;

        setInterval(() => {
            obj._updateServersStatus();
            obj._checkLeaderStatus();
            obj._checkAnotherLeader();
        }, 10000);
    }

    _getAnotherLeader() {
        const obj = this;
        return this.servers.find(function(serverAddr) {
            const server = obj.state.servers[serverAddr];
            return (
                (server !== undefined) &&
                (server.status === 'Ok') &&
                (server.isLeader) &&
                (!obj.state.isServerExist(serverAddr))
            );
        });
    }

    async _sendAcceptRequest(leader) {
        const acceptOtions = {
            url: 'http://' + leader + '/accept',
            body: JSON.stringify({
                server: this.currentServer
            }),
            method: 'POST',
            headers: {
                'Content-Type':'application/json'
            }
        };

        return await this._sendRequest(acceptOtions);
    }

    async _sendMergeRequest(server, leader, groupNumber) {
        const options = {
            url: 'http://' + server + '/merge',
            body: JSON.stringify({
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

    async acceptRequest(body) {
        if (this.state.currentAction !== undefined) {
            console.log('Error: current action: ' + this.state.currentAction);
            return {error: 'Current action: ' + this.state.currentAction};
        }
        this.state.currentAction = 'accept';

        if (this.state.isLeader) {
            this.state.addServerToGroup(body.server);
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

    async mergeRequest(body) {
        if (this.state.currentAction !== undefined) {
            console.log('Error: current action: ' + this.state.currentAction);
            return {error: 'Current action: ' + this.state.currentAction};
        }
        this.state.currentAction = 'merge';
        console.log('merge request');
        if (this.state.isLeader) {
            const groupServers = this.state.getGroupServers();
            for (const i in groupServers) {
                const server = groupServers[i];
                if (server === this.currentServer) {
                    continue;
                }

                await this._sendMergeRequest(server, body.leader, body.groupNumber);
            }
        }

        const acceptResult = await this._sendAcceptRequest(body.leader);
        if (acceptResult['status'] === 'Ok') {
            this.state.isLeader = false;
            this.state.leader = body.leader;
            this.state.groupNumber = acceptResult['groupNumber'];
            this.state.emptyGroupServersList();
        }
        this.state.currentAction = undefined;
    }

    pingRequest() {
        return {
            status: 'Ok',
            time: new Date().getTime(),
            isLeader: this.state.isLeader,
            leader: this.state.leader,
        };
    }

    statusRequest() {
        return this.state;
    }
}