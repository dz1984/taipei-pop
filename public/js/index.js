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

    var BACKEND_URL = '';
    var API = BACKEND_URL + "/api/search";

    var FIELDS = ['Block','Area','Unit','Address'];

    var getAPIUrl = function(query){

        if (Object.keys(query).length > 0){
            return API + '?' + $.param(query);
        }

        return API;
    };

    var showMap = function(query) {
        var maploading = $("#map-loading");
        maploading.modal('show');

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

        $.getJSON(JsonUrl, function(GeoJSON){
            if (! $.isEmptyObject(GeoJSON)){
                var features = GeoJSON.features;
                features.forEach(function(feature){
                    map.data.addGeoJson(feature);
                });
            }

        }).always(function(){
            maploading.modal('hide');
        });

        map.data.setStyle( function(feature){
            var renew_stat = feature.getProperty("都更狀態");
            var color = 'red';
            if(!renew_stat || renew_stat.length === 0){
                color = 'yellow';
            }

            return {
                fillColor: color,
                strokeWeight: 1,
                fillOpacity: 0.2
            };
        });

        map.data.addListener('addfeature', function(event){
            var feature = event.feature;
            var upload_image = $.trim(feature.getProperty('upload_image'));

            if (upload_image === '') {
                return;
            }

            var lat = Number(feature.getProperty('ycenter'));
            var lng = Number(feature.getProperty('xcenter'));
            var latLng = new google.maps.LatLng(lat,lng);

            var icon_url = 'images/camera-icon.png';
            var icon_small_size = new google.maps.Size(15, 15);
            var icon_big_size = new google.maps.Size(20, 20);
            var small_icon = { 
                    url: icon_url,
                    scaledSize: icon_small_size,
                };
            var big_icon = $.extend({}, small_icon, {scaledSize: icon_big_size});

            var marker = new google.maps.Marker({
                position: latLng,
                map: map,
                icon: small_icon,
            });

            google.maps.event.addListener(marker, 'click', function(event){
                google.maps.event.trigger(map.data , 'click', {stop: null,latLng: latLng, feature: feature});  
            });

            google.maps.event.addListener(marker, 'mouseover', function(event){
               this.setIcon(big_icon); 
            });

            google.maps.event.addListener(marker, 'mouseout', function(event){
               this.setIcon(small_icon);
            });
        });

        map.data.addListener('mouseover', function(event){
            this.overrideStyle(event.feature, {strokeWeight: 2, fillOpacity: 1});
        });

        map.data.addListener('mouseout', function(event){
            this.overrideStyle(event.feature, {strokeWeight: 1, fillOpacity: 0.2});
        });

        map.data.addListener("click", function(event) {
            var properties = ["面積", "路段", "地號", "管理者", "使用分區"];

            var area = event.feature.getProperty('面積');
            var road = event.feature.getProperty('路段');
            var land = event.feature.getProperty('地號');
            var unit = event.feature.getProperty('管理者');
            var category = event.feature.getProperty('使用分區');

            //for urban-renew information
            var id = $.trim(event.feature.getProperty('id'));
            var caseurl = $.trim(event.feature.getProperty("caseurl"));
            var status = $.trim(event.feature.getProperty("都更狀態"));
            var upload_image = $.trim(event.feature.getProperty('upload_image'));

            var renew_tpl = '';
            var image_url = 'images/logo.png';

            if (status !== '') {
                var renew_compiled = _.template($('#renew-tpl').text());
                renew_tpl = renew_compiled({caseurl: caseurl, status: status});
            }

            if (upload_image !== '') {
                image_url = BACKEND_URL + '/u/images/' + upload_image;
            }

            var content_compiled = _.template($('#content-tpl').text());
            var content = content_compiled({
                id: id,
                road: road,
                land: land,
                area: area,
                unit: unit,
                category: category,
                image_url: image_url,
                renew_tpl: renew_tpl,
                backedn_url: BACKEND_URL
            });
            $(content).modal();

            $('#upload_form').on('submit', function() {

                $(this).ajaxSubmit({
                    success: function(response){
                        if (response.status) {
                            var img_url = BACKEND_URL + '/u/images/' + response.filenames;
                            var img = $('<img>').attr('src', img_url).attr('width','100%');
                            $('.js_upload_image').append(img);

                            event.feature.setProperty('upload_image', response.filenames);
                        }
                    },
                    error: function(response) {
                        console.log('error');
                    }
                });
                return false;
            });
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

    $('.carousel').carousel();
    $('.collapse').collapse('hide');
    $('.dropdown-toggle').dropdown();
    $('.dropdown-menu a').on('click',function(val) {
        $(".map-notice").remove();
    });
    /*
    $(".data-description").popup({
        on: 'click'
    });
    */
    FIELDS.forEach(function(field){
        var selector = $(".choice-" + field.toLowerCase() + " a");
        var jq_dropdown_button = $('#choice-' + field.toLowerCase() );
        selector.click(function(){
          var val = $(this).attr("data-value");
          search.set(field, val);
          jq_dropdown_button.text($(this).text());
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
                    updateAddress( e, true );
                }, 10000 );
            }
        };

    jqAddress.mousedown( updateAddress );

    var clickEvent = false;

    $('#carousel-home').on('click','.nav a', function () {
        clickEvent = true;
        $('#carousel-home .nav li').removeClass('active');
        $(this).parent().addClass('active');
    }).on('slide.bs.carousel', function (e) {
        if (!clickEvent) {
            var count = $('#carousel-home .nav').children().length - 1;
            var current = $('#carousel-home .nav li.active');
            current.removeClass('active').next().addClass('active');
            var id = parseInt(current.data('slide-to'));
            if (count == id) {
                $('#carousel-home .nav li').first().addClass('active');
            }
        }
        clickEvent = false;
    });
})();