(function() {

    var taipei = {
    "中正區": {
      lat: 25.0293008,
      lng: 121.5205833
    },
    "大同區": {
      lat: 25.0645027,
      lng: 121.513314
    },
    "中山區": {
      lat: 25.0685028,
      lng: 121.5456014
    },
    "萬華區": {
      lat: 25.0294936,
      lng: 121.4978838
    },
    "信義區": {
      lat: 25.0287142,
      lng: 121.5723162
    },
    "松山區": {
      lat: 25.0601727,
      lng: 121.5593073
    },
    "大安區": {
      lat: 25.0263074,
      lng: 121.543846
    },
    "南港區": {
      lat: 25.038392,
      lng: 121.6219879
    },
    "北投區": {
      lat: 25.1531486,
      lng: 121.5174287
    },
    "內湖區": {
      lat: 25.0835016,
      lng: 121.5903754
    },
    "士林區": {
      lat: 25.1347802,
      lng: 121.5324453
    },
    "文山區": {
      lat: 24.9880073,
      lng: 121.5752716
    }
    };

    var API = "/api/search";

    var FIELDS = ['Block','Area','Unit','Address'];

    var getAPIUrl = function(query){

        if (Object.keys(query).length > 0){
            return API + '?' + $.param(query);
        }

        return API;
    };

    var showMap = function(query) {
        var maploading = $("#map-loading");
        maploading.addClass('active');
       
        var block = search.get('Block');

        if (block === undefined ||  block === ''){
            block = '中正區';
        }

        var lat = taipei[block].lat;
        var lng = taipei[block].lng;

        var popinfo = new google.maps.InfoWindow();
        var map = new google.maps.Map(document.getElementById("map-canvas"), {
          zoom: 15,
          scrollwheel: false,
          center: {
            lat: lat,
            lng: lng
          }
        });

        var JsonUrl = getAPIUrl(query);
        console.log("JSON URL: " + JsonUrl);

        $.getJSON(JsonUrl, function(GeoJSON){
            if (! $.isEmptyObject(GeoJSON)){
                var features = GeoJSON.features;
                features.forEach(function(feature){
                    map.data.addGeoJson(feature);
                });
            }
            
        }).always(function(){
            maploading.removeClass('active');
        });

        var featureStyle = {
          fillColor: "red",
          strokeWeight: 1
        };

        map.data.setStyle(featureStyle);

        map.data.addListener("click", function(event) {
            var properties = ["面積", "路段", "地號", "管理者", "使用分區"];
            var content = "<table class='ui table segment'>";

            properties.forEach(function(element, index, array) {
                var property = event.feature.getProperty(element);
                if (element === "面積"){
                  property += " 平方公尺";  
                }
                content += "<tr><td>" + element + "</td><td>" + property + "</td></tr>";
            });

            content += "</table>";
            popinfo.close();
            popinfo.setContent(content);
            popinfo.setPosition(event.latLng);
            popinfo.open(map);
        });
    };

    var Search = function() {
        this.vars = {};
    };

    Search.prototype.set = function(key,val) {
        this.vars[key] = val;
        this.run();
    };
    Search.prototype.get = function(key) {
        var val = this.vars[key];
        
        return val;
    };

    Search.prototype.run = function() {
        var vars = this.vars;
        var query = {};

        FIELDS.forEach(function (field) {
            if (vars[field]){
                query[field] = vars[field];
            }
        });

        if( vars.Address && vars.Block ) {
            delete query.Block;
        }

        showMap(query);
    };

    var search = new Search();

    $(".dropdown").dropdown({
      onChange: function(val) {
        $(".map-notice").remove();
        $("#map-canvas").css('display','table-row');
      }
    });

    $(".data-description").popup({
        on: 'click'
    });

    FIELDS.forEach(function(field){
        var selector = $(".choice-" + field.toLowerCase() + " a");

        selector.click(function(){
          var val;
          val = $(this).attr("data-value");
          search.set(field, val);
        });

    });

    var jqAddress = $('#input-address'),
        updateAddressTimer = null,
        updateAddress = function( e, doUpdate ) {

            if( doUpdate ) {
                updateAddressTimer = null;
                search.set( 'Address', jqAddress.val() );
            } else {
                clearTimeout( updateAddressTimer );
                updateAddressTimer = setTimeout( function() {
                    updateAddress( e, true )
                }, 10000 );
            }
        }

    jqAddress.mousedown( updateAddress );

})();
