var express = require('express');
// var auth = require('./controller/auth');
// var upload = require('./controller/upload');
var polly = require('./controller/awspolly');
var bodyParser = require('body-parser');



var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.set('jsonp callback name', 'callback');

app.get('/', function(request, response) {
  response.send("hello world ！");

});

app.post('/tts', function(request, response) {
  //response.send("hello world ！");
  polly.getSpeechBy(request, response);
});
// app.get('/getToken', function(request, response) {
//   auth.getTokenJson(function(json) {
//     response.send(json);
//   });
// });

// app.post('/uploadAudio', function(request, response) {
//   upload.uploadAudio(request, response);
// });

// app.post('/uploadText', function(request, response) {
//   uploadtext.uploadText(request, response);
// });

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});