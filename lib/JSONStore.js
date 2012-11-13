var fs = require('fs');

module.exports = function JSONStore(path) {
    var data = JSON.parse(fs.readFileSync(path)), pending = false;
    Object.defineProperty(data, 'write', {
        get: function write() {
            if(pending)
                return this;
            pending = true;
            process.nextTick(function() {
                pending = false;
                fs.writeFileSync(path, JSON.stringify(data, null, 4));
            });
            return this;
        }
    });
    return data;
};
