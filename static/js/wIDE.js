window.$ide = {};

$ide.showLoginBox = function showLoginBox() {
    // Remove old, localStorage-based login.
    delete localStorage.user; delete localStorage.user;
    var userBox = $ui.InputBox(), passwordBox = $ui.InputBox('password'), error = $ui.AlertBox('error').hide(),
        form = $('<form class=login>').append(error,'Username<br>',userBox,'<br>Password<br>',passwordBox,'<br>',
        $ui.Button('Login', 'primary').css('float', 'right')).submit(function() {
            error.hide();
            var user = sessionStorage.user = userBox.val(), password = sessionStorage.password = passwordBox.val();
            //$('input', form).attr('disabled','disabled');
            $ide.socket.emit('login', user, password, function(err) {
                //$('input', form).removeAttr('disabled');
                if(err)
                    return error.html(err).show();
                $ide.showIDE();
            });
            return false;
        }).appendTo($ide.container.empty());
    userBox.val(sessionStorage.user), passwordBox.val(sessionStorage.password);
    if(sessionStorage.user && sessionStorage.password)
        form.submit();
};


// TODO maybe move these somewhere else?
$ide.listFiles = function listFiles(ev, path, callback) {
    if(!path)
        return $ide.socket.emit('project.list', function(projects) {
            for(var i in projects)
                callback(projects[i], true);
        });
    var firstSlash = path.indexOf('/'), project = firstSlash === -1 ? path : path.slice(0, firstSlash), dir = firstSlash === -1 ? '' : path.slice(firstSlash+1);
    $ide.socket.emit('file.list', project, dir, function(files) {
        files = files.filter(function(file) {return file[0][0] != '.';});
        files.sort(function(a, b) {return (b[1] - a[1]) || a[0].localeCompare(b[0]);});

        for(var i in files)
            callback(files[i][0], files[i][1]);
    });
};
$ide.iconFile = function iconFile(ev, path, callback) {
    var firstSlash = path.indexOf('/'), project = firstSlash === -1 ? path : path.slice(0, firstSlash), file = firstSlash === -1 ? '' : path.slice(firstSlash+1);
    if(!file)
        return callback('places/folder-development');
    $ide.socket.emit('file.mime', project, file, function(mime) {
        if(!$ide.mimeCache)
            $ide.mimeCache = {};
        $ide.mimeCache[path] = mime;
        callback('mimetypes/'+mime.replace(/\//g, '-'));
    });
};

//BEGIN FileList
$ide.FileList = function FileList() {
};
$ide.FileList.prototype = [];
$ide.FileList.prototype.open = function open(path) {
    for(var i = 0; i < this.length; i++)
        if(this[i] && this[i].path == path)
            return this.show(this[i]);
    var firstSlash = path.indexOf('/'), project = firstSlash === -1 ? path : path.slice(0, firstSlash), file = firstSlash === -1 ? '' : path.slice(firstSlash+1);

    var mime = $ide.mimeCache[path], self = this;
    if(!mime)
        return alert('Error: attempting to open a file too soon!');
    $ide.socket.emit('file.read', project, file, function(data) {
        var editor = $ui.CodeEditor({file: file, mime: mime}, data);
        editor.css({display: 'block', overflow: 'auto', width: '100%', height: '100%'});
        self.show({path: path, project: project, file: file, editor: editor});
    });
};
$ide.FileList.prototype.show = function show(file) {
    if(file == this.current)
        return;
    if(file && this.indexOf(file) === -1) {
        this.push(file);
        $ide.ui.documentTree && $ide.ui.documentTree.addFile(file.path);
    }
    $ide.ui.editor.empty();
    if(file)
        $ide.ui.editor.append(file.editor);
    this.current = file;
};
$ide.FileList.prototype.save = function save(file) {
    file = file || this.current;
    if(!file)
        return;
    $ide.socket.emit('file.write', file.project, file.file, file.editor.getText(), function() {
        console.log('Saved', file.path);
    });
};
$ide.FileList.prototype.close = function close(file) {
    file = file || this.current;
    if(!file)
        return;
    var i = this.indexOf(file);
    if(i === -1)
        return;
    this.splice(i, 1);
    delete this.current;
    this.show(this[i-1] || this[i]);
    file.editor && file.editor.remove();
};
//END FileList

$ide.showIDE = function showIDE() {
    $ide.fileList = new $ide.FileList;

    $ui.Terminal.enable($ide.socket);

    var ui = $ide.ui = {};

    ui.menuBar = $ui.MenuBar([
        ['wIDE', [
            ['Logout', 'actions/application-exit', function() {
                delete sessionStorage.password;
                location.reload();
            }],
        ]],
        ['Project', [
            ['New', 'actions/project-development-new-template'],
            null,
            ['Open', 'actions/project-open'],
        ]],
        null,
        ['File', [
            ['New', 'actions/document-new'],
            null,
            ['Open', 'actions/document-open'],
            ['Save', 'actions/document-save', function() {
                $ide.fileList.save();
            }],
            ['Close', 'actions/document-close', function() {
                $ide.fileList.close();
            }],
        ]],
    ]);

    ui.editor = $ui.VBox().css('background', '#aaa');

    ui.leftPanel = $ui.Panel([
        ['Documents', 'places/folder-documents', ui.documentTree = $ui.FileTree().on('getIcon', $ide.iconFile).on('clickFile', function(ev, path) {$ide.fileList.open(path);}).width(250)],
        ['File browser', 'places/folder', $ui.FileTree().on('listDir', $ide.listFiles).on('getIcon', $ide.iconFile).on('clickFile', function(ev, path) {$ide.fileList.open(path);}).width(250)]
    ], 'left');

    ui.bottomPanel = $ui.Panel([
        ['Terminal', 'apps/utilities-terminal', $ui.Terminal($ide.socket)]
    ], 'bottom');

    $ide.container.empty().append($ui.VBox(ui.menuBar, $ui.HBox(ui.leftPanel, $ui.VBox(ui.editor, ui.bottomPanel))).width('100%').height('100%'));
};