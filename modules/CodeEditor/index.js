exports.load = function load(app) {
    app.get('/js/wUI.CodeEditor.js', function(req, res) {
        res.sendfile(__dirname+'/js/wUI.CodeEditor.js');
    });
    app.get('/js/KateSyntax/:file', function(req, res) {
        res.sendfile(__dirname+'/node_modules/KateSyntax.js/syntax/'+req.param('file'));
    });
};

exports.enable = function enable(socket) {
    socket.emit('loadScript', '/js/wUI.CodeEditor.js');
};