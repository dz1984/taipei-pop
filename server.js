'use strict';
var cluster = require('cluster');
var express = require('express');
var http = require('http');

if (cluster.isMaster){
    var cpuCount = require('os').cpus().length;

    for (var i =0; i < cpuCount; i += 1){
        cluster.fork();
    }

    cluster.on('online', function(worker){
        console.log('Worker ' + worker.process.pid + ' is online.');
    });

    cluster.on('exit', function(worker) {
        console.log('Worker ' + worker.process.pid + ' died.');
    });

}else {
    // load configurations
    var env = process.env.NODE_ENV || 'development';
    var config = require('./config/config');
    var envConfig = config[env];

    var app = express();

    // setting the app name
    app.set('appName', config.appName);

    // setting the env config
    app.set('envConfig', envConfig);

    // bootstrap express configurations
    require('./config/express')(app,envConfig);

    // bootstrap routes configurations
    require('./config/routes')(app,envConfig);

    http.createServer(app).listen(app.get('port'),app.get('ip'), function(){
        console.log('Express server listening on port ' + app.get('port'));
    });
}