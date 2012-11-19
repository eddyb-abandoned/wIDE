exports.load = function load(app, express) {
    app.get('/js/wUI.CodeEditor.js', function(req, res) {
        res.sendfile(__dirname+'/js/wUI.CodeEditor.js');
    });
    
    app.use('/js/KateSyntax/', express.static(__dirname + '/node_modules/KateSyntax.js/syntax/'));
};

exports.enable = function enable(socket) {
    socket.emit('loadScript', '/js/wUI.CodeEditor.js');
};
