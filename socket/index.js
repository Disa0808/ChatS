var log = require('../lib/log')(module);
var cookieParser = require('cookie-parser');
var config = require('../config');
var HttpError = require('../error/index').HttpError;
var mongoose = require('../lib/mongoose');
var User = require('../models/user').User;
var sessionStore = require('../lib/sessionStore');
var connect = require('connect');
var async = require('async');
var cookie = require('cookie');

function loadSession(sid, callback) {
    sessionStore.load(sid, function(err, session) {
        if (arguments.length == 0) {
            log.debug('loadSession---------' + 'arguments.length= ' + arguments.length );
            return callback(null, null);
        } else {
            log.info('loadSession---------' + session);
            return callback(null, session);
        }
    });
}

function loadUser(session, callback) {
    if(!session.user) {
        log.debug("Session %s is anonymous", session.id);
        return callback(null, null);
    }

    log.debug("retrieving user", session.user);

    User.findById(session.user, function(err, user) {
        if (err) return callback(err);

        if (!user) {
            return callback(null, null);
        }

        log.debug("user findbyId result: " + user);
        callback(null, user);
    });

}

module.exports = function(server){
    var io = require('socket.io').listen(server);
    io.set('origins', 'localhost:*');
    io.set('logger', log);

    io.use(function(socket, callback) {
        
        async.waterfall([
            function(callback) {
                socket.handshake.cookies = cookie.parse(socket.request.headers.cookie || '');
                var sidCookie = socket.handshake.cookies[config.get('session:key')];
                var sid = cookieParser.signedCookie( sidCookie, config.get('session:secret'));
                loadSession(sid, callback);
            },
            function(session, callback) {
                if (!session) {
                    callback(new HttpError(401, "No session"));
                }
                socket.handshake.session = session;
                loadUser(session, callback);
            },
            function(user, callback) {
                if (!user) {
                    callback(new HttpError(403, "Anonymous session may not connect"));
                }
                socket.handshake.user = user;
                callback(null);
            }
        ], function(err) {
            if (!err) {
                return callback(null, true);
            }

            if (err instanceof HttpError) {
                return callback(null, false);
            }
            callback(err);
        })
    });


    io.sockets.on('connection', function(socket) {

        var username = socket.handshake.user.get('username');     

        socket.broadcast.emit('join', username);

        socket.on('message', function(text, cb) {
            console.log(text);
            socket.broadcast.emit('message', text);
            cb("123");
        });
        socket.on('disconnect', function() {
            socket.broadcast.emit('leave', username);
        });
    });
    return io;
};