'use strict';

var path = require('path');
var rootPath = path.normalize(__dirname + '/..');


module.exports = {
    appName: '天龍特公地',

    development: {
        port: process.env.PORT || '8089',
        ip: process.env.IP || '0.0.0.0',
        hostname: process.env.DNS || 'localhost',
        root: rootPath,
        viewPath: rootPath + '/app/views',
        staticPath: rootPath + '/public',
        dataPath: rootPath + '/data',
        uploadPath: rootPath + '/upload',
        imagePath: rootPath + '/upload/images',
        cachePath: rootPath + '/cache',
        viewEngine: 'jade',
        enableCache: false,
        dbConnStr: "postgres://PG_USER:PG_PWD@127.0.0.1/PG_DB",
    },

    test: {
    },

    production:{
    }
};
