$(document).ready(function() {
  // Set up some basics
  var config = {};

  var baseurl;
  
  // 'search by area' enables drawing new bbox
  var drawbox = false;
  
  // Set up the map
  map = new OpenLayers.Map('bboxmap', 
                           {projection: "EPSG:900913",});  
  // We'll use these projections in our functions later
  var goog =  new OpenLayers.Projection("EPSG:900913");
  var latlon = new OpenLayers.Projection("EPSG:4326");

  var outofboundscheck = function(coord,lat_or_lon) {
    var bounds_min = 0;
    var bounds_max = 0;
    if (lat_or_lon == "lat") {
      bounds_min = -90;
      bounds_max = 90;
    }
    if (lat_or_lon == "lon") {
      bounds_min = -180;
      bounds_max = 180;
    }
    if ((bounds_min==0)&&(bounds_max==0)) { return null; }
    if (coord < bounds_min) { coord = bounds_min; }
    if (coord > bounds_max) { coord = bounds_max; }
    return coord;
  };

  var bboxVectors = new OpenLayers.Layer.Vector("Bounding Box", {});
  map.addLayer(bboxVectors);

  bboxControl = OpenLayers.Class(OpenLayers.Control, {
    handleRightClicks: false, // should be true if you use CTRL key
    autoActivate: true,
    draw: function() {
        this.box = new OpenLayers.Handler.Box( this,
            {"done": this.notice},
            {keyMask: this.keyMask});
        this.box.boxDivClassName = "olBBOXselect";
        if (this.handleRightClicks) {
          this.map.viewPortDiv.oncontextmenu = OpenLayers.Function.False;
        }
        if (this.autoActivate) {
          this.box.activate();
        }
    },
    notice: function(bounds) {
      if (drawbox) {
        var ll = map.getLonLatFromPixel(new OpenLayers.Pixel(bounds.left, bounds.bottom)); 
        var ur = map.getLonLatFromPixel(new OpenLayers.Pixel(bounds.right, bounds.top)); 
        var llLat = ll.transform(map.getProjectionObject(), latlon);
        var urLat = ur.transform(map.getProjectionObject(), latlon);
        $('#bbox_left').val(outofboundscheck(llLat.lon.toFixed(5),'lon'));
        $('#bbox_bottom').val(outofboundscheck(llLat.lat.toFixed(5),'lat'));
        $('#bbox_right').val(outofboundscheck(urLat.lon.toFixed(5),'lon'));
        $('#bbox_top').val(outofboundscheck(urLat.lat.toFixed(5),'lat'));
        update_bbox();
        update_results();
      }
    },
    deactivate: function() {
      this.box.deactivate();
    },
    activate: function() {
      this.box.activate();
    }
  });
  
  var bboxKeyControl = new bboxControl({handleRightClicks:true, keyMask: OpenLayers.Handler.MOD_CTRL});
  map.addControl(bboxKeyControl);

  var bboxToggleControl = new bboxControl();
  map.addControl(bboxToggleControl);
  bboxToggleControl.deactivate();

  // Function to return proper tag search string
  var tagsearch = function() {
    if($("#searchbytag").is(':checked')) {
      t = $('#element').val() + '[' + $('#tag').val() + ']';
    }
    else { t = ""; };
    return t;
  };

  // Function to return a bbox string
  var bbox = function() {
    var b = 'bbox=' + $('#bbox_left').val() + ',' + $('#bbox_bottom').val() +
      ',' + $('#bbox_right').val() + ',' + $('#bbox_top').val();
    return b;
  }

  // Update the bbox from the text to the map
  var update_bbox = function() {
    var bounds = new OpenLayers.Bounds( parseFloat($('#bbox_left').val()),
                                        parseFloat($('#bbox_bottom').val()),
                                        parseFloat($('#bbox_right').val()),
                                        parseFloat($('#bbox_top').val()));
    bounds.transform(latlon, goog);
    
    var bboxGeom = bounds.toGeometry();
    bboxVectors.removeAllFeatures();
    bboxVectors.addFeatures([new OpenLayers.Feature.Vector(bboxGeom)]);

    $('#bboxNone').attr('checked','true');
    bboxToggleControl.deactivate();
  };

  // Draw BBOX wihle toggle is activated
  $('#bboxNone').click(function() {
    bboxToggleControl.deactivate(); });
  $('#bboxToggle').click(function() {
    bboxToggleControl.activate(); });

  // Function to update the display on the page  
  var update_results = function() {
    var results = baseurl + '/' ;
    if ($('#searchbytag').is(':checked')) {
      results = results + tagsearch();
      if ($('#searchbybbox').is(':checked')) {
        results = results + '[' + bbox() + ']'; };
    }
    else {
      if ($('#searchbybbox').is(':checked')) {
        results = results + 'map?' + bbox(); }
    };
    $('#results').text(results);
    $('#results').attr('href', results);
  };

  // Set up some UI element functions
  $("#searchbytag").click(function() {
    if ( $(this).is(':checked') ) {
      $('#tag').removeAttr('disabled');
      $('#element').removeAttr('disabled');
    }
    else {
      $('#tag').attr('disabled', 'disabled');
      $('#element').attr('disabled', 'disabled');
    };
    update_results();
  });

  $('#element').change(function() {
    update_results(); });
  
  $('#tag').keyup(function() {
    update_results(); });

  $('#searchbybbox').click(function() {
    if ( $(this).is(':checked')) {
      $('#bbox_top').removeAttr('disabled');
      $('#bbox_bottom').removeAttr('disabled');
      $('#bbox_left').removeAttr('disabled');
      $('#bbox_right').removeAttr('disabled');
      $('#bboxNone').removeAttr('disabled');
      $('#bboxToggle').removeAttr('disabled');
      drawbox = true;
    }
    else {
      $('#bbox_top').attr('disabled', 'disabled');
      $('#bbox_bottom').attr('disabled', 'disabled');
      $('#bbox_left').attr('disabled', 'disabled');
      $('#bbox_right').attr('disabled', 'disabled');
      $('#bboxNone').attr('disabled', 'disabled');
      $('#bboxToggle').attr('disabled', 'disabled');
      drawbox = false;
    };
    update_results();
  });

  $('#bbox_top').change(function() {
    update_bbox();
    update_results();});
  $('#bbox_bottom').change(function() {
    update_bbox();
    update_results();});
  $('#bbox_left').change(function() {
    update_bbox();
    update_results();});
  $('#bbox_right').change(function() {
    update_bbox();
    update_results();});

  $.getJSON("config.json", function(json) {
    baseurl = json.baseurl;
    tileurl = json.tileurl;
    document.title = json.title;
    $('#title').text(json.title);
    attribution = json.attribution;
    
    var osm = new OpenLayers.Layer.OSM("bboxmap",
                                       tileurl + "${z}/${x}/${y}.png",
                                       {attribution: ''});
    $('#attribution').text(attribution);
    map.addLayer(osm);
    map.zoomTo(1);
    update_results();
  });

});
