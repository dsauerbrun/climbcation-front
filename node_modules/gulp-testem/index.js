/*jshint node:true */

'use strict';

var gutil = require('gulp-util');
var c = gutil.colors;
var es = require('event-stream');
var extend = require('xtend');
var path = require('path');
var spawn = require('child_process').spawn;

var testemApi = require('testem');

var testemPlugin = function(options) {
  var child;
  var stream;
  var files = [];

  options = extend({
    action: 'run'
  }, options);

  if (options.configFile) {
    options.configFile = path.resolve(options.configFile);
  }

  function done(code) {
    // Stop the server if it's running
    if (child) {
      child.kill();
    }

    // End the stream if it exists
    if (stream) {
      stream.emit('end');
    }
  }

  function startTestemServer() {
    gutil.log('Starting Testem server...');

    // Start the server
    child = spawn(
      'node',
      [
        path.join(__dirname, 'lib', 'background.js'),
        JSON.stringify(options)
      ],
      {
        stdio: 'inherit'
      }
    );

    // Cleanup when the child process exits
    child.on('exit', function() {
      // gutil.log('Testem child process ended');
      done();
    });
  }

  function queueFile(file) {
    if (file) {
      // gutil.log('Queueing file '+file.path);
      files.push(file.path);
    }
    else {
      stream.emit('error', new Error('Got undefined file'));
    }
  }

  function endStream() {
    // Override files if they were piped
    // This doesn't work with the runner, but works fine with singleRun and autoWatch
    if (files.length) {
      options.files = files;
    }

    // Start the server
    // If options.singleRun: Server starts, tests run, task completes
    // If options.background: Server starts, tests run, files watched
    startTestemServer();
  }

  stream = es.through(queueFile, endStream);

  return stream;
};

module.exports = testemPlugin;
