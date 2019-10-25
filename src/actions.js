const request = require('request');
const state = require('../src/state');

exports.Actions = class Actions {
    constructor(servers) {
        this.servers = servers;
        this.state = new state.State();
        const obj = this;
        setInterval(() => {
            this.servers.forEach(async function(server) {
                const options = {
                    url: 'http://' + server + '/ping',
                    method: 'GET',
                };

                obj.state.servers[server] = await obj._sendRequest(options);
            });
        }, 1000);
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
}