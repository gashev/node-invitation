const express = require('express');
const LeaderElection = require('../src/leader-election');

exports.initApp = function(ip, port, servers) {
    const app = express();
    const node = new LeaderElection.Node(`${ip}:${port}`, servers);

    app.use(express.json())

    app.post('/accept', async function(req, res) {
        console.log('/accept request');
        res.send(await node.acceptRequest(req.body));
    });

    app.post('/merge', async function(req, res) {
        console.log('/merge request');
        res.send(await node.mergeRequest(req.body));
    });

    app.get('/ping', function(req, res) {
        console.log('/ping request');
        res.send(node.pingRequest());
    });

    app.get('/status', function(req, res) {
        console.log('/status request');
        res.send(node.statusRequest());
    });

    app.listen(port, ip, () => console.log(`Example app listening on port ${port}!`));
}