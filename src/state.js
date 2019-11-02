exports.State = class State {
    constructor() {
        this.groupNumber = 0;
        this.groupServers = {};
        this.leader = undefined;
        this.isLeader = false;
        this.servers = {};
        this.currentAction = undefined;
    }

    emptyGroupServersList() {
        this.groupServers = {};
    }

    addServerToGroup(server) {
        this.groupServers[server] = true;
    }

    getGroupServers() {
        return Object.keys(this.groupServers);
    }

    isServerExist(server) {
        return (this.groupServers[server] === true);
    }
}