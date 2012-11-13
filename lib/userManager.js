var bcrypt = require('bcrypt'), fs = require('fs'), JSONStore = require('./JSONStore');

exports.basePath = '/home';

exports.valid = function valid(user) {
    return user && /^[a-zA-Z0-9\-_]{3,}$/.test(user);
};

exports.path = function path(user) {
    return exports.basePath + '/' + user;
};

exports.exists = function exists(user) {
    if(!exports.valid(user))
        return false;
    return fs.existsSync(exports.path(user));
};

exports.login = function login(user, password) {
    if(!exports.exists(user))
        return false;
    var data = new JSONStore(exports.path(user) + '/user.json');
    if(!data.password)
        return console.log(bcrypt.hashSync(password, bcrypt.genSaltSync())), false;
    if(!bcrypt.compareSync(password, data.password))
        return false;
    if(!data.name)
        data.write.name = user;
    if(!data.projects)
        data.write.projects = [];
    if(fs.readdirSync(exports.path(user)).indexOf('projects') === -1)
        fs.mkdirSync(exports.path(user) + '/projects');
    return data;
};
