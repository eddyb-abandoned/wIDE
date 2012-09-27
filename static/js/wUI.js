(function($){
$.fn.watch = function (props, func, interval, id) {
    /// <summary>
    /// Allows you to monitor changes in a specific
    /// CSS property of an element by polling the value.
    /// when the value changes a function is called.
    /// The function called is called in the context
    /// of the selected element (ie. this)
    /// </summary>
    /// <param name="prop" type="String">CSS Properties to watch sep. by commas</param>
    /// <param name="func" type="Function">
    /// Function called when the value has changed.
    /// </param>
    /// <param name="interval" type="Number">
    /// Optional interval for browsers that don't support DOMAttrModified or propertychange events.
    /// Determines the interval used for setInterval calls.
    /// </param>
    /// <param name="id" type="String">A unique ID that identifies this watch instance on this element</param>
    /// <returns type="jQuery" />
    if (!interval)
        interval = 100;
    if (!id)
        id = "_watcher";

    return this.each(function () {
        var _t = this;
        var el$ = $(this);
        var fnc = function () { __watcher.call(_t, id) };

        var data = { id: id,
            props: props.split(","),
            vals: [props.split(",").length],
            func: func,
            fnc: fnc,
            origProps: props,
            interval: interval,
            intervalId: null
        };
        // store initial props and values
        $.each(data.props, function (i) { data.vals[i] = el$.css(data.props[i]); });

        el$.data(id, data);

        hookChange(el$, id, data);
    });

    function hookChange(el$, id, data) {
        el$.each(function () {
            var el = $(this);
            if (typeof (el.get(0).onpropertychange) == "object")
                el.bind("propertychange." + id, data.fnc);
            else if ($.browser.mozilla)
                el.bind("DOMAttrModified." + id, data.fnc);
            else
                data.intervalId = setInterval(data.fnc, interval);
        });
    }
    function __watcher(id) {
        var el$ = $(this);
        var w = el$.data(id);
        if (!w) return;
        var _t = this;

        if (!w.func)
            return;

        // must unbind or else unwanted recursion may occur
        el$.unwatch(id);

        var changed = false;
        var i = 0;
        for (i; i < w.props.length; i++) {
            var newVal = el$.css(w.props[i]);
            if (w.vals[i] != newVal) {
                w.vals[i] = newVal;
                changed = true;
                break;
            }
        }
        if (changed)
            w.func.call(_t, w, i);

        // rebind event
        hookChange(el$, id, w);
    }
}
$.fn.unwatch = function (id) {
    this.each(function () {
        var el = $(this);
        var data = el.data(id);
        try {
            if (typeof (this.onpropertychange) == "object")
                el.unbind("propertychange." + id, data.fnc);
            else if ($.browser.mozilla)
                el.unbind("DOMAttrModified." + id, data.fnc);
            else
                clearInterval(data.intervalId);
        }
        // ignore if element was already unbound
        catch (e) { }
    });
    return this;
}
})(jQuery);

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
    return $('<div>').append(element.addClass('wui-vertical-text').watch('width', function() {
        // HACK TODO find a better way to detect the update of the vertical text
        var div = $(this), w = div.width(), h = div.height();
        if(w && h) {
            div.css({top: w}).parent().css({width: h, height: w, overflow: 'hidden'});
            if(unwatchTimeout)
                clearTimeout(unwatchTimeout);
            // Give it 10 seconds to load.
            unwatchTimeout = setTimeout(element.unwatch.bind(element, '_watcher'), 10000);
        }
    }));
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
        }).mousedown(function() {
            if($(this).is(':focus'))
                document.activeElement.blur();
            else
                $(this).focus();
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
            if(entry[2])
                menuEntry.mousedown(function(e){e.stopPropagation();e.preventDefault();return false;}).click(entry[2]);
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
                        file.subTree = $ui.FileTree(fullName).appendTo(file.item);
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
