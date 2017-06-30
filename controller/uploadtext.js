var multiparty = require('multiparty');
var http = require('http');
var util = require('util');
var fs = require('fs');
var request = require('request');

function encode_utf8(s) {
  return unescape(encodeURIComponent(s));
}

function doubleEncodeUrl(param) {
  param = encodeURI(param);
  param = encodeURI(param);
  return param;
}

var uploadText = function(req, res) {
  var form = new multiparty.Form();
  form.parse(req, function(err, fields, files) {
    console.log("--1->");
    //console.log(files);
    //console.log(files.audioData[0]);
    //console.log(fields);

    var token = fields.token[0];
    var text = encode_utf8(fields.text[0]);
    text = doubleEncodeUrl(text);
    //text = encodeURIComponent(text);
    //text = encodeURIComponent(text);
    //text = encodeURI(text);
    //text = encodeURI(text);
    //console.log(size);
    var oJson = {
      tex: text,
      tok: token,
      cuid: 9817827,
      lan: 'zh',
      ctp: 1
        // speech: speech_data
    }
    console.log(oJson);
    sendPostRequest(oJson, res);

    console.log("--2->");
  });
}


function sendPostRequest(oJson, res) {
  request({
    url: "http://tsn.baidu.com/text2audio",
    //method: "POST",
    method: "GET",
    //json: true, // <--Very important!!!
    // body: oJson
    qs: oJson
  }, function(error, response, body) {
    console.log(response);
    console.log(error);
    console.log("------body--------");
    console.log(body);
    var voiceData = body;


    fs.writeFile('logo.mp3', new Buffer(voiceData, 'binary'), 'binary', function(err) {
      if (err) throw err
      console.log('File saved.')
    })

    // res.writeHead(200, {
    //   'Content-Type': "audio/mp3",
    //   'Content-disposition': 'attachment;filename=' + "mp3file",
    // });


    //var base64data = new Buffer(voiceData, 'binary').toString('base64');
    //var base64data = new Buffer(voiceData, 'binary').toString('base64');
    //console.log(base64data);
    //base64data = "data:audio/mp3;base64," + base64data,

    //res.send(base64data);
    //res.send(body);
    //res.end(body);
  });
}

exports.uploadText = uploadText;