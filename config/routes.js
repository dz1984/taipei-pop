'use strict';

var main = require('../app/controllers/main');
var api = require('../app/controllers/api');

module.exports = function(app,config){

    app.get('/api/search', api.toSearch);
    app.get('/',main.index);

};
