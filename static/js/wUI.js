window.$ui = {};

$ui.classes = {
    'button': 'btn',
    'button-primary': 'btn btn-primary',
    'alert': 'well alert',
    'alert-error': 'well alert alert-error',
    'menu': 'dropdown-menu',
    'separator': /*wui-separator */'divider',
};

$ui.iconBase = 'http://websvn.kde.org/*checkout*/trunk/kdesupport/oxygen-icons/';

$ui.Button = function Button(text, type) {
    return $('<button>').text(text||'').addClass($ui.classes['button'+(type?'-'+type:'')]);
};

$ui.InputBox = function InputBox(type) {
    return $('<input type='+(type||'text')+'>');
};

$ui.Icon = function Icon(path, size) {
    return $('<img>').attr('src', $ui.iconBase+size+'x'+size+'/'+path+'.png');
};

$ui.AlertBox = function AlertBox(type) {
    return $('<div>').addClass($ui.classes['alert'+(type?'-'+type:'')]);
};

$ui.Box = function Box(type) {
    var box = $('<div class=wui-box>');
    return type ? box.addClass('wui-box-'+type) : box;
};

$ui.HBox = function HBox() {
    var box = $('<div class=wui-box>').addClass('wui-box-h');
    return box.append.apply(box, arguments);
};

$ui.VBox = function VBox() {
    var box = $('<div class=wui-box>').addClass('wui-box-v');
    return box.append.apply(box, arguments);
};

$ui.VText = function VText(element) {
    if(typeof(element) === 'string')
        element = $('<div>').text(element);
    else if(element.length > 1)
        element = $('<div>').append(element);

    var unwatchTimeout = 0;
    element.addClass('wui-vertical-text').on('css-change', function watcher() {
        // HACK TODO find a better way to detect the update of the vertical text
        var w = element.width(), h = element.height();
        if(w && h) {
            element.css({top: w}).parent().css({width: h, height: w, overflow: 'hidden'});
            if(unwatchTimeout)
                clearTimeout(unwatchTimeout);
            // Give it 10 seconds to load.
            unwatchTimeout = setTimeout(element.off.bind(element, 'css-change', watcher), 10000);
        }
    }).csswatch({props: 'width', props_functions: {width: 'width()'}});

    return $('<div>').append(element);
};

$ui.MenuBar = function MenuBar(menus) {
    var bar = $('<div class=wui-menubar>');
    for(var i in menus) {
        var menu = menus[i];
        if(!menu) {
            bar.append('<div class=wui-separator>&nbsp;</div>');
            continue;
        }
        var menuList = $('<ul>').addClass($ui.classes.menu), el = $('<div>').prop('tabIndex', 0).text(menu[0]).append(menuList).appendTo(bar).mouseover(function() {
            if(!$(this).is(':focus') && bar.children(':focus').length)
                $(this).focus();
        }).mousedown(function(ev) {
            if(this == ev.target) {
                if($(this).is(':focus'))
                    document.activeElement.blur();
                else
                    $(this).focus();
            }
            return false;
        });
        for(var j in menu[1]) {
            var entry = menu[1][j];
            if(!entry) {
                menuList.append($('<li>').addClass($ui.classes.separator));
                continue;
            }
            var menuEntry = $('<a href=#>').text(entry[0]).appendTo($('<li>').appendTo(menuList));
            if(entry[1])
                menuEntry.prepend($ui.Icon(entry[1], 16), ' ')
            menuEntry.click(function() {
                if(this[2])
                    this[2]();
                document.activeElement.blur();
                return false;
            }.bind(entry));
        }
    }
    return bar;
};

$ui.Panel = function Panel(views, side) {
    var panel = (side == 'bottom' ? $ui.VBox() : $ui.HBox()).addClass('wui-panel'),
        panelBar = $('<span>').css('display', side == 'left' || side == 'right' ? 'inline-block' : '');
    for(var i in views) {
        var view = views[i];
        var viewBox = (view[2].length==1 && !view[2].is('span') ? view[2] : $('<div>').append(view[2])).hide().appendTo(panel), el = $('<span>').text(view[0]).click(function(viewBox) {
            if(viewBox.is(':visible'))
                viewBox.hide();
            else
                panel.children(':not(span):visible').hide(), viewBox.show();
        }.bind(el, viewBox));
        (side == 'bottom' || side == 'left') ? el.prepend($ui.Icon(view[1], 16)) : el.append($ui.Icon(view[1], 16));
        panelBar.append((side == 'left' || side == 'right') ? $ui.VText(el) : el);
    }
    return (side == 'bottom' || side == 'right') ? panel.append(panelBar) : panel.prepend(panelBar);
};

$ui.FileTree = function FileTree(path) {
    var prefix = path ? path + '/' : '', list = $('<ul class=wui-filetree>'), files = {};
    var tree = list;
    if(!path)
        tree = $ui.VBox().append(list.css('min-width', '100%')).css({overflow: 'auto', background: '#fff'});
    function addFile(name, isDir) {
        var firstSlash = name.indexOf('/'), subPath = null;
        if(firstSlash !== -1)
            subPath = name.slice(firstSlash+1), name = name.slice(0, firstSlash), isDir = true;
        var file = files[name];
        if(!file) {
            files[name] = file = {item: $('<li>').appendTo(list), isDir: isDir};
            file.icon = $ui.Icon(isDir ? 'mimetypes/inode-directory' : 'mimetypes/unknown', 16);
            file.label = $('<span>').append(file.icon, name).appendTo(file.item);
            var fullName = prefix+name;
            if(file.isDir) {
                file.checkbox = $('<input type=checkbox>').change(function() {
                    if(!file.subTree) {
                        file.subTree = $ui.FileTree(fullName);
                        file.item.append(file.subTree);
                        file.subTree.on('listDir', function(ev, path, callback) {return tree.triggerHandler('listDir', [path, callback]);})
                        file.subTree.on('getIcon', function(ev, path, callback) {return tree.triggerHandler('getIcon', [path, callback]);});
                        file.subTree.on('clickFile', function(ev, path) {return tree.triggerHandler('clickFile', path);});
                    }
                    this.checked ? file.subTree.show() : file.subTree.hide();
                });
                file.item.prepend($('<div>').append(file.checkbox).click(function(ev) {
                    if(ev.target == this)
                        file.checkbox.click();
                }));
            } else
                file.label.click(tree.triggerHandler.bind(tree, 'clickFile', fullName));
        }
        if(subPath && file.isDir) {
            if(!file.subTree)
                file.checkbox.click();
            if(file.subTree)
                file.subTree.addFile(subPath);
        }
        tree.triggerHandler('getIcon', [fullName, function(iconName) {
            var newIcon = $ui.Icon(iconName, 16).load(function() {
                file.icon.replaceWith(newIcon);
                file.icon = newIcon;
            });
        }]);
    }
    tree.addFile = addFile;
    setTimeout(tree.triggerHandler.bind(tree, 'listDir', [path, addFile]), 0);
    return tree;
};
