const express = require('express');
const LeaderElection = require('../src/leader-election');

exports.initApp = function(ip, port, servers) {
    const node = new LeaderElection.Node(`${ip}:${port}`, servers);
    const app = express();
    app.use(express.json())

    app.get('/status', function(req, res) {
        console.log('/status request');
        res.send(node.statusAction());
    });

    app.get('/ping', function(req, res) {
        console.log('/ping request');
        res.send(node.pingAction());
    });

    app.post('/merge', async function(req, res) {
        console.log('/merge request');
        res.send(await node.mergeAction(req.body));
    });

    app.post('/accept', async function(req, res) {
        console.log('/accept request');
        res.send(await node.acceptAction(req.body));
    });

    app.listen(port, ip, () => console.log(`Example app listening on port ${port}!`));
}