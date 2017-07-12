'use strict';

const async = require('async');
const fs = require('fs-extra');
const got = require('got');
const ora = require('ora');
const path = require('path');
const Polly = require('aws-sdk/clients/polly').Presigner;
const spawn = require('child_process').spawn;
const tempfile = require('tempfile');
const textchunk = require('textchunk');
var base64 = require('base64-stream');

const maxCharacterCount = 1500;

const fileExtensions = {
  mp3: 'mp3',
  ogg_vorbis: 'ogg', // eslint-disable-line camelcase
  pcm: 'pcm',
};


// Creates an object containing all the data.
let buildInfo = (text, urlCreator, opts) => {
  return {
    opts: opts,
    tempfile: tempfile(`.${fileExtensions[opts.format]}`),
    text: text,
    urlcreator: urlCreator,
  };
};

// Calls AWS Polly with the given info.
let callAws = (info, i, callback) => {
  const secsPerMin = 60;
  const minsInHalfHour = 30;
  const halfHour = secsPerMin * minsInHalfHour;

  let url = info.urlcreator({
    OutputFormat: info.opts.format,
    //SampleRate: info.opts['sample-rate'] ? String(info.opts['sample-rate']) : undefined,
    Text: info.text,
    VoiceId: info.opts.voice,
    TextType: "text",
    //SpeechMarkTypes: ['word', 'sentence '],
  }, halfHour);

  console.log("--info--");
  console.log(url);
  let error;
  let outputStream = fs.createWriteStream(info.tempfile);
  outputStream.on('close', () => { callback(error); });
  got.stream(url).on('error', err => {
    error = err;
  }).pipe(outputStream);
};

// Deletes the manifest and its files.
let cleanup = manifestFile => {
  let manifest = fs.readFileSync(manifestFile, 'utf8');
  let regexpState = /^file\s+'(.*)'$/gm;
  let match;
  while ((match = regexpState.exec(manifest)) !== null) {
    fs.removeSync(match[1]);
  }
  fs.removeSync(manifestFile);
};

// Combines MP3 or OGG files into one file.
let combineEncodedAudio = (binary, manifestFile, outputFile) => {
  let args = [
    '-f', 'concat',
    '-safe', '0',
    '-i', manifestFile,
    '-c', 'copy',
    outputFile
  ];
  console.log(args);
  return new Promise((resolve, reject) => {
    let ffmpeg = spawn(binary, args);
    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += `\n${data}`;
    });
    ffmpeg.on('error', err => {
      reject(new Error('Could not start ffmpeg process'));
    });
    ffmpeg.on('close', code => {
      if (code > 0) {
        //spinner.fail();
        return reject(new Error(`ffmpeg returned an error (${code}): ${stderr}`));
      }
      resolve();
    });
  });
};

// Concatenates raw PCM audio into one file.
let combineRawAudio = (manifestFile, outputFile) => {
  let manifest = fs.readFileSync(manifestFile, 'utf8');
  let regexpState = /^file\s+'(.*)'$/gm;
  fs.createFileSync(outputFile);
  fs.truncateSync(outputFile);
  let match;
  while ((match = regexpState.exec(manifest)) !== null) {
    let dataBuffer = fs.readFileSync(match[1]);
    fs.appendFileSync(outputFile, dataBuffer);
  }
  return Promise.resolve();
};

// Combines all the parts into one file.
// Resolves with the new filename.
let combine = (manifestFile, opts) => {
  let newFile = tempfile(`.${fileExtensions[opts.format]}`);
  let combiner = opts.format === 'pcm' ?
    combineRawAudio(manifestFile, newFile) :
    combineEncodedAudio(opts.ffmpeg, manifestFile, newFile);
  return combiner.then(() => {
    //cleanup(manifestFile);
    console.log("-----file return");
    console.log(manifestFile);
    console.log(newFile);
    console.log("-----file return");
    var files = {
      speechMarkFile: manifestFile,
      speechFile: newFile
    };
    return files;
  }).catch(err => {
    cleanup(manifestFile);
    throw err;
  });
};

