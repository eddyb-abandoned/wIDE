var fs = require('fs');

exports.open = function open(path) {
    var data = JSON.parse(fs.readFileSync(path));
    return Proxy.create({
        getOwnPropertyDescriptor: Object.getOwnPropertyDescriptor.bind(Object, data),
        getPropertyDescriptor: Object.getOwnPropertyDescriptor.bind(Object, data),
        getOwnPropertyNames: Object.getOwnPropertyNames.bind(Object, data),
        getPropertyNames: Object.getOwnPropertyNames.bind(Object, data),
        defineProperty: function(name, propertyDescriptor) {
            Object.defineProperty(data, name, propertyDescriptor);
            fs.writeFileSync(path, JSON.stringify(data, null, 4));
        },
        delete: function(name) {
            if(!delete data[name])
                return false
            fs.writeFileSync(path, JSON.stringify(data, null, 4));
            return true;
        }
    });
};
