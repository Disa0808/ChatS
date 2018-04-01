var User = require('../models/user').User;
var async = require('async');
var HttpError = require('../error/index');
var AuthError = require('../models/user').AuthError;

module.exports.get = function(req, res) {
    res.render('../views/login');
};

module.exports.post = function(req, res, next) {
    var username = req.body.username;
    var password = req.body.password;

    User.authorize(username, password, function(err, user) {
        if (err) {
            if (err instanceof AuthError) {
                return next(new AuthError(403, err.message));
            } else {
                return next(err);
            }
        }
        req.session.user = user._id;
        res.send({});
    });


};