'use strict';

var path = require('path');
var fs = require('fs');
var pg = require('pg');

var PG_CONNECT_STRING = "postgres://PG_USER:PG_PWD@127.0.0.1/PG_DB";

exports.upload = function(req, res, next) {
    var tempPath = req.files.image.path;
    var extName = path.extname(req.files.image.name);
    var id = req.body.id;
    var fileName = id + extName;

    var config = req.app.get('envConfig');

    fs.readFile(tempPath, function(err, data){
        var filePath = config.imagePath + '/' + fileName;
        fs.writeFile(filePath, data, function(err){
            if (err) {
                console.log('could not upload the image', err);
            }

        });

        // update the record
        var client = new pg.Client(PG_CONNECT_STRING);
        var sqlscript = "UPDATE taipei_pop SET upload_image = '" + fileName + "' WHERE id ='" + id + "'";

        console.log(sqlscript);

        client.connect(function(err){
            if (err) {
                return console.error('could not connect to postgres', err);    
            }

            client.query(sqlscript, function(err, result){ 
                if (err) {
                    console.log('error running query', err);
                    return;
                }                
                client.end();
            });
        });

    });
    res.send(200);
};

exports.handle = function (req, res, next) {
    var config = req.app.get('envConfig');
    fs.createReadStream(config.imagePath + '/' + req.params.filename).pipe(res);
};