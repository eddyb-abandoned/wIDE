var Terminal = require('pty.js');

exports.load = function load(app) {
    app.get('/js/tty.js/term.js', function(req, res) {
        res.sendfile(__dirname+'/node_modules/tty.js/static/term.js');
    });
    app.get('/js/wUI.terminal.js', function(req, res) {
        res.sendfile(__dirname+'/js/wUI.terminal.js');
    });
};

// Path to shell, or the process to execute in the terminal.
var shellPath = process.env.SHELL || 'sh';

// $TERM
var termName = 'xterm';

exports.enable = function enable(socket) {
    if(socket.terms)
        return;

    socket.emit('loadScript', '/js/tty.js/term.js');
    socket.emit('loadScript', '/js/wUI.terminal.js');
    socket.terms = [];

    socket.on('terminal.create', function(callback) {
        var term = new Terminal(shellPath, termName, 80, 30);
        var id = socket.terms.push(term) - 1;

        term.on('data', function(data) {
            socket.emit('terminal.data', data, id);
        });

        term.on('close', function() {
            socket.emit('terminal.kill', id);
        });

        callback(id);
    });

    socket.on('terminal.data', function(data, id) {
        socket.terms[id].write(data);
    });

    socket.on('terminal.kill', function(id) {
        if(!socket.terms[id])
            return;

        socket.terms[id].destroy();
        delete socket.terms[id];
    });

    socket.on('terminal.resize', function(cols, rows, id) {
        socket.terms[id].resize(cols, rows);
    });
};

exports.disable = function disable(socket) {
    var term;
    while(socket.terms.length)
        if(term = socket.terms.pop())
            term.destroy();
    delete socket.terms;
};
