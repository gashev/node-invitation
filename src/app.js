const express = require('express');
const actions = require('../src/actions');

exports.initApp = function(ip, port, servers) {
    const a = new actions.Actions(`${ip}:${port}`, servers);
    const app = express();
    app.use(express.json())

    app.get('/', function(req, res) {
        res.send(a.state);
    });

    app.get('/ping', function(req, res) {
        console.log('/ping request');
        res.send({
            status: 'Ok',
            time: new Date().getTime(),
            isLeader: a.state.isLeader,
            leader: a.state.leader,
        });
    });

    app.post('/merge', async function(req, res) {
        console.log('/merge request');
        res.send(await a.mergeAction(req.body));
    });

    app.post('/accept', async function(req, res) {
        console.log('/accept request');
        res.send(await a.acceptAction(req.body));
    });

    app.listen(port, ip, () => console.log(`Example app listening on port ${port}!`));
}