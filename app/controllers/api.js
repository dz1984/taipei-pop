'use strict';

var crypto = require("crypto");
var request = require("request");
var google = require('googleapis');
var Cache = require("ds-cache");
var OAuth2 = google.auth.OAuth2;

var fusiontables = google.fusiontables('v1');

var API_KEY = 'YOUR_GOOGLE_API_KEY';
var TABLENAME = 'YOUR_FUSION_TABLE_ID';

var SQLSCRIPT = 'SELECT GeoJson FROM ' + TABLENAME;

var GEOCODEAPI_URL = "http://maps.googleapis.com/maps/api/geocode/json?address=";

var RADIUS = 1000;

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

var _getCache  = function(config) {

    if (!config.enableCache) {
        return null;
    }

    var cachePath = config.cachePath;
    var cache = new Cache(
        {
            limit_bytes: '30M',
            filename : cachePath + "/ds.json",
            auto_save: true
        }
    );

    return cache;
};

var _makeParams = function(conditions){
    var query = SQLSCRIPT;

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    console.log('SQL:' + query);

    var params = {
        'sql': query,
        'key': API_KEY
    };

    return params;

};

var _sendJson = function(conditions, res, hashid, cache){
    var params = _makeParams(conditions);

    fusiontables.query.sqlGet(params, function(err, result) {
        
        if (err){
            console.log(err);
            return;
        }

        var rows = result.rows;

        if (!rows) {
            res.send({});
            return;
        }

        var GeoJsonList = rows.reduce(function(a,b){
            return a.concat(JSON.parse(b));
        },[]);

        var GeoJson = {
            "type": "FeatureCollection",
            "features": GeoJsonList
        };

        if (cache) {
            cache.set(hashid, GeoJson);
        }

        res.send(GeoJson);
    });
};

var cacheInfo = function(req, res, next) {
    var config = req.app.get('envConfig');
    var cache = _getCache(config);

    if (!cache){
        res.send({});
        return;
    }

    var size = cache.size();
    var content_length = cache.content().length;

    var info = {
        size: size,
        length: content_length
    };

    res.send(info);
};

var cacheClear = function(req, res, next) {
    var config = req.app.get('envConfig');
    var cache = _getCache(config);
    
    if (!cache){
        res.send({});
        return;
    }

    cache.clear();
    
    res.send(200);
};

exports.toSearch = function(req, res, next) {
    var config = req.app.get('envConfig');
    var hashid = _generateHashId(req.query);

    var cache = _getCache(config);

    if (cache) {	
        var resultRow = cache.get(hashid);
	    
        if (resultRow){
            res.send(resultRow);
            return;
        }
    }

    // catch the query string 
    var fields = Object.keys(FIELDS);

    var conditions = [];

    // the address condition
    var address = req.query['Address'];

    console.log('Query String: ' + JSON.stringify(req.query));

    fields.forEach(function(field){
        var value = req.query[field];

        if (value && value !== ''){
            // only choose one, Block or Address. But Address always win if they appear at same time.
            if (!(field === 'Block' && address && address !== '' )){
                conditions.push(_makeCondition(field, value));
            }
        }
    });


    if (address && address !== '') {
        // the address translate to the location with latitude and longitude 
        request(
            {
                "url": GEOCODEAPI_URL + address,
                "json": true
            },
            function(err, response, body){

                if (!err) {
                    var location = body.results[0].geometry.location;
                    var lat = location.lat;
                    var lng = location.lng;
                    
                    // add the address condition
                    var addr_condition = "ST_INTERSECTS(Locations,CIRCLE(LATLNG("+ lat + ","+ lng + ")," + RADIUS + "))";
                    console.log('Address condition: ' + addr_condition);
                    
                    conditions.push(addr_condition);
                }
                _sendJson(conditions, res, hashid, cache);
            }
        );
    } else {
        // catch data and send Json
        _sendJson(conditions, res, hashid, cache);
    }
};

exports.handleClear = function( req, res, next ) {
    var action = req.params.action;
        
    // execute the action function
    switch(action) {
        case 'info':
            cacheInfo(req, res, next);
            break;
        case 'clear':
            cacheClear(req, res, next);
            break;
        default:
            res.send({});
        }
    return;
};

