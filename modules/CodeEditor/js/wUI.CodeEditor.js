window.KateSyntax = {base: 'js/KateSyntax', debugTime: true, debugTrace: false};
(function() {
    var script = document.createElement('script');
    script.src = KateSyntax.base+'/KateSyntax.js';
    document.head.appendChild(script);
})();

$ui.CodeEditor = function CodeEditor(file, originalText) {
    var oldText = '', editor = $('<div class=wui-editor contenteditable spellcheck=false>'), hl;

    // Change handler, redoes highlighting.
    editor.change(function() {
        var hasOriginal = typeof originalText === 'string';

        // Try to find the caret position, measured in characters.
        var sel = window.getSelection(), caretElem, caretPos = null;
        if(!hasOriginal && sel.rangeCount) {
            var range = sel.getRangeAt(0);
            caretElem = range.startContainer;
            if(caretElem != this) {
                caretPos = range.startOffset;

                // Find the first non-tag node that contains the caret.
                while(caretElem.tagName && caretElem.tagName != 'BR' && caretElem.childNodes.length)
                    caretElem = caretElem.childNodes[0];

                // Special case for <br>.
                if(caretElem.tagName == 'BR')
                    caretPos++;
            }
            range = null;
        }

        // Get the complete text content of the editor.
        if(hasOriginal) {
            var text = originalText;
            caretPos = text.length;
            originalText = null;
        } else {
            var text = '', prevText = false;
            (function deepText(x) {
                if(x.tagName == 'DIV' && prevText && text[text.length - 1] != '\n' && (!x.childNodes[0] || x.childNodes[0].tagName != 'BR'))
                    text += '\n', prevText = false;

                // Add the length of the text before the caret element to the caret.
                if(caretPos !== null && caretElem == x)
                    caretPos += text.length;

                if(x.tagName == 'BR')
                    text += '\n', prevText = false;
                else if(x.nodeType == Node.TEXT_NODE)
                    text += x.data, prevText = true;
                else
                    for(var i = 0, n = x.childNodes.length; i < n; i++)
                        deepText(x.childNodes[i]);
            })(this);
        }

        // Skip re-highlighting if the text is identical.
        if(text == oldText)
            return;
        oldText = text;

        if(!hl) {
            while(this.firstChild)
                this.removeChild(this.firstChild);
            this.appendChild(document.createTextNode(text));
            return false;
        }
        hl.run(text);
        if(caretPos !== null) {
            // Remove the old caret.
            sel.removeAllRanges();

            // Find the element which the caret should be in.
            //var timeID = 'findCaretElem('+caretPos+')'
            //console.time(timeID/*findCaretElem('+caretPos+')*/);
            var caretElem = (function findCaretElem(x) {
                if(x.nodeType != Node.TEXT_NODE) {
                    for(var i = 0, j, n = x.childNodes.length; i < n; i++)
                        if(j = findCaretElem(x.childNodes[i]))
                            return j;
                    return;
                }
                var textLen = x.data.length;
                if(caretPos <= textLen)
                    return x;
                caretPos -= textLen;
            })(hl.root);
            //console.timeEnd(timeID/*findCaretElem('+caretPos+')*/);
        }

        // Empty the editor and add the highlighted contents.
        if(hasOriginal) {
            //console.time('append');
            while(this.firstChild)
                this.removeChild(this.firstChild);
            this.appendChild(hl.root);
            //console.timeEnd('append');
        }

        if(caretElem) {
            // Set the new caret.
            console.time('addRange');
            var range = document.createRange();
            range.setStart(caretElem, caretPos);
            range.setEnd(caretElem, caretPos);
            sel.addRange(range);
            console.timeEnd('addRange');
        }
        console.time('extra');
        setTimeout(console.timeEnd.bind(console, 'extra'), 0);
        return false;
    });

    // Intercept a newline.
    editor.keypress(function(ev) {
        if(ev.which == 13) {
            var sel = window.getSelection();
            if(sel.rangeCount) {
                var range = sel.getRangeAt(0), el = range.startContainer, offset = range.startOffset;
                if(el != range.endContainer || offset != range.endOffset)
                    sel.deleteFromDocument();
                if(el.nodeType === Node.TEXT_NODE) {
                    // Add the newline.
                    el.data = el.data.slice(0, offset)+'\n'+el.data.slice(offset);
                    // Update the caret.
                    sel.removeAllRanges();
                    range = document.createRange();
                    range.setStart(el, offset+1);
                    range.setEnd(el, offset+1);
                    sel.addRange(range);
                } else
                    console.log(el, offset);
            }
            return false;
        }
    });

    // Trigger a change event on keyUp.
    editor.keyup(function() {
        $(this).change();
    });

    if(originalText) {
        // HACK newline at the end is required to make contenteditable work (might need to strip it when getting the content).
        originalText += '\n';
        // Trigger the initial change event.
        editor.change();
    }

    editor.getText = function getText() {
        // HACK stripping above-mentioned newline.
        return oldText.replace(/\n$/, '');
    }

    KateSyntax.getHighlighter(file, function(highlighter) {
        hl = highlighter;
        if(!hl)
            return;
        hl.root = document.createElement('div');
        originalText = oldText;
        oldText = null;
        editor.change();
    });

    return editor;
};

$ide.FileList.handlers.push({
    match: function(file, mime) {
        return !!KateSyntax.find({file: file, mime: mime});
    },
    open: function(project, file, path, mime) {
        $ide.socket.emit('file.read', project, file, function(data) {
            var editor = $ui.CodeEditor({file: file, mime: mime}, data);
            editor.css('overflow-y', 'scroll'); // HACK there's a bug where overflow: auto doesn't work properly sometimes.
            $ide.fileList.show({path: path, project: project, file: file, editor: editor, handler: this});
        });
    },
    save: function(file) {
        $ide.socket.emit('file.write', file.project, file.file, file.editor.getText(), function() {
            console.log('Saved', file.path);
        });
    }
});
