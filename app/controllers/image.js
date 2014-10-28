'use strict';

var fs = require('fs');

exports.upload = function(req, res, next) {
    var tempPath = req.files.image.path;
    var tempName = req.files.image.name;

    var config = req.app.get('envConfig');

    fs.readFile(tempPath, function(err, data){
        var filePath = config.imagePath + '/' + tempName;
        fs.writeFile(filePath, data, function(err){
            res.send(200);
        });
    });
    res.send(200);
};

exports.handle = function (req, res, next) {
    var config = req.app.get('envConfig');
    fs.createReadStream(config.imagePath + '/' + req.params.filename).pipe(res);
};