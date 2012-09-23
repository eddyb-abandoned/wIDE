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

$ide.listFiles = function listFiles(path, callback) {
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

$ide.iconFile = function iconFile(path, callback) {
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

$ide.FileList = function FileList() {
};

$ide.FileList.prototype = [];
$ide.FileList.prototype.open = function open(path) {
    for(var i = 0; i < this.length; i++)
        if(this[i] && this[i].path == path)
            return this.show(this[i]);
    var firstSlash = path.indexOf('/'), project = firstSlash === -1 ? path : path.slice(0, firstSlash), file = firstSlash === -1 ? '' : path.slice(firstSlash+1);
    var self = this;
    $ide.socket.emit('file.read', project, file, function(data) {
        var editor = $ui.Editor({file: file, mime: $ide.mimeCache && $ide.mimeCache[path]}, data);
        editor.css({display: 'block', overflow: 'auto', width: '100%', height: '100%'});
        self.show({path: path, project: project, file: file, editor: editor});
    });
};
$ide.FileList.prototype.show = function show(file) {
    if(file == this.current)
        return;
    if(file && this.indexOf(file) === -1)
        this.push(file);
    $ide.ui.editor.empty();
    if(file) {
        $ide.ui.editor.append(file.editor);
        if(!file.prev && this.current)
            file.prev = this.current;
    }
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
    delete this[i];
    if(i == this.length - 1) {
        while(i >= 0 && !this[i])
            i--;
        this.length = i+1;
    }
    delete this.current;
    if(this.indexOf(file.prev) === -1)
        this.show(this[this.length-1]);
    else
        this.show(file.prev);
    file.editor.remove();
};

$ide.showIDE = function showIDE() {
    $ide.fileList = new $ide.FileList;

    $ui.Terminal.enable($ide.socket);

    var ui = $ide.ui = {};

    ui.menuBar = $ui.MenuBar([
        ['wIDE', [
            ['Logout', 'actions/application-exit', function() {
                delete sessionStorage.password;
                document.location.reload();
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

    ui.editor = $('<div>').css({background: '#aaa', width: '100%', height: '100%', overflow: 'scroll'});

    ui.leftPanel = $ui.Panel([
        ['File browser', 'places/folder', $ui.FileTree($ide.listFiles, $ide.fileList.open.bind($ide.fileList), $ide.iconFile).width(250)]
    ], 'left');

    ui.bottomPanel = $ui.Panel([
        ['Terminal', 'apps/utilities-terminal', $ui.Terminal($ide.socket)]
    ], 'bottom');

    $ide.container.empty().append($ui.VBox(ui.menuBar, $ui.HBox(ui.leftPanel, $ui.VBox(ui.editor, ui.bottomPanel))).height('100%'));

    $ide.stats = new Stats();
    $ide.stats.domElement.style.position = 'absolute';
    $ide.stats.domElement.style.top = $ide.stats.domElement.style.right = '0px';
    $ide.container.append($ide.stats.domElement);
    function fps() {
        $ide.stats.id = requestAnimationFrame(fps);
        $ide.stats.update();
    }
    fps();
};