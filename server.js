#!/usr/bin/node --harmony
//
var fs = require('fs'), path = require('path'), pid;

/*TODO process management
try {
    pid = +fs.readFileSync('lock.pid', 'utf8');
    pid = isNaN(pid) ? null : pid;
    if(pid)
        process.kill(pid);
} catch(e) {
    // HACK ignore errors
}
process.on('exit', fs.unlinkSync.bind(fs, 'lock.pid'));
if(process.argv[2] == 'stop')
    process.exit();
fs.writeFileSync('lock.pid', ''+process.pid);
*/

var mimeIcons = fs.readdirSync(__dirname + '/static/oxygen-icons/16x16/mimetypes/')

var execFile = require('child_process').execFile;
function xdgMime(path, cb) {
    execFile('xdg-mime', ['query', 'filetype'].concat([Array.isArray(path) ? path : [path]]), function (err, stdout) {
        stdout = stdout.trim();
        if (err) {
            if (stdout)
                err.message = stdout;
            cb(err);
        } else
            cb(null, Array.isArray(path) ? stdout.split('\n') : stdout);
    });
};

var express = require('express'), app = express(), server = require('http').createServer(app), io = require('socket.io').listen(server);

app.configure(function() {
    app.use(express.methodOverride());
    app.use(express.bodyParser());
    app.use(express.static(__dirname + '/static'));
    app.use(express.errorHandler({dumpExceptions: true, showStack: true}));
    app.use(app.router);
});

app.get('/', function(req, res) {
    res.sendfile(__dirname + '/index.html');
});

io.set('log level', 2);
io.set('browser client minification', true);

var userManager = require('./lib/userManager'), terminal = require('./lib/terminal');
userManager.basePath = __dirname + '/users/';

io.sockets.on('connection', function(socket) {
    socket.on('login', function(user, password, callback) {
        var data = userManager.login(user, password);
        if(!data)
            return callback('<b>Login failed</b> user/password don\'t match!');
        socket.user = data;
        terminal.enable(socket);

        socket.on('project.list', function(callback) {
            callback(socket.user.projects.map(function(project) {return project.name;}));
        });

        //!TODO Check for path tricks.
        socket.on('file.list', function(project, dir, callback) {
            //if(socket.user.projects.indexOf(project) === -1)
            //    return;
            var path = userManager.path(socket.user.name) + '/projects/' + project + '/' + (dir ? dir + '/' : '');
            fs.readdir(path, function(err, files) {
                if(err)
                    return console.error(err);
                callback(files.map(function(file) {
                    return [file, fs.statSync(path + file).isDirectory()];
                }));
            });
        });

        socket.on('file.mime', function(project, file, callback) {
            //if(socket.user.projects.indexOf(project) === -1)
            //    return;
            xdgMime(userManager.path(socket.user.name) + '/projects/' + project + '/' + file, function(err, mime) {
                if(err)
                    return console.error(err);
                callback(mimeIcons.indexOf(mime.replace(/\//g, '-') + '.png') === -1 ? 'text/plain' : mime);
            });
        });

        socket.on('file.read', function(project, file, callback) {
            //if(socket.user.projects.indexOf(project) === -1)
            //    return;
            fs.readFile(userManager.path(socket.user.name) + '/projects/' + project + '/' + file, 'utf8', function(err, data) {
                if(err)
                    return console.error(err);
                callback(data);
            });
        });

        socket.on('file.write', function(project, file, data, callback) {
            //if(socket.user.projects.indexOf(project) === -1)
            //    return;
            fs.writeFile(userManager.path(socket.user.name) + '/projects/' + project + '/' + file, data, function(err) {
                if(err)
                    return console.error(err);
                callback();
            });
        });

        callback();
    });
});

server.listen(process.argv[2] || 8080);
