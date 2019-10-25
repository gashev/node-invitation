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
        });
    });

    app.post('/', function(req, res) {
        console.log('/ request');
        switch (req.body.action) {
            default:
                res.send('{"error": "Incorrect action"}');
                break;
        }
    });

    app.listen(port, ip, () => console.log(`Example app listening on port ${port}!`));
}