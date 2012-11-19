Terminal.cursorBlink = false;

$ui.Terminal = function Terminal(socket) {
    $ui.Terminal.enable(socket); // HACK in place of a better module initialization.
    var term = new window.Terminal(80, 20, function(data) {
        socket.emit('terminal.data', data, term.id);
    });

    term.open();
    /*$(term.element).resize(function(ev){
        var x = (this.offsetWidth / term.element.offsetWidth * term.cols) | 0,
            y = (this.offsetHeight / term.element.offsetHeight * term.rows) | 0;

        socket.emit('terminal.resize', x, y, term.id);
        term.resize(x, y);
    })*/
/*

    grip.mousedown(function(ev) {
        term.focus();

        var resizeW = el[0].offsetWidth, resizeH = el[0].offsetHeight;

        el.css({overflow: 'hidden', opacity: 0.70, cursor: 'se-resize'});
        $(term.element).css('height', '100%');

        $(document).on('mousemove.resize', function(ev) {
            el.width(ev.pageX - el[0].offsetLeft).height(ev.pageY - el[0].offsetTop);
        }).on('mouseup.resize', function(ev) {
            var x = (el[0].offsetWidth / resizeW * term.cols) | 0,
                y = (el[0].offsetHeight / resizeH * term.rows) | 0;

            socket.emit('terminal.resize', x, y, term.id);
            term.resize(x, y);

            el.css({width: '', height: '', overflow: '', opacity: '', cursor: ''});
            $(term.element).css('height', '');

            $(document).off('mousemove.resize').off('mouseup.resize');
        });
        return false;
    });

    el.mousedown(function(ev) {
        if(ev.target !== el[0])
            return;

        term.focus();

        var drag = el.offset();
        drag.pageX = ev.pageX;
        drag.pageY = ev.pageY;

        el.css({opacity: 0.60, cursor: 'move'});

        $(document).on('mousemove.drag', function(ev) {
            el.offset({left: drag.left + ev.pageX - drag.pageX, top: drag.top + ev.pageY - drag.pageY});
        }).on('mouseup.drag', function(ev) {
            el.css({opacity: '', cursor: ''});
            $(document).off('mousemove.drag').off('mouseup.drag');
        });
        return false;
    });*/

    socket.emit('terminal.create', function(id) {
        term.id = id;
        socket.terms[id] = term;
    });

    return $(term.element);
};

$ui.Terminal.enable = function enable(socket) {
    if(socket.terms)
        return;

    socket.terms = [];

    socket.on('terminal.data', function(data, id) {
        socket.terms[id].write(data);
    });

    socket.on('terminal.kill', function(id) {
        delete socket.terms[id];
    });

    /*var focus_ = Terminal.prototype.focus;
    Terminal.prototype.focus = function focus() {
        if(Terminal.focus === this)
            return;

        if(this.wrapper) {
            var i = socket.terms.length;
            while(i--)
                if(socket.terms[i])
                    $(socket.terms[i].wrapper).css('z-index', (socket.terms[i] === this) * 1000);
        }

        return focus_.call(this);
    };*/
};

$ui.Terminal.disable = function disable(socket) {
    if(!socket.terms)
        return;

    var term;
    while(socket.terms.length)
        if(term = socket.terms.pop())
            socket.emit('terminal.kill', term.id);
    delete socket.terms;
};
