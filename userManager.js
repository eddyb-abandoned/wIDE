var bcrypt = require('bcrypt'), jsonStore = require('./jsonStore'), fs = require('fs'), path = require('path');

exports.valid = function valid(user) {
    return user && !/[^a-zA-Z0-9\-_]/.test(user);
};

exports.path = function path(user) {
    return __dirname + '/users/' + user;
};

exports.exists = function exists(user) {
    if(!exports.valid(user))
        return false;
    return path.existsSync(exports.path(user));
};

exports.login = function login(user, password) {
    if(!exports.exists(user))
        return false;
    var data = jsonStore.open(exports.path(user) + '/user.json');
    if(!data.password)
        return console.log(bcrypt.hashSync(password, bcrypt.genSaltSync())), false;
    if(!bcrypt.compareSync(password, data.password))
        return false;
    if(!data.name)      data.name = user;
    if(!data.projects)  data.projects = [];
    if(fs.readdirSync(exports.path(user)).indexOf('projects') === -1)
        fs.mkdirSync(exports.path(user) + '/projects');
    return data;
};
