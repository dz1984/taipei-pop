'use strict';

var pg = require('pg');
var crypto = require("crypto");
var request = require("request");

var SQLSCRIPT = 'SELECT geo_json, renew_status, renew_detail, id, upload_image FROM taipei_pop' ;

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
        'symbol': ' SIMILAR TO ',
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

    return field.toLowerCase() + _config.symbol + newValue;
};



var _makeSQLScript = function(conditions){
    var query = SQLSCRIPT;

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    console.log('SQL:' + query);

    return query;
};

var _sendJson = function(conditions, req, res){
    var config = req.app.get('envConfig');

    var sqlscript= _makeSQLScript(conditions);

    var client = new pg.Client(config.dbConnStr);

    client.connect(function(err){
        if (err) {
            return console.error('could not connect to postgres', err);    
        }

        client.query(sqlscript, function(err, result){ 
            if (err) {
                console.log('error running query', err);
                return;
            }

            var rows = result.rows;

            if (!rows) {
                res.send({});
                return;
            }

            var GeoJsonList = rows.reduce(function(a,b){
                var geojson = b.geo_json;
        
                geojson.properties['都更狀態'] = b.renew_status;
                geojson.properties.caseurl = b.renew_detail;
                geojson.properties.id = b.id;
                geojson.properties.upload_image = b.upload_image;

                return a.concat(geojson);
            },[]);

            var GeoJson = {
                "type": "FeatureCollection",
                "features": GeoJsonList
            };
            
            res.send(GeoJson);

            client.end();
        });

    });
};

exports.toSearch = function(req, res, next) {
    var config = req.app.get('envConfig');

    // catch the query string 
    var fields = Object.keys(FIELDS);

    var conditions = [];

    // the address condition
    var address = req.query.Address;

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
                _sendJson(conditions, req, res);
            }
        );
    } else {
        // catch data and send Json
        _sendJson(conditions, req, res);
    }
};

exports.downloadGeoJson = function(req, res, next) {
    var record_id = req.params.recordid;
    // TODO : find out the record and response the GeoJSON for download
    //
    console.log(record_id);

    var config = req.app.get('envConfig');

    var sqlscript= "SELECT geo_json FROM taipei_pop WHERE id='" + record_id + "'";

    var client = new pg.Client(config.dbConnStr);

    client.connect(function(err) {
         if (err) {
            return console.error('could not connect to postgres', err);

        client.query(sqlscript, function(err, result){
            if (err) {
                return console.error('error running query', err);
            }

            var rows = result.rows;

            if (!rows) {
                res.send({});
                return;
            }
            res.attachment();
            res.json(rows[0].geo_json);
            client.end();
        });
    });
};

