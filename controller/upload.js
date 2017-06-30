var multiparty = require('multiparty');
var http = require('http');
var util = require('util');
var fs = require('fs');
var request = require('request');


var uploadAudio = function(req, res) {
  var form = new multiparty.Form();
  form.parse(req, function(err, fields, files) {
    console.log("--1->");
    //console.log(files);
    //console.log(files.audioData[0]);
    var path = files.audioData[0].path;
    var size = files.audioData[0].size;
    var token = fields.token[0];
    //console.log(size);
    var oJson = {
      format: "wav",
      rate: 8000,
      channel: 1,
      token: token,
      cuid: "baidu_workshop",
      len: size,
      lan: 'zh'
        // speech: speech_data
    }

    readFileAsync(path, function(speech_data) {
      oJson.speech = speech_data;
      //console.log(oJson);
      console.log("-------ojson------");
      sendPostRequest(oJson, res);
    });
    console.log("--2->");
  });
}

function readFileAsync(path, cb) {
  fs.readFile(path, function(err, data) {
    if (err) {
      console.log(err)
    } else {
      //console.log("----file data-------");
      //console.log(data);
      var speech_data = data.toString('base64');
      cb(speech_data);
    }
  });
}

function sendPostRequest(oJson, res) {
  request({
    url: "http://vop.baidu.com/server_api",
    method: "POST",
    json: true, // <--Very important!!!
    body: oJson
  }, function(error, response, body) {
    //console.log(response);
    //console.log(error);
    //console.log(body);

    res.send(body);
  });
}

exports.uploadAudio = uploadAudio;