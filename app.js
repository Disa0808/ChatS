var express = require('express');
var errorHandler = require('errorhandler')
var path = require('path');
var log = require('./lib/log')(module);
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var config = require('./config');
var logger = require('morgan');
var HttpError = require('./error/index').HttpError;
var session = require('express-session');
var mongoose = require('./lib/mongoose');
var MongoStore = require('connect-mongo')(session); //Save session in Mongo
var User = require('./models/user').User;
var http = require('http');
var sessionStore = require('./lib/sessionStore');

var app = express();
app.set('port', config.get('port'));

//view engine setup
app.engine('ejs', require('ejs-locals'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  secret: config.get('session:secret'),
  key: config.get("session:key"),
  cookie: config.get('session:cookie'),
  store: sessionStore
}));
app.use(require('./middleware/loadUser'));
app.use(require('./middleware/sendHttpError'));


app.use(express.static(path.join(__dirname, 'public')));


//Middleware
require('./routes/index')(app);



app.use(function(err, req, res, next){
  if (typeof err == 'number') {
    err = new HttpError(err);
  }
  if (err instanceof HttpError) {
    res.sendHttpError(err);
  } else {
    if (app.get('env') == 'development'){
      var errorHandlerVar = errorHandler();
      errorHandlerVar(err, req, res, next);
    } else {
      log.error(err);
      err = new HttpError(500);
      res.sendHttpError(err);
    }
  }
});


var server = http.createServer(app).listen(app.get('port'), function(){
  log.info("Express server listening on port " + app.get('port'));
});

require('./socket')(server);