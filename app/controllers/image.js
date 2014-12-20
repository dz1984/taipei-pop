'use strict';

var path = require('path');
var fs = require('fs');
var pg = require('pg');

exports.upload = function(req, res, next) {
    var tempPath = req.files.image.path;
    var extName = path.extname(req.files.image.name);
    var id = req.body.id;
    var fileName = id + extName;

    var config = req.app.get('envConfig');

    fs.readFile(tempPath, function(err, data){
        var filePath = config.imagePath + '/' + fileName;
        fs.writeFile(filePath, data);

        // update the record
        var client = new pg.Client(config.dbConnStr);
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

        res.send({status: 1, filenames: fileName});
    });
};

exports.handle = function (req, res, next) {
    var config = req.app.get('envConfig');
    fs.createReadStream(config.imagePath + '/' + req.params.filename).pipe(res);
};

exports.exposure = function(req, res, next) {
    var config = req.app.get('envConfig');

    var id = req.query.id;
    
    var client = new pg.Client(config.dbConnStr);
    var sqlscript = "INSERT INTO exposure_log (pop_id, create_at) VALUES ('"+ id + "', NOW())";

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

    fs.createReadStream(config.dataPath + '/exposure.png').pipe(res);
};