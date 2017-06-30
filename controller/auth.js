var request = require('request');

var URL = "https://openapi.baidu.com/oauth/2.0/token";

var params = {
  grant_type: "client_credentials",
  client_id: "enaHkP8m6GeYrbBCGhZGBa7l",
  client_secret: "3b600586b13902133a20ea79eedfaff0"
};

var getTokenJson = function(cb) {
  request({ url: URL, qs: params }, function(err, response, body) {
    if (err) { console.log(err); return; }
    //console.log("Get response: " + response.statusCode);
    //console.log("body: " + body);
    cb(body);
  });

}



exports.getTokenJson = getTokenJson;