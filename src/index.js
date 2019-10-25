const app = require('./app');
const ip = process.env.IP || 'localhost';
const port = process.env.PORT || 50000;
const servers = getServers();

function getServers() {
    const serversStr = process.env.SERVERS;
    return serversStr.split(',');
}

app.initApp(ip, port, servers);
