const request = require('request');
const state = require('../src/state');

exports.Actions = class Actions {
    constructor(servers) {
        this.servers = servers;
        this.state = new state.State();
    }
}