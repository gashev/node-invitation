const express = require('express');

const actions = require('../src/actions');

exports.initApp = function(ip, port, servers) {
    const a = new actions.Actions(servers);
    const app = express();
    app.use(express.json())

    app.get('/', function(req, res) {
        res.send({
            group: a.state.groupNumber,
            servers: a.state.groupServers,
            leader: a.state.leader
        });
    });

    app.post('/', function(req, res) {
        switch (req.body.action) {
            default:
                res.send('{"error": "Incorrect action"}');
                break;
        }
    });

    app.listen(port, ip, () => console.log(`Example app listening on port ${port}!`));
}