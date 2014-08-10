'use strict';

var crypto = require("crypto");
var google = require('googleapis');

var OAuth2 = google.auth.OAuth2;

var fusiontables = google.fusiontables('v1');

var DS = require("ds").DS;

var API_KEY = 'YOUR_GOOGLE_API_KEY';
var TABLENAME = 'YOUR_FUSION_TABLE_ID';

var SQLSCRIPT = 'SELECT GeoJson FROM ' + TABLENAME;

var FIELDS = 
{
    'Block': {
        'symbol': ' = ',
        'isStr': true
    },
    'Area': {
        'symbol': '',
        'isStr': false
    },
    'Unit': {
        'symbol': ' LIKE ',
        'isStr': true
    }
};

var _str = function(text) {
    if (text){
        return "'" + text + "'";
    }
};

var _expandValue = function(key, val){
    var AND_KEYWORD = 'AND';
    var returnVal = val;

    if (val.indexOf(AND_KEYWORD)){
        returnVal = val.split(AND_KEYWORD).map(function(val, index){
            if (index === 0) {
                return val;
            }
            return key + val;
        }).join(' AND ');
    }
    return returnVal;
};

var _makeCondition = function(field, value){
    var _config = FIELDS[field];
    
    var newValue = _expandValue(field, value);

    if (_config.isStr){
        newValue = _str(newValue);
    }

    return field + _config.symbol + newValue;
};

var _generateHashId = function(query) {
    var md5 = crypto.createHash('md5');
    var query_string = JSON.stringify(query);

    return md5.update(query_string).digest('hex');
};

exports.clearCache = function(req, res, next) {
    var cachePath = req.app.get('envConfig').cachePath;
    var ds = new DS( cachePath + "/ds.json");

    ds.clear();
    ds.save();
    
    res.send(200);
};

exports.toSearch = function(req, res, next) {
    // catch the query string 
    var fields = Object.keys(FIELDS);

    var conditions = [];

    console.log('Query String: ' + JSON.stringify(req.query));
    fields.forEach(function(field){
        var value = req.query[field];

        if (value && value !== ''){
            conditions.push(_makeCondition(field, value));
        }
    });

    var query = SQLSCRIPT;

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    console.log('SQL:' + query);

    var hashid = _generateHashId(req.query);

    var cachePath = req.app.get('envConfig').cachePath;
    var ds = new DS( cachePath + "/ds.json");

    var resultRow = ds[hashid];

    if (resultRow){
        res.send(resultRow);
    } else {
        var params = {
            'sql': query,
            'key': API_KEY
        };

        fusiontables.query.sqlGet(params, function(err, result) {
            
            if (err){
                console.log(err);
            }

            var rows = result.rows;
  
            if (!rows) {
                res.send({});
            }

            var GeoJsonList = rows.reduce(function(a,b){
                return a.concat(JSON.parse(b));
            },[]);

            var GeoJson = {
                "type": "FeatureCollection",
                "features": GeoJsonList
            };

            ds[hashid] = GeoJson;
            ds.save();
            
            res.send(GeoJson);
        });
    }
};




