var User = require('../models/user').User;

module.exports.get = function(req, res) {
    res.render('../views/chat');
};