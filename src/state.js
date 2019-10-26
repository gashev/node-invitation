exports.State = class State {
    constructor() {
        this.groupNumber = 0;
        this.groupServers = [];
        this.leader = undefined;
        this.isLeader = false;
        this.servers = {};
        this.currentAction = undefined;
    }
}