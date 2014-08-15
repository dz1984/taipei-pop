'use strict';


exports.index = function(req, res){
    res.render('index', { 
        title: req.app.get("appName")
    });
};