// Writes down all the temp files for ffmpeg to read in.
// Returns the text filename.
let createManifest = parts => {
  let txtFile = tempfile('.txt');
  let contents = parts.map(info => {
    return `file '${info.tempfile}'`;
  }).join('\n');
  fs.writeFileSync(txtFile, contents, 'utf8');
  return txtFile;
};

// Create an AWS Polly instance.
let createPolly = opts => {
  return new Polly({
    apiVersion: '2016-06-10',
    region: opts.region,
    accessKeyId: opts['access-key'],
    secretAccessKey: opts['secret-key'],
  });
};

// Calls the API for each text part (throttled). Returns a Promise.
let generateAll = (parts, opts, func) => {
  let count = parts.length;
  return (new Promise((resolve, reject) => {
    async.eachOfLimit(
      parts,
      opts.limit,
      func,
      err => {
        if (err) {
          return reject(err);
        }
        resolve(parts);
      }
    );
  }));
};


var ACCESS_KEY = "AKIAIBJ7SE4XOOWRFJIQ";
var SECRET_KEY = "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";
// Returns a Promise with the temporary audio file.
function generateSpeech(strParts, opts) {
  // Add in the default options.
  opts = opts || {};
  opts = Object.assign({}, {
    'access-key': ACCESS_KEY,
    ffmpeg: opts.ffmpeg || 'C:\\ffmpeg\\bin\\ffmpeg',
    format: opts.format || 'mp3',
    limit: Number(opts.throttle) || 5, // eslint-disable-line no-magic-numbers
    region: opts.region || 'us-east-1',
    'sample-rate': opts.sampleRate,
    'secret-key': SECRET_KEY,
    voice: opts.voice || 'Joanna'
  }, opts);

  let polly = createPolly(opts);

  // Compile the text parts and options together in a packet.
  let parts = strParts.map(part => buildInfo(part, polly.getSynthesizeSpeechUrl.bind(polly), opts));

  return generateAll(parts, opts, callAws)
    .then(createManifest)
    .then(manifest => {
      return combine(manifest, opts);
    });
};


// Read in the text from a file.
// If no file is specified, read from stdin.
function readText(text) {
  return new Promise((resolve, reject) => {
    resolve(text);
  }).then(text => {
    return text;
  });
};

// Splits a string of text into chunks.
function splitText(text) {
  let parts = textchunk.chunk(text, maxCharacterCount);
  var i = 0;
  parts = parts.map(str => {
    // Compress whitespace.
    // console.log("-----");
    // console.log(str);
    // console.log("-----");
    return str.replace(/\s+/g, ' ');
  }).map(str => {
    // Trim whitespace from the ends.
    return str.trim();
  });
  return Promise.resolve(parts);
};


function getSpeechByText(text, response) {
  readText(text).then(text => {
    return splitText(text);
  }).then(parts => {
    return generateSpeech(parts, null);
  }).then(tempFiles => {
    console.log("---tempFile---");
    console.log(tempFiles);
    var tempSpchMarkFiles = tempFiles.speechMarkFile;
    var tempSpchFiles = tempFiles.speechFile;
    //var stat = fs.statSync(tempFile);
    // response.writeHead(200, {
    //   'Content-Type': 'audio/mpeg',
    //   'Content-Length': stat.size
    // });
    console.log(tempSpchMarkFiles);
    fs.createReadStream(tempSpchMarkFiles).pipe(response);
    //fs.createReadStream(tempSpchFiles, { encoding: 'base64' }).pipe(response);

  }).catch(err => {
    process.stderr.write(err.stack);
  });
}

exports.getSpeechByText = getSpeechByText;
// Expose the internal functions when testing.
if (process.env.JASMINE_CONFIG_PATH) {
  exports.buildInfo = buildInfo;
  exports.callAws = callAws;
  exports.cleanup = cleanup;
  exports.combine = combine;
  exports.combineEncodedAudio = combineEncodedAudio;
  exports.combineRawAudio = combineRawAudio;
  exports.createManifest = createManifest;
  exports.createPolly = createPolly;
  exports.generateAll = generateAll;
  exports.getSpeechByText = getSpeechByText;
}