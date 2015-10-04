/* map-tools.js 2.0.1 MIT License. 2015 Yago Ferrer <yago.ferrer@gmail.com> */
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.mapTools = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/// <reference path="typings/tsd.d.ts"/>
var topojson = require('topojson');
var utils = require('./utils');
var addFilter = require('./addFilter');
var AddFeature = (function () {
    function AddFeature(that) {
        this.that = that;
        var addFilterInstance = new addFilter(that, 'json');
        this.addFilter = function (filters) {
            return addFilterInstance.addFilter(filters);
        };
    }
    /**
     * Adds GeoJSON Feature Options like: style
     * @param features
     * @param options
     * @private
     */
    AddFeature.prototype.addFeatureOptions = function (features, options) {
        var feature, x;
        for (x in features) {
            if (features.hasOwnProperty(x)) {
                feature = features[x];
                var uid = utils.createUid();
                feature.uid = uid;
                feature.data = { uid: uid };
                feature.forEachProperty(function (value, key) {
                    feature.data[key] = value;
                });
                if (options) {
                    if (options.filters) {
                        // Add filters if not defined.
                        if (!this.that.json.filter) {
                            this.addFilter(options.filters);
                        }
                        this.that.json.crossfilter.add([feature]);
                    }
                    if (options.style) {
                        this.that.instance.data.overrideStyle(feature, options.style);
                    }
                }
                this.that.json.all[feature.data.uid] = feature;
            }
        }
    };
    /**
     * Adds a Topo JSON file into a Map
     * @param data The parsed JSON File
     * @param options
     */
    AddFeature.prototype.addTopoJson = function (data, options) {
        var item, geoJson, features, x;
        for (x in options) {
            if (options.hasOwnProperty(x)) {
                item = options[x];
                geoJson = topojson.feature(data, data.objects[item.object]);
                features = this.that.instance.data.addGeoJson(geoJson);
                this.addFeatureOptions(features, item);
                mapTools.maps[this.that.id].json.all[item.object] = features;
            }
        }
        return features;
    };
    AddFeature.prototype.addGeoJson = function (data, options) {
        var features = this.that.instance.data.addGeoJson(data, options);
        this.addFeatureOptions(features, options);
        return features;
    };
    return AddFeature;
})();
module.exports = AddFeature;

},{"./addFilter":2,"./utils":20,"topojson":23}],2:[function(require,module,exports){
/// <reference path="typings/tsd.d.ts"/>
var utils = require('./utils');
var AddFilter = (function () {
    function AddFilter(that, type) {
        this.that = that;
        this.type = type;
    }
    AddFilter.prototype.addFilter = function (filters) {
        this.that[this.type].crossfilter = this.that[this.type].crossfilter || this.that.crossfilter([]);
        this.that[this.type].filter = this.that[this.type].filter || {};
        var dimension, item;
        if (typeof filters === 'string') {
            filters = [filters];
        }
        for (dimension in filters) {
            if (filters.hasOwnProperty(dimension)) {
                item = filters[dimension];
                if (typeof item === 'string') {
                    this.that[this.type].filter[item] = this.that[this.type].crossfilter.dimension(utils.defaultDimension(item));
                }
                else {
                    this.that[this.type].filter[Object.keys(item)[0]] = this.that[this.type].crossfilter.dimension(item[Object.keys(item)[0]]);
                }
            }
        }
    };
    return AddFilter;
})();
module.exports = AddFilter;

},{"./utils":20}],3:[function(require,module,exports){
/// <reference path="typings/tsd.d.ts"/>
var maps = require('./maps');
var config = require('./config');
var AddMap = (function () {
    function AddMap(that) {
        this.that = that;
    }
    AddMap.prototype.getElement = function (args) {
        if (args.el) {
            return window.document.querySelector(args.el);
        }
        if (args.id) {
            return window.document.getElementById(args.id);
        }
    };
    AddMap.prototype.create = function (args, cb) {
        var _this = this;
        cb = cb || function () {
        };
        var mapOptions = maps.mapOptions(args);
        args.id = args.id || args.el.substring(1);
        this.that.id = args.id;
        this.that.options = args;
        this.that.instance = new google.maps.Map(this.getElement(args), mapOptions);
        this.that.events = [];
        // Add Events
        if (args.on) {
            var i;
            for (i in args.on) {
                if (args.on.hasOwnProperty(i)) {
                    if (config.customEvents.indexOf(i) > -1) {
                        this.that.events.push(i);
                    }
                    google.maps.event.addListener(this.that.instance, i, args.on[i]);
                }
            }
        }
        this.that.infoWindow = false;
        this.that.templates = {
            infoWindow: {},
            panel: {}
        };
        this.that.uid = args.uid;
        mapTools.maps[this.that.id].instance = this.that.instance;
        google.maps.event.addListenerOnce(this.that.instance, 'idle', function () {
            cb(false, _this.that);
        });
    };
    AddMap.prototype.validOptions = function (options, cb) {
        if (!options || (options && typeof options !== 'object')) {
            cb(new Error('You must pass a valid first parameter: options'));
            return false;
        }
        if (!options.id && !options.el) {
            cb(new Error('You must pass an "id" or a "el" property values'));
            return false;
        }
        if (!options.lat || !options.lng) {
            cb(new Error('You must pass valid "lat" (latitude) and "lng" (longitude) values'));
            return false;
        }
        return true;
    };
    AddMap.prototype.load = function (options, cb) {
        if (this.validOptions(options, cb)) {
            var id = options.id || options.el.substring(1);
            mapTools.maps = mapTools.maps || {};
            if (mapTools.maps[id]) {
                var msg = 'There is already another Map using the same id: ' + id;
                cb(new Error(msg));
                return false;
            }
            var that = this;
            mapTools.maps[id] = {
                create: function () {
                    that.create(this.arguments, cb);
                },
                arguments: options
            };
            // Set Global Structure
            mapTools.maps[id].markers = mapTools.maps[id].markers || { all: {}, tags: {}, dataChanged: false };
            mapTools.maps[id].json = mapTools.maps[id].json || { all: {}, dataChanged: false };
            this.that.markers = mapTools.maps[id].markers;
            this.that.json = mapTools.maps[id].json;
            if (options.async !== false || options.sync === true) {
                maps.load(id, options);
            }
            else {
                mapTools.maps[id].create();
            }
        }
    };
    return AddMap;
})();
module.exports = AddMap;

},{"./config":7,"./maps":13}],4:[function(require,module,exports){
/// <reference path="typings/tsd.d.ts"/>
var utils = require('./utils');
var addFilter = require('./addFilter');
var infoWindow = require('./infoWindow');
var AddMarker = (function () {
    function AddMarker(that) {
        this.that = that;
        this.infoWindow = {};
        var addFilterInstance = new addFilter(that, 'markers');
        this.addFilter = function (filters) {
            return addFilterInstance.addFilter(filters);
        };
        var infoWindowInstance = new infoWindow(that);
        this.infoWindow.addEvents = function (marker, options, map) {
            infoWindowInstance.addEvents(marker, options, map);
        };
    }
    AddMarker.prototype.addExtraOptions = function (marker, options) {
        var i;
        for (i in options) {
            if (options.hasOwnProperty(i)) {
                if (!options.filters) {
                    marker[i] = options[i];
                }
            }
        }
    };
    AddMarker.prototype.addOptions = function (marker, instance) {
        if (marker.move) {
            instance.setAnimation(google.maps.Animation[marker.move.toUpperCase()]);
        }
        if (marker.infoWindow) {
            this.infoWindow.addEvents(instance, marker.infoWindow, this.that.instance);
        }
        if (marker.on) {
            this.addEvents(marker, instance);
        }
        if (marker.callback) {
            marker.callback(instance);
        }
    };
    AddMarker.prototype._addMarker = function (marker, options) {
        marker.map = this.that.instance;
        marker.position = new google.maps.LatLng(marker.lat, marker.lng);
        // Adds options set via 2nd parameter. Overwrites any Marker options already set.
        if (options) {
            this.addExtraOptions(marker, options);
        }
        marker.data = marker.data || {};
        marker.data._self = marker; // This helps me to do later resetMarker()
        this.setUid(marker);
        // Because we are not allowing duplicates
        if (this.that.markers.all[marker.uid]) {
            return false;
        }
        if (options && options.filters) {
            // Only add filters if not defined.
            if (!mapTools.maps[this.that.id].markers.filter) {
                this.addFilter(options.filters);
            }
        }
        var instance = new google.maps.Marker(marker);
        this.that.markers.crossfilter = this.that.markers.crossfilter || this.that.crossfilter([]);
        this.that.markers.filter = this.that.markers.filter || {};
        this.that.markers.crossfilter.add([instance]);
        this.addOptions(marker, instance);
        // Adds Marker Reference of each Marker to "markers.all"
        this.that.markers.all = mapTools.maps[this.that.id].markers.all || {};
        this.that.markers.all[marker.uid] = instance;
        if (marker.tags) {
            this.addMarkerByTag(marker, instance);
        }
        return instance;
    };
    AddMarker.prototype.setUid = function (marker) {
        if (this.that.uid && marker[this.that.uid]) {
            marker.data.uid = marker[this.that.uid];
            marker.uid = marker.data.uid;
        }
        if (marker.data.uid && !marker.uid) {
            marker.uid = marker.data.uid;
        }
        if (!marker.uid) {
            marker.data.uid = utils.createUid();
            marker.uid = marker.data.uid;
        }
    };
    AddMarker.prototype.addMarkerByTag = function (marker, instance) {
        if (utils.isArray(marker.tags)) {
            var i, tag;
            for (i in marker.tags) {
                if (marker.tags.hasOwnProperty(i)) {
                    tag = marker.tags[i];
                    this.that.markers.tags[tag] = this.that.markers.tags[tag] || {};
                    this.that.markers.tags[tag][instance.data.uid] = instance;
                }
            }
        }
        else {
            this.that.markers.tags[marker.tags] = this.that.markers.tags[marker.tags] || {};
            this.that.markers.tags[marker.tags][instance.data.uid] = instance;
        }
    };
    AddMarker.prototype.addEvents = function (marker, instance) {
        var i;
        for (i in marker.on) {
            if (marker.on.hasOwnProperty(i)) {
                google.maps.event.addListener(instance, i, marker.on[i]);
            }
        }
    };
    /**
     * Adds Markers to the Map
     * @param args Array or Markers
     * @param options things like groups etc
     * @returns {Array} all the instances of the markers.
     */
    AddMarker.prototype.addMarker = function (args, options) {
        if (utils.isArray(args)) {
            if (args.length >= 1) {
                var marker, markers = [];
                for (var i in args) {
                    if (args.hasOwnProperty(i)) {
                        marker = this._addMarker(args[i], options);
                        markers.push(marker);
                    }
                }
                this.that.markers.dataChanged = true;
                return markers;
            }
            return [];
        }
        this.that.markers.dataChanged = true;
        return this._addMarker(args, options);
    };
    return AddMarker;
})();
module.exports = AddMarker;

},{"./addFilter":2,"./infoWindow":10,"./utils":20}],5:[function(require,module,exports){
/// <reference path="template.ts"/>
/// <reference path="config.ts"/>
/// <reference path="typings/tsd.d.ts"/>
var config = require('./config');
var template = require('./template');
var AddPanel = (function () {
    function AddPanel(that) {
        this.that = that;
        var templateInstance = new template(that);
        this.template = function (type, url, cb) {
            return templateInstance.load(type, url, cb);
        };
    }
    AddPanel.prototype.getPositionKey = function (pos) {
        return pos.toUpperCase().match(/\S+/g).join('_');
    };
    AddPanel.prototype.hy2cmml = function (k) {
        return k.replace(/-(.)/g, function (m, g) {
            return g.toUpperCase();
        });
    };
    AddPanel.prototype.HTMLParser = function (aHTMLString) {
        var container = window.document.createElement('div');
        container.innerHTML = aHTMLString;
        return container;
    };
    AddPanel.prototype.onSuccess = function (options, position, panel, cb) {
        var e, rule;
        // positioning options
        if (options.position) {
            // convert to google ControlPosition map position keys
            options.position = this.getPositionKey(options.position);
            position = google.maps.ControlPosition[options.position];
        }
        // style options
        if (typeof options.style === 'object') {
            for (rule in options.style) {
                if (options.style.hasOwnProperty(rule)) {
                    var ruleKey = this.hy2cmml(rule);
                    panel.style[ruleKey] = options.style[rule];
                }
            }
        }
        // event handler
        if (options.events) {
            for (e in options.events) {
                if (options.events.hasOwnProperty(e)) {
                    var keys = e.match(/\S+/g);
                    var event = keys.splice(-1); //event type
                    var selector = keys.join(' '); // selector string
                    var elements = panel.querySelectorAll(selector);
                    [].forEach.call(elements, function (elm) {
                        google.maps.event.addDomListener(elm, event, options.events[e]);
                    });
                }
            }
        }
        this.that.instance.controls[position].push(panel);
        this.that.panels = this.that.panels || {};
        this.that.panels[position] = panel;
        cb(false, panel);
    };
    AddPanel.prototype.addPanel = function (options, cb) {
        var _this = this;
        cb = cb || function () {
        };
        var position, panel;
        // default position
        options.position = options.position || config.panelPosition;
        if (options.templateURL) {
            this.template('panel', options.templateURL, function (err, response) {
                if (!err) {
                    panel = _this.HTMLParser(response);
                    return _this.onSuccess(options, position, panel, cb);
                }
                else {
                    cb(err);
                    return false;
                }
            });
        }
        else {
            if (typeof options.template === 'string') {
                panel = this.HTMLParser(options.template);
            }
            else {
                panel = options.template;
            }
            this.onSuccess(options, position, panel, cb);
        }
    };
    return AddPanel;
})();
module.exports = AddPanel;

},{"./config":7,"./template":16}],6:[function(require,module,exports){
/// <reference path="typings/tsd.d.ts"/>
var Center = (function () {
    function Center() {
    }
    Center.prototype.pos = function (lat, lng) {
        var position;
        if (lat && lng) {
            position = new google.maps.LatLng(lat, lng);
        }
        else {
            position = new google.maps.LatLng(this.options.lat, this.options.lng);
        }
        this.instance.setCenter(position);
    };
    return Center;
})();
module.exports = Center;

},{}],7:[function(require,module,exports){
/// <reference path="typings/tsd.d.ts"/>
var Config = (function () {
    function Config() {
    }
    Config.version = '3.18'; // Released: May 15, 201
    Config.url = '//maps.googleapis.com/maps/api/js';
    Config.zoom = 8;
    Config.customMapOptions = ['id', 'lat', 'lng', 'type', 'uid'];
    Config.customMarkerOptions = ['lat', 'lng', 'move', 'infoWindow', 'on', 'callback', 'tags'];
    Config.panelPosition = 'TOP_LEFT';
    Config.customInfoWindowOptions = ['open', 'close'];
    Config.customEvents = ['marker_visibility_changed'];
    return Config;
})();
module.exports = Config;

},{}],8:[function(require,module,exports){
/// <reference path="typings/tsd.d.ts"/>
var addFilter = require('./addFilter');
var Filter = (function () {
    function Filter(that, type) {
        this.that = that;
        this.type = type;
        this.orderLookup = {
            ASC: 'top',
            DESC: 'bottom'
        };
        this.utils = require('./utils');
        var addFilterInstance = new addFilter(that, type);
        this.addFilter = function (filters) {
            return addFilterInstance.addFilter(filters);
        };
    }
    // cf has it's own state, for each dimension
    // before each new filtering we need to clear this state
    Filter.prototype.clearAll = function (dimensionSet) {
        var i, dimension;
        for (i in dimensionSet) {
            if (dimensionSet.hasOwnProperty(i)) {
                dimension = dimensionSet[i];
                if (this.that[this.type].dataChanged === true) {
                    dimension.dispose();
                    this.addFilter(i);
                }
                else {
                    dimension.filterAll();
                }
            }
        }
    };
    Filter.prototype.filterByTag = function (query) {
        // if the search query is an array with only one item then just use that string
        if (this.utils.isArray(query) && query.length === 1) {
            query = query[0];
        }
        if (typeof query === "string") {
            if (this.that[this.type].tags[query]) {
                return this.utils.toArray(this.that[this.type].tags[query]);
            }
            else {
                return [];
            }
        }
        else {
            var markers = this.fetchByTag(query);
            if (typeof markers === "object") {
                markers = this.utils.toArray(markers);
            }
            return markers;
        }
    };
    Filter.prototype.fetchByTag = function (query) {
        var markers; // store first set of markers to compare
        var i;
        for (i = 0; i < query.length - 1; i++) {
            var tag = query[i];
            var nextTag = query[i + 1];
            // null check kicks in when we get to the end of the for loop
            markers = this.utils.getCommonObject(this.that[this.type].tags[tag], this.that[this.type].tags[nextTag]);
        }
        return markers;
    };
    Filter.prototype.filter = function (args, options) {
        // Return All items if no arguments are supplied
        if (typeof args === 'undefined' && typeof options === 'undefined') {
            return this.utils.toArray(this.that[this.type].all);
        }
        var dimension, order, limit, query;
        if (typeof args === 'string') {
            dimension = args;
        }
        else {
            dimension = Object.keys(args)[0];
            query = args[dimension];
            if (dimension === 'tags') {
                return this.filterByTag(query);
            }
        }
        this.clearAll(this.that[this.type].filter);
        // Add Crossfilter Dimension if it does not exist.
        if (!this.that[this.type].filter[dimension]) {
            this.addFilter(dimension);
        }
        order = (options && options.order && this.orderLookup[options.order]) ? this.orderLookup[options.order] : this.orderLookup[Object.keys(this.orderLookup)[0]];
        limit = (options && options.limit) ? options.limit : Infinity;
        if (typeof query === 'undefined') {
            query = null;
        }
        var result = this.that[this.type].filter[dimension].filter(query)[order](limit);
        this.that[this.type].dataChanged = false;
        if (limit === 1) {
            return result[0];
        }
        return result;
    };
    return Filter;
})();
module.exports = Filter;

},{"./addFilter":2,"./utils":20}],9:[function(require,module,exports){
/// <reference path="typings/tsd.d.ts"/>
var FindMarkerById = (function () {
    function FindMarkerById(that) {
        this.that = that;
    }
    FindMarkerById.prototype.find = function (marker) {
        if (marker.data && marker.data.uid) {
            return marker;
        }
        if (marker.uid && mapTools.maps[this.that.id].markers.all[marker.uid]) {
            return mapTools.maps[this.that.id].markers.all[marker.uid];
        }
    };
    return FindMarkerById;
})();
module.exports = FindMarkerById;

},{}],10:[function(require,module,exports){
/// <reference path="typings/tsd.d.ts"/>
var InfoWindow = (function () {
    function InfoWindow(that) {
        this.that = that;
        this.utils = require('./utils');
        this.config = require('./config');
    }
    InfoWindow.prototype.infoWindow = function (map, marker, args) {
        var content = false;
        if (marker.infoWindow.content) {
            if (marker.infoWindow.content.indexOf('{') > -1) {
                content = args.content.replace(/\{(\w+)\}/g, function (m, variable) {
                    return marker.data[variable] || '';
                });
            }
            content = content || marker.infoWindow.content;
        }
        var options = this.utils.clone(args);
        options.content = content;
        this.that.infoWindow = new google.maps.InfoWindow(options);
        this.that.infoWindow.open(map, marker);
    };
    InfoWindow.prototype.open = function (map, marker, options) {
        this.close();
        this.infoWindow(map, marker, options);
    };
    InfoWindow.prototype.isOpen = function (infoWindow) {
        var map = infoWindow.getMap();
        return (map !== null && typeof map !== "undefined");
    };
    InfoWindow.prototype.close = function () {
        clearTimeout(this.timer);
        if (this.that.infoWindow && this.isOpen(this.that.infoWindow)) {
            this.that.infoWindow.close();
        }
    };
    InfoWindow.prototype.addEvents = function (marker, options, map) {
        var _this = this;
        var args = this.utils.prepareOptions(options, this.config.customInfoWindowOptions);
        var openOn = (args.custom && args.custom.open && args.custom.open.on) ? args.custom.open.on : 'click';
        var closeOn = (args.custom && args.custom.close && args.custom.close.on) ? args.custom.close.on : 'click';
        // Toggle Effect when using the same method to Open and Close.
        if (openOn === closeOn) {
            google.maps.event.addListener(marker, openOn, function () {
                if (!_this.that.infoWindow || !_this.isOpen(_this.that.infoWindow)) {
                    _this.open(map, marker, args.defaults);
                }
                else {
                    _this.close();
                }
            });
        }
        else {
            google.maps.event.addListener(marker, openOn, function () {
                _this.open(map, marker, args.defaults);
            });
            google.maps.event.addListener(marker, closeOn, function () {
                if (args.custom.close.duration) {
                    _this.timer = setTimeout(function () {
                        _this.close();
                    }, args.custom.close.duration);
                }
                else {
                    _this.close();
                }
            });
        }
    };
    return InfoWindow;
})();
module.exports = InfoWindow;

},{"./config":7,"./utils":20}],11:[function(require,module,exports){
var Locate = (function () {
    function Locate() {
    }
    Locate.prototype.locate = function () {
        var center = this.instance.getCenter();
        return { lat: center.lat(), lng: center.lng() };
    };
    return Locate;
})();
module.exports = Locate;

},{}],12:[function(require,module,exports){
/// <reference path="typings/tsd.d.ts"/>
var addMarker = require('./addMarker');
var addFeature = require('./addFeature');
var addPanel = require('./addPanel');
var center = require('./center');
var locate = require('./locate');
var updateMarker = require('./updateMarker');
var updateMap = require('./updateMap');
var updateFeature = require('./updateFeature');
var addMap = require('./addMap');
var removeMarker = require('./removeMarker');
var resetMarker = require('./resetMarker');
var filter = require('./filter');
var mapTools = (function () {
    function mapTools(options, cb) {
        this.crossfilter = require('crossfilter');
        var addMarkerInstance = new addMarker(this);
        this.addMarker = function (marker, options) {
            return addMarkerInstance.addMarker(marker, options);
        };
        var addFeatureInstance = new addFeature(this);
        this.addTopoJson = function (data, options) {
            return addFeatureInstance.addTopoJson(data, options);
        };
        this.addGeoJson = function (data, options) {
            return addFeatureInstance.addGeoJson(data, options);
        };
        var addPanelInstance = new addPanel(this);
        this.addPanel = function (options, cb) {
            return addPanelInstance.addPanel(options, cb);
        };
        this.center = new center().pos;
        this.locate = new locate().locate;
        var updateMarkerInstance = new updateMarker(this);
        this.updateMarker = function (args, options) {
            return updateMarkerInstance.update(args, options);
        };
        var updateMapInstance = new updateMap(this);
        this.updateMap = function (args) {
            updateMapInstance.updateMap(args);
        };
        var updateFeatureInstance = new updateFeature(this);
        this.updateFeature = function (args, options) {
            return updateFeatureInstance.update(args, options);
        };
        var removeMarkerInstance = new removeMarker(this);
        this.removeMarker = function (args) {
            return removeMarkerInstance.removeMarker(args);
        };
        var resetMarkerInstance = new resetMarker(this);
        this.resetMarker = function (args, options) {
            return resetMarkerInstance.resetMarker(args, options);
        };
        var findMarker = new filter(this, 'markers');
        this.findMarker = function (args, options) {
            return findMarker.filter(args, options);
        };
        // Unit Tests?
        var findFeature = new filter(this, 'json');
        this.findFeature = function (args, options) {
            return findFeature.filter(args, options);
        };
        var map = new addMap(this);
        map.load(options, cb);
    }
    mapTools.prototype.zoom = function (zoom) {
        if (typeof zoom === 'undefined') {
            return this.instance.getZoom();
        }
        else {
            this.instance.setZoom(zoom);
        }
    };
    return mapTools;
})();
module.exports = mapTools;

},{"./addFeature":1,"./addMap":3,"./addMarker":4,"./addPanel":5,"./center":6,"./filter":8,"./locate":11,"./removeMarker":14,"./resetMarker":15,"./updateFeature":17,"./updateMap":18,"./updateMarker":19,"crossfilter":22}],13:[function(require,module,exports){
/// <reference path="typings/tsd.d.ts"/>
var utils = require('./utils');
var config = require('./config');
var Maps = (function () {
    function Maps() {
    }
    /**
     * Injects Google API Javascript File and adds a callback to load the Google Maps Async.
     * @type {{load: Function}}
     * @private
     *
     * @returns the element appended
     */
    Maps.load = function (id, args) {
        var version = args.version || config.version;
        var script = window.document.createElement('script');
        script.type = 'text/javascript';
        script.src = config.url + '?v=' + version + '&callback=mapTools.maps.' + id + '.create';
        return window.document.body.appendChild(script);
    };
    Maps.mapOptions = function (args) {
        // To clone Arguments excluding customMapOptions
        var result = utils.clone(args, config.customMapOptions);
        result.zoom = args.zoom || config.zoom;
        if (args.lat && args.lng) {
            result.center = new google.maps.LatLng(args.lat, args.lng);
        }
        if (args.type) {
            result.mapTypeId = google.maps.MapTypeId[args.type] || false;
        }
        return result;
    };
    return Maps;
})();
module.exports = Maps;

},{"./config":7,"./utils":20}],14:[function(require,module,exports){
/// <reference path="typings/tsd.d.ts"/>
var findMarker = require('./findMarkerById');
var RemoveMarker = (function () {
    function RemoveMarker(that) {
        this.that = that;
        var findMarkerInstance = new findMarker(that);
        this.findMarker = function (marker) {
            return findMarkerInstance.find(marker);
        };
    }
    RemoveMarker.prototype.removeBulk = function (args) {
        var marker, x;
        for (x in args) {
            if (args.hasOwnProperty(x)) {
                marker = args[x];
                this.remove(this.findMarker(marker));
            }
        }
    };
    RemoveMarker.prototype.removeMarker = function (args) {
        if (typeof args === 'undefined') {
            this.removeBulk(this.that.markers.all);
        }
        var type = Object.prototype.toString.call(args);
        if (type === '[object Object]') {
            return this.remove(this.findMarker(args));
        }
        if (type === '[object Array]') {
            this.removeBulk(args);
        }
    };
    RemoveMarker.prototype.remove = function (marker) {
        marker.setMap(null);
        delete mapTools.maps[this.that.id].markers.all[marker.data.uid];
    };
    return RemoveMarker;
})();
module.exports = RemoveMarker;

},{"./findMarkerById":9}],15:[function(require,module,exports){
/// <reference path="typings/tsd.d.ts"/>
var utils = require('./utils');
var config = require('./config');
var findMarker = require('./findMarkerById');
var updateMarker = require('./updateMarker');
var ResetMarker = (function () {
    function ResetMarker(that) {
        this.that = that;
        var findMarkerInstance = new findMarker(that);
        this.findMarker = function (marker) {
            return findMarkerInstance.find(marker);
        };
        this.updateMarker = new updateMarker(that);
    }
    ResetMarker.prototype.resetBulk = function (markers, options) {
        var x;
        for (x in markers) {
            if (markers.hasOwnProperty(x)) {
                this.reset(markers[x], options);
            }
        }
    };
    ResetMarker.prototype.resetMarker = function (args, options) {
        var type = Object.prototype.toString.call(args);
        var result;
        if (type === '[object Object]') {
            result = this.reset(this.findMarker(args), options);
        }
        if (type === '[object Array]') {
            result = this.resetBulk(args, options);
        }
        this.that.markers.dataChanged = true;
        return result;
    };
    ResetMarker.prototype.formatOptions = function (marker, options) {
        var key, op = {};
        var type = Object.prototype.toString.call(options);
        if (type === '[object String]') {
            op[options] = marker.data._self[options];
        }
        if (type === '[object Array]') {
            for (key in options) {
                if (options.hasOwnProperty(key)) {
                    op[options[key]] = marker.data._self[options[key]];
                }
            }
        }
        return op;
    };
    ResetMarker.prototype.reset = function (marker, options) {
        var preparedOptions = utils.prepareOptions(this.formatOptions(marker, options), config.customMarkerOptions);
        this.updateMarker.customUpdate(marker, preparedOptions);
        return marker;
    };
    return ResetMarker;
})();
module.exports = ResetMarker;

},{"./config":7,"./findMarkerById":9,"./updateMarker":19,"./utils":20}],16:[function(require,module,exports){
var Template = (function () {
    function Template(that) {
        this.that = that;
    }
    Template.prototype.load = function (type, url, cb) {
        var _this = this;
        if (this.that.templates[type][url]) {
            return this.that.templates[type][url];
        }
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.onload = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    _this.that.templates[type][url] = xhr.responseText;
                    cb(false, xhr.responseText);
                }
                else {
                    cb(new Error(xhr.statusText));
                }
            }
        };
        xhr.send(null);
    };
    return Template;
})();
module.exports = Template;

},{}],17:[function(require,module,exports){
/// <reference path="typings/tsd.d.ts"/>
var UpdateFeature = (function () {
    function UpdateFeature(that) {
        this.that = that;
    }
    UpdateFeature.prototype.updateStyle = function (f, style) {
        if (typeof style === 'function') {
            var styleOptions = style.call(f);
            return this.that.instance.data.overrideStyle(f, styleOptions);
        }
        this.that.instance.data.overrideStyle(f, style);
    };
    UpdateFeature.prototype.findAndUpdate = function (args, options) {
        if (args.data && args.data.uid) {
            return this.updateFeature(args, options);
        }
        if (args.uid && mapTools.maps[this.that.id].json && mapTools.maps[this.that.id].json.all[args.uid]) {
            return this.updateFeature(mapTools.maps[this.that.id].json.all[args.uid], options);
        }
    };
    UpdateFeature.prototype.update = function (args, options) {
        var type = Object.prototype.toString.call(args);
        if (type === '[object Array]') {
            var feature, x;
            for (x in args) {
                if (args.hasOwnProperty(x)) {
                    feature = args[x];
                    this.findAndUpdate(feature, options);
                }
            }
        }
        if (type === '[object Object]') {
            this.findAndUpdate(args, options);
        }
    };
    UpdateFeature.prototype.updateFeature = function (feature, options) {
        if (options.style) {
            this.updateStyle(feature, options.style);
        }
    };
    return UpdateFeature;
})();
module.exports = UpdateFeature;

},{}],18:[function(require,module,exports){
/// <reference path="maps.ts"/>
var maps = require('./maps');
var UpdateMap = (function () {
    function UpdateMap(that) {
        this.that = that;
    }
    UpdateMap.prototype.updateMap = function (args) {
        var mapOptions = maps.mapOptions(args);
        return this.that.instance.setOptions(mapOptions);
    };
    return UpdateMap;
})();
module.exports = UpdateMap;

},{"./maps":13}],19:[function(require,module,exports){
/// <reference path="typings/tsd.d.ts"/>
var utils = require('./utils');
var config = require('./config');
var findMarker = require('./findMarkerById');
var filter = require('./filter');
var UpdateMarker = (function () {
    function UpdateMarker(that) {
        this.that = that;
        var findMarkerInstance = new findMarker(that);
        this.findMarker = function (marker) {
            return findMarkerInstance.find(marker);
        };
    }
    UpdateMarker.prototype.removeTags = function (marker) {
        if (utils.isArray(marker.tags)) {
            var i, tag;
            for (i in marker.tags) {
                if (marker.tags.hasOwnProperty(i)) {
                    tag = marker.tags[i];
                    delete this.that.markers.tags[tag][marker.data.uid];
                }
            }
        }
        else {
            delete this.that.markers.tags[marker.tags][marker.data.uid];
        }
    };
    UpdateMarker.prototype.addTags = function (marker, options) {
        if (utils.isArray(options.custom.tags)) {
            var i, tag;
            for (i in options.custom.tags) {
                tag = options.custom.tags[i];
                this.that.markers.tags[tag] = this.that.markers.tags[tag] || {};
                this.that.markers.tags[tag][marker.data.uid] = marker;
            }
        }
        else {
            this.that.markers.tags[options.custom.tags] = this.that.markers.tags[options.custom.tags] || {};
            this.that.markers.tags[options.custom.tags][marker.data.uid] = marker;
        }
        marker.tags = options.custom.tags;
    };
    UpdateMarker.prototype.updateTag = function (marker, options) {
        this.removeTags(marker);
        this.addTags(marker, options);
    };
    UpdateMarker.prototype.customUpdate = function (marker, options) {
        if (options.custom) {
            if (options.custom.move) {
                marker.setAnimation(google.maps.Animation[options.custom.move.toUpperCase()]);
            }
            if (options.custom.lat && options.custom.lng) {
                marker.setPosition(new google.maps.LatLng(options.custom.lat, options.custom.lng));
            }
            if (options.custom.infoWindow && options.custom.infoWindow.content) {
                marker.infoWindow.content = options.custom.infoWindow.content;
            }
            if (options.custom.tags) {
                this.updateTag(marker, options);
            }
        }
        if (options.defaults) {
            marker.setOptions(options.defaults);
        }
        return marker;
    };
    UpdateMarker.prototype.bulkUpdate = function (args, options) {
        var marker, results = [], instance, x;
        for (x in args) {
            if (args.hasOwnProperty(x)) {
                marker = args[x];
                instance = this.customUpdate(this.findMarker(marker), options);
                results.push(instance);
            }
        }
        return results;
    };
    UpdateMarker.prototype.countVisible = function () {
        var x, count = 0;
        for (x in this.that.markers.all) {
            if (this.that.markers.all[x].visible) {
                count++;
            }
        }
        google.maps.event.trigger(this.that.instance, 'marker_visibility_changed', count);
    };
    UpdateMarker.prototype.update = function (args, options) {
        var visibilityFlag = false;
        var preparedOptions = utils.prepareOptions(options, config.customMarkerOptions);
        if (preparedOptions.defaults && preparedOptions.defaults.hasOwnProperty('visible') && this.that.events.indexOf('marker_visibility_changed') > -1) {
            visibilityFlag = true;
        }
        var result;
        var type = Object.prototype.toString.call(args);
        if (type === '[object Object]') {
            if (Object.keys(args).length === 1 && args.tags) {
                var filterInstance = new filter(this.that, 'markers');
                result = this.bulkUpdate(filterInstance.filter(args), preparedOptions);
            }
            else {
                result = this.customUpdate(this.findMarker(args), preparedOptions);
            }
        }
        if (type === '[object Array]') {
            result = this.bulkUpdate(args, preparedOptions);
        }
        if (visibilityFlag) {
            this.countVisible();
        }
        this.that.markers.dataChanged = true;
        return result;
    };
    return UpdateMarker;
})();
module.exports = UpdateMarker;

},{"./config":7,"./filter":8,"./findMarkerById":9,"./utils":20}],20:[function(require,module,exports){
var Utils = (function () {
    function Utils() {
    }
    Utils.clone = function (o, exceptionKeys) {
        var out, v, key;
        out = Array.isArray(o) ? [] : {};
        for (key in o) {
            if (o.hasOwnProperty(key)) {
                if (!exceptionKeys || (exceptionKeys && exceptionKeys.indexOf(key) === -1)) {
                    v = o[key];
                    out[key] = (typeof v === 'object') ? this.clone(v) : v;
                }
            }
        }
        return out;
    };
    Utils.createUid = function () {
        return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r, v;
            r = Math.random() * 16 | 0;
            v = c === 'x' ? r : r & 0x3 | 0x8;
            return v.toString(16);
        });
    };
    Utils.prepareOptions = function (options, custom) {
        var result = { custom: {}, defaults: {} }, option;
        for (option in options) {
            if (options.hasOwnProperty(option)) {
                if (custom.indexOf(option) > -1) {
                    result.custom = result.custom || {};
                    result.custom[option] = options[option];
                }
                else {
                    result.defaults = result.defaults || {};
                    result.defaults[option] = options[option];
                }
            }
        }
        return result;
    };
    Utils.isArray = function (arg) {
        return Object.prototype.toString.call(arg) === '[object Array]';
    };
    Utils.toArray = function (obj) {
        return Object.keys(obj).map(function (key) {
            return obj[key];
        });
    };
    Utils.defaultDimension = function (item) {
        return function (d) {
            if (typeof d.data[item] === 'undefined' && typeof d[item] !== 'undefined') {
                return d[item];
            }
            if (typeof d.data[item] === 'undefined' && typeof d[item] === 'undefined') {
                return null;
            }
            return d.data[item];
        };
    };
    // compares two lists and returns the common items
    Utils.getCommonObject = function (list1, list2) {
        var result = {};
        for (var uid in list1) {
            if (list1.hasOwnProperty(uid)) {
                var match = list2[uid];
                if (typeof match !== 'undefined') {
                    result[uid] = match;
                }
            }
        }
        return result;
    };
    return Utils;
})();
module.exports = Utils;

},{}],21:[function(require,module,exports){
(function(exports){
crossfilter.version = "1.3.12";
function crossfilter_identity(d) {
  return d;
}
crossfilter.permute = permute;

function permute(array, index) {
  for (var i = 0, n = index.length, copy = new Array(n); i < n; ++i) {
    copy[i] = array[index[i]];
  }
  return copy;
}
var bisect = crossfilter.bisect = bisect_by(crossfilter_identity);

bisect.by = bisect_by;

function bisect_by(f) {

  // Locate the insertion point for x in a to maintain sorted order. The
  // arguments lo and hi may be used to specify a subset of the array which
  // should be considered; by default the entire array is used. If x is already
  // present in a, the insertion point will be before (to the left of) any
  // existing entries. The return value is suitable for use as the first
  // argument to `array.splice` assuming that a is already sorted.
  //
  // The returned insertion point i partitions the array a into two halves so
  // that all v < x for v in a[lo:i] for the left side and all v >= x for v in
  // a[i:hi] for the right side.
  function bisectLeft(a, x, lo, hi) {
    while (lo < hi) {
      var mid = lo + hi >>> 1;
      if (f(a[mid]) < x) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  // Similar to bisectLeft, but returns an insertion point which comes after (to
  // the right of) any existing entries of x in a.
  //
  // The returned insertion point i partitions the array into two halves so that
  // all v <= x for v in a[lo:i] for the left side and all v > x for v in
  // a[i:hi] for the right side.
  function bisectRight(a, x, lo, hi) {
    while (lo < hi) {
      var mid = lo + hi >>> 1;
      if (x < f(a[mid])) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  }

  bisectRight.right = bisectRight;
  bisectRight.left = bisectLeft;
  return bisectRight;
}
var heap = crossfilter.heap = heap_by(crossfilter_identity);

heap.by = heap_by;

function heap_by(f) {

  // Builds a binary heap within the specified array a[lo:hi]. The heap has the
  // property such that the parent a[lo+i] is always less than or equal to its
  // two children: a[lo+2*i+1] and a[lo+2*i+2].
  function heap(a, lo, hi) {
    var n = hi - lo,
        i = (n >>> 1) + 1;
    while (--i > 0) sift(a, i, n, lo);
    return a;
  }

  // Sorts the specified array a[lo:hi] in descending order, assuming it is
  // already a heap.
  function sort(a, lo, hi) {
    var n = hi - lo,
        t;
    while (--n > 0) t = a[lo], a[lo] = a[lo + n], a[lo + n] = t, sift(a, 1, n, lo);
    return a;
  }

  // Sifts the element a[lo+i-1] down the heap, where the heap is the contiguous
  // slice of array a[lo:lo+n]. This method can also be used to update the heap
  // incrementally, without incurring the full cost of reconstructing the heap.
  function sift(a, i, n, lo) {
    var d = a[--lo + i],
        x = f(d),
        child;
    while ((child = i << 1) <= n) {
      if (child < n && f(a[lo + child]) > f(a[lo + child + 1])) child++;
      if (x <= f(a[lo + child])) break;
      a[lo + i] = a[lo + child];
      i = child;
    }
    a[lo + i] = d;
  }

  heap.sort = sort;
  return heap;
}
var heapselect = crossfilter.heapselect = heapselect_by(crossfilter_identity);

heapselect.by = heapselect_by;

function heapselect_by(f) {
  var heap = heap_by(f);

  // Returns a new array containing the top k elements in the array a[lo:hi].
  // The returned array is not sorted, but maintains the heap property. If k is
  // greater than hi - lo, then fewer than k elements will be returned. The
  // order of elements in a is unchanged by this operation.
  function heapselect(a, lo, hi, k) {
    var queue = new Array(k = Math.min(hi - lo, k)),
        min,
        i,
        x,
        d;

    for (i = 0; i < k; ++i) queue[i] = a[lo++];
    heap(queue, 0, k);

    if (lo < hi) {
      min = f(queue[0]);
      do {
        if (x = f(d = a[lo]) > min) {
          queue[0] = d;
          min = f(heap(queue, 0, k)[0]);
        }
      } while (++lo < hi);
    }

    return queue;
  }

  return heapselect;
}
var insertionsort = crossfilter.insertionsort = insertionsort_by(crossfilter_identity);

insertionsort.by = insertionsort_by;

function insertionsort_by(f) {

  function insertionsort(a, lo, hi) {
    for (var i = lo + 1; i < hi; ++i) {
      for (var j = i, t = a[i], x = f(t); j > lo && f(a[j - 1]) > x; --j) {
        a[j] = a[j - 1];
      }
      a[j] = t;
    }
    return a;
  }

  return insertionsort;
}
// Algorithm designed by Vladimir Yaroslavskiy.
// Implementation based on the Dart project; see lib/dart/LICENSE for details.

var quicksort = crossfilter.quicksort = quicksort_by(crossfilter_identity);

quicksort.by = quicksort_by;

function quicksort_by(f) {
  var insertionsort = insertionsort_by(f);

  function sort(a, lo, hi) {
    return (hi - lo < quicksort_sizeThreshold
        ? insertionsort
        : quicksort)(a, lo, hi);
  }

  function quicksort(a, lo, hi) {
    // Compute the two pivots by looking at 5 elements.
    var sixth = (hi - lo) / 6 | 0,
        i1 = lo + sixth,
        i5 = hi - 1 - sixth,
        i3 = lo + hi - 1 >> 1,  // The midpoint.
        i2 = i3 - sixth,
        i4 = i3 + sixth;

    var e1 = a[i1], x1 = f(e1),
        e2 = a[i2], x2 = f(e2),
        e3 = a[i3], x3 = f(e3),
        e4 = a[i4], x4 = f(e4),
        e5 = a[i5], x5 = f(e5);

    var t;

    // Sort the selected 5 elements using a sorting network.
    if (x1 > x2) t = e1, e1 = e2, e2 = t, t = x1, x1 = x2, x2 = t;
    if (x4 > x5) t = e4, e4 = e5, e5 = t, t = x4, x4 = x5, x5 = t;
    if (x1 > x3) t = e1, e1 = e3, e3 = t, t = x1, x1 = x3, x3 = t;
    if (x2 > x3) t = e2, e2 = e3, e3 = t, t = x2, x2 = x3, x3 = t;
    if (x1 > x4) t = e1, e1 = e4, e4 = t, t = x1, x1 = x4, x4 = t;
    if (x3 > x4) t = e3, e3 = e4, e4 = t, t = x3, x3 = x4, x4 = t;
    if (x2 > x5) t = e2, e2 = e5, e5 = t, t = x2, x2 = x5, x5 = t;
    if (x2 > x3) t = e2, e2 = e3, e3 = t, t = x2, x2 = x3, x3 = t;
    if (x4 > x5) t = e4, e4 = e5, e5 = t, t = x4, x4 = x5, x5 = t;

    var pivot1 = e2, pivotValue1 = x2,
        pivot2 = e4, pivotValue2 = x4;

    // e2 and e4 have been saved in the pivot variables. They will be written
    // back, once the partitioning is finished.
    a[i1] = e1;
    a[i2] = a[lo];
    a[i3] = e3;
    a[i4] = a[hi - 1];
    a[i5] = e5;

    var less = lo + 1,   // First element in the middle partition.
        great = hi - 2;  // Last element in the middle partition.

    // Note that for value comparison, <, <=, >= and > coerce to a primitive via
    // Object.prototype.valueOf; == and === do not, so in order to be consistent
    // with natural order (such as for Date objects), we must do two compares.
    var pivotsEqual = pivotValue1 <= pivotValue2 && pivotValue1 >= pivotValue2;
    if (pivotsEqual) {

      // Degenerated case where the partitioning becomes a dutch national flag
      // problem.
      //
      // [ |  < pivot  | == pivot | unpartitioned | > pivot  | ]
      //  ^             ^          ^             ^            ^
      // left         less         k           great         right
      //
      // a[left] and a[right] are undefined and are filled after the
      // partitioning.
      //
      // Invariants:
      //   1) for x in ]left, less[ : x < pivot.
      //   2) for x in [less, k[ : x == pivot.
      //   3) for x in ]great, right[ : x > pivot.
      for (var k = less; k <= great; ++k) {
        var ek = a[k], xk = f(ek);
        if (xk < pivotValue1) {
          if (k !== less) {
            a[k] = a[less];
            a[less] = ek;
          }
          ++less;
        } else if (xk > pivotValue1) {

          // Find the first element <= pivot in the range [k - 1, great] and
          // put [:ek:] there. We know that such an element must exist:
          // When k == less, then el3 (which is equal to pivot) lies in the
          // interval. Otherwise a[k - 1] == pivot and the search stops at k-1.
          // Note that in the latter case invariant 2 will be violated for a
          // short amount of time. The invariant will be restored when the
          // pivots are put into their final positions.
          while (true) {
            var greatValue = f(a[great]);
            if (greatValue > pivotValue1) {
              great--;
              // This is the only location in the while-loop where a new
              // iteration is started.
              continue;
            } else if (greatValue < pivotValue1) {
              // Triple exchange.
              a[k] = a[less];
              a[less++] = a[great];
              a[great--] = ek;
              break;
            } else {
              a[k] = a[great];
              a[great--] = ek;
              // Note: if great < k then we will exit the outer loop and fix
              // invariant 2 (which we just violated).
              break;
            }
          }
        }
      }
    } else {

      // We partition the list into three parts:
      //  1. < pivot1
      //  2. >= pivot1 && <= pivot2
      //  3. > pivot2
      //
      // During the loop we have:
      // [ | < pivot1 | >= pivot1 && <= pivot2 | unpartitioned  | > pivot2  | ]
      //  ^            ^                        ^              ^             ^
      // left         less                     k              great        right
      //
      // a[left] and a[right] are undefined and are filled after the
      // partitioning.
      //
      // Invariants:
      //   1. for x in ]left, less[ : x < pivot1
      //   2. for x in [less, k[ : pivot1 <= x && x <= pivot2
      //   3. for x in ]great, right[ : x > pivot2
      for (var k = less; k <= great; k++) {
        var ek = a[k], xk = f(ek);
        if (xk < pivotValue1) {
          if (k !== less) {
            a[k] = a[less];
            a[less] = ek;
          }
          ++less;
        } else {
          if (xk > pivotValue2) {
            while (true) {
              var greatValue = f(a[great]);
              if (greatValue > pivotValue2) {
                great--;
                if (great < k) break;
                // This is the only location inside the loop where a new
                // iteration is started.
                continue;
              } else {
                // a[great] <= pivot2.
                if (greatValue < pivotValue1) {
                  // Triple exchange.
                  a[k] = a[less];
                  a[less++] = a[great];
                  a[great--] = ek;
                } else {
                  // a[great] >= pivot1.
                  a[k] = a[great];
                  a[great--] = ek;
                }
                break;
              }
            }
          }
        }
      }
    }

    // Move pivots into their final positions.
    // We shrunk the list from both sides (a[left] and a[right] have
    // meaningless values in them) and now we move elements from the first
    // and third partition into these locations so that we can store the
    // pivots.
    a[lo] = a[less - 1];
    a[less - 1] = pivot1;
    a[hi - 1] = a[great + 1];
    a[great + 1] = pivot2;

    // The list is now partitioned into three partitions:
    // [ < pivot1   | >= pivot1 && <= pivot2   |  > pivot2   ]
    //  ^            ^                        ^             ^
    // left         less                     great        right

    // Recursive descent. (Don't include the pivot values.)
    sort(a, lo, less - 1);
    sort(a, great + 2, hi);

    if (pivotsEqual) {
      // All elements in the second partition are equal to the pivot. No
      // need to sort them.
      return a;
    }

    // In theory it should be enough to call _doSort recursively on the second
    // partition.
    // The Android source however removes the pivot elements from the recursive
    // call if the second partition is too large (more than 2/3 of the list).
    if (less < i1 && great > i5) {
      var lessValue, greatValue;
      while ((lessValue = f(a[less])) <= pivotValue1 && lessValue >= pivotValue1) ++less;
      while ((greatValue = f(a[great])) <= pivotValue2 && greatValue >= pivotValue2) --great;

      // Copy paste of the previous 3-way partitioning with adaptions.
      //
      // We partition the list into three parts:
      //  1. == pivot1
      //  2. > pivot1 && < pivot2
      //  3. == pivot2
      //
      // During the loop we have:
      // [ == pivot1 | > pivot1 && < pivot2 | unpartitioned  | == pivot2 ]
      //              ^                      ^              ^
      //            less                     k              great
      //
      // Invariants:
      //   1. for x in [ *, less[ : x == pivot1
      //   2. for x in [less, k[ : pivot1 < x && x < pivot2
      //   3. for x in ]great, * ] : x == pivot2
      for (var k = less; k <= great; k++) {
        var ek = a[k], xk = f(ek);
        if (xk <= pivotValue1 && xk >= pivotValue1) {
          if (k !== less) {
            a[k] = a[less];
            a[less] = ek;
          }
          less++;
        } else {
          if (xk <= pivotValue2 && xk >= pivotValue2) {
            while (true) {
              var greatValue = f(a[great]);
              if (greatValue <= pivotValue2 && greatValue >= pivotValue2) {
                great--;
                if (great < k) break;
                // This is the only location inside the loop where a new
                // iteration is started.
                continue;
              } else {
                // a[great] < pivot2.
                if (greatValue < pivotValue1) {
                  // Triple exchange.
                  a[k] = a[less];
                  a[less++] = a[great];
                  a[great--] = ek;
                } else {
                  // a[great] == pivot1.
                  a[k] = a[great];
                  a[great--] = ek;
                }
                break;
              }
            }
          }
        }
      }
    }

    // The second partition has now been cleared of pivot elements and looks
    // as follows:
    // [  *  |  > pivot1 && < pivot2  | * ]
    //        ^                      ^
    //       less                  great
    // Sort the second partition using recursive descent.

    // The second partition looks as follows:
    // [  *  |  >= pivot1 && <= pivot2  | * ]
    //        ^                        ^
    //       less                    great
    // Simply sort it by recursive descent.

    return sort(a, less, great + 1);
  }

  return sort;
}

var quicksort_sizeThreshold = 32;
var crossfilter_array8 = crossfilter_arrayUntyped,
    crossfilter_array16 = crossfilter_arrayUntyped,
    crossfilter_array32 = crossfilter_arrayUntyped,
    crossfilter_arrayLengthen = crossfilter_arrayLengthenUntyped,
    crossfilter_arrayWiden = crossfilter_arrayWidenUntyped;

if (typeof Uint8Array !== "undefined") {
  crossfilter_array8 = function(n) { return new Uint8Array(n); };
  crossfilter_array16 = function(n) { return new Uint16Array(n); };
  crossfilter_array32 = function(n) { return new Uint32Array(n); };

  crossfilter_arrayLengthen = function(array, length) {
    if (array.length >= length) return array;
    var copy = new array.constructor(length);
    copy.set(array);
    return copy;
  };

  crossfilter_arrayWiden = function(array, width) {
    var copy;
    switch (width) {
      case 16: copy = crossfilter_array16(array.length); break;
      case 32: copy = crossfilter_array32(array.length); break;
      default: throw new Error("invalid array width!");
    }
    copy.set(array);
    return copy;
  };
}

function crossfilter_arrayUntyped(n) {
  var array = new Array(n), i = -1;
  while (++i < n) array[i] = 0;
  return array;
}

function crossfilter_arrayLengthenUntyped(array, length) {
  var n = array.length;
  while (n < length) array[n++] = 0;
  return array;
}

function crossfilter_arrayWidenUntyped(array, width) {
  if (width > 32) throw new Error("invalid array width!");
  return array;
}
function crossfilter_filterExact(bisect, value) {
  return function(values) {
    var n = values.length;
    return [bisect.left(values, value, 0, n), bisect.right(values, value, 0, n)];
  };
}

function crossfilter_filterRange(bisect, range) {
  var min = range[0],
      max = range[1];
  return function(values) {
    var n = values.length;
    return [bisect.left(values, min, 0, n), bisect.left(values, max, 0, n)];
  };
}

function crossfilter_filterAll(values) {
  return [0, values.length];
}
function crossfilter_null() {
  return null;
}
function crossfilter_zero() {
  return 0;
}
function crossfilter_reduceIncrement(p) {
  return p + 1;
}

function crossfilter_reduceDecrement(p) {
  return p - 1;
}

function crossfilter_reduceAdd(f) {
  return function(p, v) {
    return p + +f(v);
  };
}

function crossfilter_reduceSubtract(f) {
  return function(p, v) {
    return p - f(v);
  };
}
exports.crossfilter = crossfilter;

function crossfilter() {
  var crossfilter = {
    add: add,
    remove: removeData,
    dimension: dimension,
    groupAll: groupAll,
    size: size
  };

  var data = [], // the records
      n = 0, // the number of records; data.length
      m = 0, // a bit mask representing which dimensions are in use
      M = 8, // number of dimensions that can fit in `filters`
      filters = crossfilter_array8(0), // M bits per record; 1 is filtered out
      filterListeners = [], // when the filters change
      dataListeners = [], // when data is added
      removeDataListeners = []; // when data is removed

  // Adds the specified new records to this crossfilter.
  function add(newData) {
    var n0 = n,
        n1 = newData.length;

    // If there's actually new data to add…
    // Merge the new data into the existing data.
    // Lengthen the filter bitset to handle the new records.
    // Notify listeners (dimensions and groups) that new data is available.
    if (n1) {
      data = data.concat(newData);
      filters = crossfilter_arrayLengthen(filters, n += n1);
      dataListeners.forEach(function(l) { l(newData, n0, n1); });
    }

    return crossfilter;
  }

  // Removes all records that match the current filters.
  function removeData() {
    var newIndex = crossfilter_index(n, n),
        removed = [];
    for (var i = 0, j = 0; i < n; ++i) {
      if (filters[i]) newIndex[i] = j++;
      else removed.push(i);
    }

    // Remove all matching records from groups.
    filterListeners.forEach(function(l) { l(0, [], removed); });

    // Update indexes.
    removeDataListeners.forEach(function(l) { l(newIndex); });

    // Remove old filters and data by overwriting.
    for (var i = 0, j = 0, k; i < n; ++i) {
      if (k = filters[i]) {
        if (i !== j) filters[j] = k, data[j] = data[i];
        ++j;
      }
    }
    data.length = j;
    while (n > j) filters[--n] = 0;
  }

  // Adds a new dimension with the specified value accessor function.
  function dimension(value) {
    var dimension = {
      filter: filter,
      filterExact: filterExact,
      filterRange: filterRange,
      filterFunction: filterFunction,
      filterAll: filterAll,
      top: top,
      bottom: bottom,
      group: group,
      groupAll: groupAll,
      dispose: dispose,
      remove: dispose // for backwards-compatibility
    };

    var one = ~m & -~m, // lowest unset bit as mask, e.g., 00001000
        zero = ~one, // inverted one, e.g., 11110111
        values, // sorted, cached array
        index, // value rank ↦ object id
        newValues, // temporary array storing newly-added values
        newIndex, // temporary array storing newly-added index
        sort = quicksort_by(function(i) { return newValues[i]; }),
        refilter = crossfilter_filterAll, // for recomputing filter
        refilterFunction, // the custom filter function in use
        indexListeners = [], // when data is added
        dimensionGroups = [],
        lo0 = 0,
        hi0 = 0;

    // Updating a dimension is a two-stage process. First, we must update the
    // associated filters for the newly-added records. Once all dimensions have
    // updated their filters, the groups are notified to update.
    dataListeners.unshift(preAdd);
    dataListeners.push(postAdd);

    removeDataListeners.push(removeData);

    // Incorporate any existing data into this dimension, and make sure that the
    // filter bitset is wide enough to handle the new dimension.
    m |= one;
    if (M >= 32 ? !one : m & -(1 << M)) {
      filters = crossfilter_arrayWiden(filters, M <<= 1);
    }
    preAdd(data, 0, n);
    postAdd(data, 0, n);

    // Incorporates the specified new records into this dimension.
    // This function is responsible for updating filters, values, and index.
    function preAdd(newData, n0, n1) {

      // Permute new values into natural order using a sorted index.
      newValues = newData.map(value);
      newIndex = sort(crossfilter_range(n1), 0, n1);
      newValues = permute(newValues, newIndex);

      // Bisect newValues to determine which new records are selected.
      var bounds = refilter(newValues), lo1 = bounds[0], hi1 = bounds[1], i;
      if (refilterFunction) {
        for (i = 0; i < n1; ++i) {
          if (!refilterFunction(newValues[i], i)) filters[newIndex[i] + n0] |= one;
        }
      } else {
        for (i = 0; i < lo1; ++i) filters[newIndex[i] + n0] |= one;
        for (i = hi1; i < n1; ++i) filters[newIndex[i] + n0] |= one;
      }

      // If this dimension previously had no data, then we don't need to do the
      // more expensive merge operation; use the new values and index as-is.
      if (!n0) {
        values = newValues;
        index = newIndex;
        lo0 = lo1;
        hi0 = hi1;
        return;
      }

      var oldValues = values,
          oldIndex = index,
          i0 = 0,
          i1 = 0;

      // Otherwise, create new arrays into which to merge new and old.
      values = new Array(n);
      index = crossfilter_index(n, n);

      // Merge the old and new sorted values, and old and new index.
      for (i = 0; i0 < n0 && i1 < n1; ++i) {
        if (oldValues[i0] < newValues[i1]) {
          values[i] = oldValues[i0];
          index[i] = oldIndex[i0++];
        } else {
          values[i] = newValues[i1];
          index[i] = newIndex[i1++] + n0;
        }
      }

      // Add any remaining old values.
      for (; i0 < n0; ++i0, ++i) {
        values[i] = oldValues[i0];
        index[i] = oldIndex[i0];
      }

      // Add any remaining new values.
      for (; i1 < n1; ++i1, ++i) {
        values[i] = newValues[i1];
        index[i] = newIndex[i1] + n0;
      }

      // Bisect again to recompute lo0 and hi0.
      bounds = refilter(values), lo0 = bounds[0], hi0 = bounds[1];
    }

    // When all filters have updated, notify index listeners of the new values.
    function postAdd(newData, n0, n1) {
      indexListeners.forEach(function(l) { l(newValues, newIndex, n0, n1); });
      newValues = newIndex = null;
    }

    function removeData(reIndex) {
      for (var i = 0, j = 0, k; i < n; ++i) {
        if (filters[k = index[i]]) {
          if (i !== j) values[j] = values[i];
          index[j] = reIndex[k];
          ++j;
        }
      }
      values.length = j;
      while (j < n) index[j++] = 0;

      // Bisect again to recompute lo0 and hi0.
      var bounds = refilter(values);
      lo0 = bounds[0], hi0 = bounds[1];
    }

    // Updates the selected values based on the specified bounds [lo, hi].
    // This implementation is used by all the public filter methods.
    function filterIndexBounds(bounds) {
      var lo1 = bounds[0],
          hi1 = bounds[1];

      if (refilterFunction) {
        refilterFunction = null;
        filterIndexFunction(function(d, i) { return lo1 <= i && i < hi1; });
        lo0 = lo1;
        hi0 = hi1;
        return dimension;
      }

      var i,
          j,
          k,
          added = [],
          removed = [];

      // Fast incremental update based on previous lo index.
      if (lo1 < lo0) {
        for (i = lo1, j = Math.min(lo0, hi1); i < j; ++i) {
          filters[k = index[i]] ^= one;
          added.push(k);
        }
      } else if (lo1 > lo0) {
        for (i = lo0, j = Math.min(lo1, hi0); i < j; ++i) {
          filters[k = index[i]] ^= one;
          removed.push(k);
        }
      }

      // Fast incremental update based on previous hi index.
      if (hi1 > hi0) {
        for (i = Math.max(lo1, hi0), j = hi1; i < j; ++i) {
          filters[k = index[i]] ^= one;
          added.push(k);
        }
      } else if (hi1 < hi0) {
        for (i = Math.max(lo0, hi1), j = hi0; i < j; ++i) {
          filters[k = index[i]] ^= one;
          removed.push(k);
        }
      }

      lo0 = lo1;
      hi0 = hi1;
      filterListeners.forEach(function(l) { l(one, added, removed); });
      return dimension;
    }

    // Filters this dimension using the specified range, value, or null.
    // If the range is null, this is equivalent to filterAll.
    // If the range is an array, this is equivalent to filterRange.
    // Otherwise, this is equivalent to filterExact.
    function filter(range) {
      return range == null
          ? filterAll() : Array.isArray(range)
          ? filterRange(range) : typeof range === "function"
          ? filterFunction(range)
          : filterExact(range);
    }

    // Filters this dimension to select the exact value.
    function filterExact(value) {
      return filterIndexBounds((refilter = crossfilter_filterExact(bisect, value))(values));
    }

    // Filters this dimension to select the specified range [lo, hi].
    // The lower bound is inclusive, and the upper bound is exclusive.
    function filterRange(range) {
      return filterIndexBounds((refilter = crossfilter_filterRange(bisect, range))(values));
    }

    // Clears any filters on this dimension.
    function filterAll() {
      return filterIndexBounds((refilter = crossfilter_filterAll)(values));
    }

    // Filters this dimension using an arbitrary function.
    function filterFunction(f) {
      refilter = crossfilter_filterAll;

      filterIndexFunction(refilterFunction = f);

      lo0 = 0;
      hi0 = n;

      return dimension;
    }

    function filterIndexFunction(f) {
      var i,
          k,
          x,
          added = [],
          removed = [];

      for (i = 0; i < n; ++i) {
        if (!(filters[k = index[i]] & one) ^ !!(x = f(values[i], i))) {
          if (x) filters[k] &= zero, added.push(k);
          else filters[k] |= one, removed.push(k);
        }
      }
      filterListeners.forEach(function(l) { l(one, added, removed); });
    }

    // Returns the top K selected records based on this dimension's order.
    // Note: observes this dimension's filter, unlike group and groupAll.
    function top(k) {
      var array = [],
          i = hi0,
          j;

      while (--i >= lo0 && k > 0) {
        if (!filters[j = index[i]]) {
          array.push(data[j]);
          --k;
        }
      }

      return array;
    }

    // Returns the bottom K selected records based on this dimension's order.
    // Note: observes this dimension's filter, unlike group and groupAll.
    function bottom(k) {
      var array = [],
          i = lo0,
          j;

      while (i < hi0 && k > 0) {
        if (!filters[j = index[i]]) {
          array.push(data[j]);
          --k;
        }
        i++;
      }

      return array;
    }

    // Adds a new group to this dimension, using the specified key function.
    function group(key) {
      var group = {
        top: top,
        all: all,
        reduce: reduce,
        reduceCount: reduceCount,
        reduceSum: reduceSum,
        order: order,
        orderNatural: orderNatural,
        size: size,
        dispose: dispose,
        remove: dispose // for backwards-compatibility
      };

      // Ensure that this group will be removed when the dimension is removed.
      dimensionGroups.push(group);

      var groups, // array of {key, value}
          groupIndex, // object id ↦ group id
          groupWidth = 8,
          groupCapacity = crossfilter_capacity(groupWidth),
          k = 0, // cardinality
          select,
          heap,
          reduceAdd,
          reduceRemove,
          reduceInitial,
          update = crossfilter_null,
          reset = crossfilter_null,
          resetNeeded = true,
          groupAll = key === crossfilter_null;

      if (arguments.length < 1) key = crossfilter_identity;

      // The group listens to the crossfilter for when any dimension changes, so
      // that it can update the associated reduce values. It must also listen to
      // the parent dimension for when data is added, and compute new keys.
      filterListeners.push(update);
      indexListeners.push(add);
      removeDataListeners.push(removeData);

      // Incorporate any existing data into the grouping.
      add(values, index, 0, n);

      // Incorporates the specified new values into this group.
      // This function is responsible for updating groups and groupIndex.
      function add(newValues, newIndex, n0, n1) {
        var oldGroups = groups,
            reIndex = crossfilter_index(k, groupCapacity),
            add = reduceAdd,
            initial = reduceInitial,
            k0 = k, // old cardinality
            i0 = 0, // index of old group
            i1 = 0, // index of new record
            j, // object id
            g0, // old group
            x0, // old key
            x1, // new key
            g, // group to add
            x; // key of group to add

        // If a reset is needed, we don't need to update the reduce values.
        if (resetNeeded) add = initial = crossfilter_null;

        // Reset the new groups (k is a lower bound).
        // Also, make sure that groupIndex exists and is long enough.
        groups = new Array(k), k = 0;
        groupIndex = k0 > 1 ? crossfilter_arrayLengthen(groupIndex, n) : crossfilter_index(n, groupCapacity);

        // Get the first old key (x0 of g0), if it exists.
        if (k0) x0 = (g0 = oldGroups[0]).key;

        // Find the first new key (x1), skipping NaN keys.
        while (i1 < n1 && !((x1 = key(newValues[i1])) >= x1)) ++i1;

        // While new keys remain…
        while (i1 < n1) {

          // Determine the lesser of the two current keys; new and old.
          // If there are no old keys remaining, then always add the new key.
          if (g0 && x0 <= x1) {
            g = g0, x = x0;

            // Record the new index of the old group.
            reIndex[i0] = k;

            // Retrieve the next old key.
            if (g0 = oldGroups[++i0]) x0 = g0.key;
          } else {
            g = {key: x1, value: initial()}, x = x1;
          }

          // Add the lesser group.
          groups[k] = g;

          // Add any selected records belonging to the added group, while
          // advancing the new key and populating the associated group index.
          while (!(x1 > x)) {
            groupIndex[j = newIndex[i1] + n0] = k;
            if (!(filters[j] & zero)) g.value = add(g.value, data[j]);
            if (++i1 >= n1) break;
            x1 = key(newValues[i1]);
          }

          groupIncrement();
        }

        // Add any remaining old groups that were greater than all new keys.
        // No incremental reduce is needed; these groups have no new records.
        // Also record the new index of the old group.
        while (i0 < k0) {
          groups[reIndex[i0] = k] = oldGroups[i0++];
          groupIncrement();
        }

        // If we added any new groups before any old groups,
        // update the group index of all the old records.
        if (k > i0) for (i0 = 0; i0 < n0; ++i0) {
          groupIndex[i0] = reIndex[groupIndex[i0]];
        }

        // Modify the update and reset behavior based on the cardinality.
        // If the cardinality is less than or equal to one, then the groupIndex
        // is not needed. If the cardinality is zero, then there are no records
        // and therefore no groups to update or reset. Note that we also must
        // change the registered listener to point to the new method.
        j = filterListeners.indexOf(update);
        if (k > 1) {
          update = updateMany;
          reset = resetMany;
        } else {
          if (!k && groupAll) {
            k = 1;
            groups = [{key: null, value: initial()}];
          }
          if (k === 1) {
            update = updateOne;
            reset = resetOne;
          } else {
            update = crossfilter_null;
            reset = crossfilter_null;
          }
          groupIndex = null;
        }
        filterListeners[j] = update;

        // Count the number of added groups,
        // and widen the group index as needed.
        function groupIncrement() {
          if (++k === groupCapacity) {
            reIndex = crossfilter_arrayWiden(reIndex, groupWidth <<= 1);
            groupIndex = crossfilter_arrayWiden(groupIndex, groupWidth);
            groupCapacity = crossfilter_capacity(groupWidth);
          }
        }
      }

      function removeData() {
        if (k > 1) {
          var oldK = k,
              oldGroups = groups,
              seenGroups = crossfilter_index(oldK, oldK);

          // Filter out non-matches by copying matching group index entries to
          // the beginning of the array.
          for (var i = 0, j = 0; i < n; ++i) {
            if (filters[i]) {
              seenGroups[groupIndex[j] = groupIndex[i]] = 1;
              ++j;
            }
          }

          // Reassemble groups including only those groups that were referred
          // to by matching group index entries.  Note the new group index in
          // seenGroups.
          groups = [], k = 0;
          for (i = 0; i < oldK; ++i) {
            if (seenGroups[i]) {
              seenGroups[i] = k++;
              groups.push(oldGroups[i]);
            }
          }

          if (k > 1) {
            // Reindex the group index using seenGroups to find the new index.
            for (var i = 0; i < j; ++i) groupIndex[i] = seenGroups[groupIndex[i]];
          } else {
            groupIndex = null;
          }
          filterListeners[filterListeners.indexOf(update)] = k > 1
              ? (reset = resetMany, update = updateMany)
              : k === 1 ? (reset = resetOne, update = updateOne)
              : reset = update = crossfilter_null;
        } else if (k === 1) {
          if (groupAll) return;
          for (var i = 0; i < n; ++i) if (filters[i]) return;
          groups = [], k = 0;
          filterListeners[filterListeners.indexOf(update)] =
          update = reset = crossfilter_null;
        }
      }

      // Reduces the specified selected or deselected records.
      // This function is only used when the cardinality is greater than 1.
      function updateMany(filterOne, added, removed) {
        if (filterOne === one || resetNeeded) return;

        var i,
            k,
            n,
            g;

        // Add the added values.
        for (i = 0, n = added.length; i < n; ++i) {
          if (!(filters[k = added[i]] & zero)) {
            g = groups[groupIndex[k]];
            g.value = reduceAdd(g.value, data[k]);
          }
        }

        // Remove the removed values.
        for (i = 0, n = removed.length; i < n; ++i) {
          if ((filters[k = removed[i]] & zero) === filterOne) {
            g = groups[groupIndex[k]];
            g.value = reduceRemove(g.value, data[k]);
          }
        }
      }

      // Reduces the specified selected or deselected records.
      // This function is only used when the cardinality is 1.
      function updateOne(filterOne, added, removed) {
        if (filterOne === one || resetNeeded) return;

        var i,
            k,
            n,
            g = groups[0];

        // Add the added values.
        for (i = 0, n = added.length; i < n; ++i) {
          if (!(filters[k = added[i]] & zero)) {
            g.value = reduceAdd(g.value, data[k]);
          }
        }

        // Remove the removed values.
        for (i = 0, n = removed.length; i < n; ++i) {
          if ((filters[k = removed[i]] & zero) === filterOne) {
            g.value = reduceRemove(g.value, data[k]);
          }
        }
      }

      // Recomputes the group reduce values from scratch.
      // This function is only used when the cardinality is greater than 1.
      function resetMany() {
        var i,
            g;

        // Reset all group values.
        for (i = 0; i < k; ++i) {
          groups[i].value = reduceInitial();
        }

        // Add any selected records.
        for (i = 0; i < n; ++i) {
          if (!(filters[i] & zero)) {
            g = groups[groupIndex[i]];
            g.value = reduceAdd(g.value, data[i]);
          }
        }
      }

      // Recomputes the group reduce values from scratch.
      // This function is only used when the cardinality is 1.
      function resetOne() {
        var i,
            g = groups[0];

        // Reset the singleton group values.
        g.value = reduceInitial();

        // Add any selected records.
        for (i = 0; i < n; ++i) {
          if (!(filters[i] & zero)) {
            g.value = reduceAdd(g.value, data[i]);
          }
        }
      }

      // Returns the array of group values, in the dimension's natural order.
      function all() {
        if (resetNeeded) reset(), resetNeeded = false;
        return groups;
      }

      // Returns a new array containing the top K group values, in reduce order.
      function top(k) {
        var top = select(all(), 0, groups.length, k);
        return heap.sort(top, 0, top.length);
      }

      // Sets the reduce behavior for this group to use the specified functions.
      // This method lazily recomputes the reduce values, waiting until needed.
      function reduce(add, remove, initial) {
        reduceAdd = add;
        reduceRemove = remove;
        reduceInitial = initial;
        resetNeeded = true;
        return group;
      }

      // A convenience method for reducing by count.
      function reduceCount() {
        return reduce(crossfilter_reduceIncrement, crossfilter_reduceDecrement, crossfilter_zero);
      }

      // A convenience method for reducing by sum(value).
      function reduceSum(value) {
        return reduce(crossfilter_reduceAdd(value), crossfilter_reduceSubtract(value), crossfilter_zero);
      }

      // Sets the reduce order, using the specified accessor.
      function order(value) {
        select = heapselect_by(valueOf);
        heap = heap_by(valueOf);
        function valueOf(d) { return value(d.value); }
        return group;
      }

      // A convenience method for natural ordering by reduce value.
      function orderNatural() {
        return order(crossfilter_identity);
      }

      // Returns the cardinality of this group, irrespective of any filters.
      function size() {
        return k;
      }

      // Removes this group and associated event listeners.
      function dispose() {
        var i = filterListeners.indexOf(update);
        if (i >= 0) filterListeners.splice(i, 1);
        i = indexListeners.indexOf(add);
        if (i >= 0) indexListeners.splice(i, 1);
        i = removeDataListeners.indexOf(removeData);
        if (i >= 0) removeDataListeners.splice(i, 1);
        return group;
      }

      return reduceCount().orderNatural();
    }

    // A convenience function for generating a singleton group.
    function groupAll() {
      var g = group(crossfilter_null), all = g.all;
      delete g.all;
      delete g.top;
      delete g.order;
      delete g.orderNatural;
      delete g.size;
      g.value = function() { return all()[0].value; };
      return g;
    }

    // Removes this dimension and associated groups and event listeners.
    function dispose() {
      dimensionGroups.forEach(function(group) { group.dispose(); });
      var i = dataListeners.indexOf(preAdd);
      if (i >= 0) dataListeners.splice(i, 1);
      i = dataListeners.indexOf(postAdd);
      if (i >= 0) dataListeners.splice(i, 1);
      i = removeDataListeners.indexOf(removeData);
      if (i >= 0) removeDataListeners.splice(i, 1);
      m &= zero;
      return filterAll();
    }

    return dimension;
  }

  // A convenience method for groupAll on a dummy dimension.
  // This implementation can be optimized since it always has cardinality 1.
  function groupAll() {
    var group = {
      reduce: reduce,
      reduceCount: reduceCount,
      reduceSum: reduceSum,
      value: value,
      dispose: dispose,
      remove: dispose // for backwards-compatibility
    };

    var reduceValue,
        reduceAdd,
        reduceRemove,
        reduceInitial,
        resetNeeded = true;

    // The group listens to the crossfilter for when any dimension changes, so
    // that it can update the reduce value. It must also listen to the parent
    // dimension for when data is added.
    filterListeners.push(update);
    dataListeners.push(add);

    // For consistency; actually a no-op since resetNeeded is true.
    add(data, 0, n);

    // Incorporates the specified new values into this group.
    function add(newData, n0) {
      var i;

      if (resetNeeded) return;

      // Add the added values.
      for (i = n0; i < n; ++i) {
        if (!filters[i]) {
          reduceValue = reduceAdd(reduceValue, data[i]);
        }
      }
    }

    // Reduces the specified selected or deselected records.
    function update(filterOne, added, removed) {
      var i,
          k,
          n;

      if (resetNeeded) return;

      // Add the added values.
      for (i = 0, n = added.length; i < n; ++i) {
        if (!filters[k = added[i]]) {
          reduceValue = reduceAdd(reduceValue, data[k]);
        }
      }

      // Remove the removed values.
      for (i = 0, n = removed.length; i < n; ++i) {
        if (filters[k = removed[i]] === filterOne) {
          reduceValue = reduceRemove(reduceValue, data[k]);
        }
      }
    }

    // Recomputes the group reduce value from scratch.
    function reset() {
      var i;

      reduceValue = reduceInitial();

      for (i = 0; i < n; ++i) {
        if (!filters[i]) {
          reduceValue = reduceAdd(reduceValue, data[i]);
        }
      }
    }

    // Sets the reduce behavior for this group to use the specified functions.
    // This method lazily recomputes the reduce value, waiting until needed.
    function reduce(add, remove, initial) {
      reduceAdd = add;
      reduceRemove = remove;
      reduceInitial = initial;
      resetNeeded = true;
      return group;
    }

    // A convenience method for reducing by count.
    function reduceCount() {
      return reduce(crossfilter_reduceIncrement, crossfilter_reduceDecrement, crossfilter_zero);
    }

    // A convenience method for reducing by sum(value).
    function reduceSum(value) {
      return reduce(crossfilter_reduceAdd(value), crossfilter_reduceSubtract(value), crossfilter_zero);
    }

    // Returns the computed reduce value.
    function value() {
      if (resetNeeded) reset(), resetNeeded = false;
      return reduceValue;
    }

    // Removes this group and associated event listeners.
    function dispose() {
      var i = filterListeners.indexOf(update);
      if (i >= 0) filterListeners.splice(i);
      i = dataListeners.indexOf(add);
      if (i >= 0) dataListeners.splice(i);
      return group;
    }

    return reduceCount();
  }

  // Returns the number of records in this crossfilter, irrespective of any filters.
  function size() {
    return n;
  }

  return arguments.length
      ? add(arguments[0])
      : crossfilter;
}

// Returns an array of size n, big enough to store ids up to m.
function crossfilter_index(n, m) {
  return (m < 0x101
      ? crossfilter_array8 : m < 0x10001
      ? crossfilter_array16
      : crossfilter_array32)(n);
}

// Constructs a new array of size n, with sequential values from 0 to n - 1.
function crossfilter_range(n) {
  var range = crossfilter_index(n, n);
  for (var i = -1; ++i < n;) range[i] = i;
  return range;
}

function crossfilter_capacity(w) {
  return w === 8
      ? 0x100 : w === 16
      ? 0x10000
      : 0x100000000;
}
})(typeof exports !== 'undefined' && exports || this);

},{}],22:[function(require,module,exports){
module.exports = require("./crossfilter").crossfilter;

},{"./crossfilter":21}],23:[function(require,module,exports){
!function() {
  var topojson = {
    version: "1.6.19",
    mesh: function(topology) { return object(topology, meshArcs.apply(this, arguments)); },
    meshArcs: meshArcs,
    merge: function(topology) { return object(topology, mergeArcs.apply(this, arguments)); },
    mergeArcs: mergeArcs,
    feature: featureOrCollection,
    neighbors: neighbors,
    presimplify: presimplify
  };

  function stitchArcs(topology, arcs) {
    var stitchedArcs = {},
        fragmentByStart = {},
        fragmentByEnd = {},
        fragments = [],
        emptyIndex = -1;

    // Stitch empty arcs first, since they may be subsumed by other arcs.
    arcs.forEach(function(i, j) {
      var arc = topology.arcs[i < 0 ? ~i : i], t;
      if (arc.length < 3 && !arc[1][0] && !arc[1][1]) {
        t = arcs[++emptyIndex], arcs[emptyIndex] = i, arcs[j] = t;
      }
    });

    arcs.forEach(function(i) {
      var e = ends(i),
          start = e[0],
          end = e[1],
          f, g;

      if (f = fragmentByEnd[start]) {
        delete fragmentByEnd[f.end];
        f.push(i);
        f.end = end;
        if (g = fragmentByStart[end]) {
          delete fragmentByStart[g.start];
          var fg = g === f ? f : f.concat(g);
          fragmentByStart[fg.start = f.start] = fragmentByEnd[fg.end = g.end] = fg;
        } else {
          fragmentByStart[f.start] = fragmentByEnd[f.end] = f;
        }
      } else if (f = fragmentByStart[end]) {
        delete fragmentByStart[f.start];
        f.unshift(i);
        f.start = start;
        if (g = fragmentByEnd[start]) {
          delete fragmentByEnd[g.end];
          var gf = g === f ? f : g.concat(f);
          fragmentByStart[gf.start = g.start] = fragmentByEnd[gf.end = f.end] = gf;
        } else {
          fragmentByStart[f.start] = fragmentByEnd[f.end] = f;
        }
      } else {
        f = [i];
        fragmentByStart[f.start = start] = fragmentByEnd[f.end = end] = f;
      }
    });

    function ends(i) {
      var arc = topology.arcs[i < 0 ? ~i : i], p0 = arc[0], p1;
      if (topology.transform) p1 = [0, 0], arc.forEach(function(dp) { p1[0] += dp[0], p1[1] += dp[1]; });
      else p1 = arc[arc.length - 1];
      return i < 0 ? [p1, p0] : [p0, p1];
    }

    function flush(fragmentByEnd, fragmentByStart) {
      for (var k in fragmentByEnd) {
        var f = fragmentByEnd[k];
        delete fragmentByStart[f.start];
        delete f.start;
        delete f.end;
        f.forEach(function(i) { stitchedArcs[i < 0 ? ~i : i] = 1; });
        fragments.push(f);
      }
    }

    flush(fragmentByEnd, fragmentByStart);
    flush(fragmentByStart, fragmentByEnd);
    arcs.forEach(function(i) { if (!stitchedArcs[i < 0 ? ~i : i]) fragments.push([i]); });

    return fragments;
  }

  function meshArcs(topology, o, filter) {
    var arcs = [];

    if (arguments.length > 1) {
      var geomsByArc = [],
          geom;

      function arc(i) {
        var j = i < 0 ? ~i : i;
        (geomsByArc[j] || (geomsByArc[j] = [])).push({i: i, g: geom});
      }

      function line(arcs) {
        arcs.forEach(arc);
      }

      function polygon(arcs) {
        arcs.forEach(line);
      }

      function geometry(o) {
        if (o.type === "GeometryCollection") o.geometries.forEach(geometry);
        else if (o.type in geometryType) geom = o, geometryType[o.type](o.arcs);
      }

      var geometryType = {
        LineString: line,
        MultiLineString: polygon,
        Polygon: polygon,
        MultiPolygon: function(arcs) { arcs.forEach(polygon); }
      };

      geometry(o);

      geomsByArc.forEach(arguments.length < 3
          ? function(geoms) { arcs.push(geoms[0].i); }
          : function(geoms) { if (filter(geoms[0].g, geoms[geoms.length - 1].g)) arcs.push(geoms[0].i); });
    } else {
      for (var i = 0, n = topology.arcs.length; i < n; ++i) arcs.push(i);
    }

    return {type: "MultiLineString", arcs: stitchArcs(topology, arcs)};
  }

  function mergeArcs(topology, objects) {
    var polygonsByArc = {},
        polygons = [],
        components = [];

    objects.forEach(function(o) {
      if (o.type === "Polygon") register(o.arcs);
      else if (o.type === "MultiPolygon") o.arcs.forEach(register);
    });

    function register(polygon) {
      polygon.forEach(function(ring) {
        ring.forEach(function(arc) {
          (polygonsByArc[arc = arc < 0 ? ~arc : arc] || (polygonsByArc[arc] = [])).push(polygon);
        });
      });
      polygons.push(polygon);
    }

    function exterior(ring) {
      return cartesianRingArea(object(topology, {type: "Polygon", arcs: [ring]}).coordinates[0]) > 0; // TODO allow spherical?
    }

    polygons.forEach(function(polygon) {
      if (!polygon._) {
        var component = [],
            neighbors = [polygon];
        polygon._ = 1;
        components.push(component);
        while (polygon = neighbors.pop()) {
          component.push(polygon);
          polygon.forEach(function(ring) {
            ring.forEach(function(arc) {
              polygonsByArc[arc < 0 ? ~arc : arc].forEach(function(polygon) {
                if (!polygon._) {
                  polygon._ = 1;
                  neighbors.push(polygon);
                }
              });
            });
          });
        }
      }
    });

    polygons.forEach(function(polygon) {
      delete polygon._;
    });

    return {
      type: "MultiPolygon",
      arcs: components.map(function(polygons) {
        var arcs = [];

        // Extract the exterior (unique) arcs.
        polygons.forEach(function(polygon) {
          polygon.forEach(function(ring) {
            ring.forEach(function(arc) {
              if (polygonsByArc[arc < 0 ? ~arc : arc].length < 2) {
                arcs.push(arc);
              }
            });
          });
        });

        // Stitch the arcs into one or more rings.
        arcs = stitchArcs(topology, arcs);

        // If more than one ring is returned,
        // at most one of these rings can be the exterior;
        // this exterior ring has the same winding order
        // as any exterior ring in the original polygons.
        if ((n = arcs.length) > 1) {
          var sgn = exterior(polygons[0][0]);
          for (var i = 0, t; i < n; ++i) {
            if (sgn === exterior(arcs[i])) {
              t = arcs[0], arcs[0] = arcs[i], arcs[i] = t;
              break;
            }
          }
        }

        return arcs;
      })
    };
  }

  function featureOrCollection(topology, o) {
    return o.type === "GeometryCollection" ? {
      type: "FeatureCollection",
      features: o.geometries.map(function(o) { return feature(topology, o); })
    } : feature(topology, o);
  }

  function feature(topology, o) {
    var f = {
      type: "Feature",
      id: o.id,
      properties: o.properties || {},
      geometry: object(topology, o)
    };
    if (o.id == null) delete f.id;
    return f;
  }

  function object(topology, o) {
    var absolute = transformAbsolute(topology.transform),
        arcs = topology.arcs;

    function arc(i, points) {
      if (points.length) points.pop();
      for (var a = arcs[i < 0 ? ~i : i], k = 0, n = a.length, p; k < n; ++k) {
        points.push(p = a[k].slice());
        absolute(p, k);
      }
      if (i < 0) reverse(points, n);
    }

    function point(p) {
      p = p.slice();
      absolute(p, 0);
      return p;
    }

    function line(arcs) {
      var points = [];
      for (var i = 0, n = arcs.length; i < n; ++i) arc(arcs[i], points);
      if (points.length < 2) points.push(points[0].slice());
      return points;
    }

    function ring(arcs) {
      var points = line(arcs);
      while (points.length < 4) points.push(points[0].slice());
      return points;
    }

    function polygon(arcs) {
      return arcs.map(ring);
    }

    function geometry(o) {
      var t = o.type;
      return t === "GeometryCollection" ? {type: t, geometries: o.geometries.map(geometry)}
          : t in geometryType ? {type: t, coordinates: geometryType[t](o)}
          : null;
    }

    var geometryType = {
      Point: function(o) { return point(o.coordinates); },
      MultiPoint: function(o) { return o.coordinates.map(point); },
      LineString: function(o) { return line(o.arcs); },
      MultiLineString: function(o) { return o.arcs.map(line); },
      Polygon: function(o) { return polygon(o.arcs); },
      MultiPolygon: function(o) { return o.arcs.map(polygon); }
    };

    return geometry(o);
  }

  function reverse(array, n) {
    var t, j = array.length, i = j - n; while (i < --j) t = array[i], array[i++] = array[j], array[j] = t;
  }

  function bisect(a, x) {
    var lo = 0, hi = a.length;
    while (lo < hi) {
      var mid = lo + hi >>> 1;
      if (a[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  function neighbors(objects) {
    var indexesByArc = {}, // arc index -> array of object indexes
        neighbors = objects.map(function() { return []; });

    function line(arcs, i) {
      arcs.forEach(function(a) {
        if (a < 0) a = ~a;
        var o = indexesByArc[a];
        if (o) o.push(i);
        else indexesByArc[a] = [i];
      });
    }

    function polygon(arcs, i) {
      arcs.forEach(function(arc) { line(arc, i); });
    }

    function geometry(o, i) {
      if (o.type === "GeometryCollection") o.geometries.forEach(function(o) { geometry(o, i); });
      else if (o.type in geometryType) geometryType[o.type](o.arcs, i);
    }

    var geometryType = {
      LineString: line,
      MultiLineString: polygon,
      Polygon: polygon,
      MultiPolygon: function(arcs, i) { arcs.forEach(function(arc) { polygon(arc, i); }); }
    };

    objects.forEach(geometry);

    for (var i in indexesByArc) {
      for (var indexes = indexesByArc[i], m = indexes.length, j = 0; j < m; ++j) {
        for (var k = j + 1; k < m; ++k) {
          var ij = indexes[j], ik = indexes[k], n;
          if ((n = neighbors[ij])[i = bisect(n, ik)] !== ik) n.splice(i, 0, ik);
          if ((n = neighbors[ik])[i = bisect(n, ij)] !== ij) n.splice(i, 0, ij);
        }
      }
    }

    return neighbors;
  }

  function presimplify(topology, triangleArea) {
    var absolute = transformAbsolute(topology.transform),
        relative = transformRelative(topology.transform),
        heap = minAreaHeap();

    if (!triangleArea) triangleArea = cartesianTriangleArea;

    topology.arcs.forEach(function(arc) {
      var triangles = [],
          maxArea = 0,
          triangle;

      // To store each point’s effective area, we create a new array rather than
      // extending the passed-in point to workaround a Chrome/V8 bug (getting
      // stuck in smi mode). For midpoints, the initial effective area of
      // Infinity will be computed in the next step.
      for (var i = 0, n = arc.length, p; i < n; ++i) {
        p = arc[i];
        absolute(arc[i] = [p[0], p[1], Infinity], i);
      }

      for (var i = 1, n = arc.length - 1; i < n; ++i) {
        triangle = arc.slice(i - 1, i + 2);
        triangle[1][2] = triangleArea(triangle);
        triangles.push(triangle);
        heap.push(triangle);
      }

      for (var i = 0, n = triangles.length; i < n; ++i) {
        triangle = triangles[i];
        triangle.previous = triangles[i - 1];
        triangle.next = triangles[i + 1];
      }

      while (triangle = heap.pop()) {
        var previous = triangle.previous,
            next = triangle.next;

        // If the area of the current point is less than that of the previous point
        // to be eliminated, use the latter's area instead. This ensures that the
        // current point cannot be eliminated without eliminating previously-
        // eliminated points.
        if (triangle[1][2] < maxArea) triangle[1][2] = maxArea;
        else maxArea = triangle[1][2];

        if (previous) {
          previous.next = next;
          previous[2] = triangle[2];
          update(previous);
        }

        if (next) {
          next.previous = previous;
          next[0] = triangle[0];
          update(next);
        }
      }

      arc.forEach(relative);
    });

    function update(triangle) {
      heap.remove(triangle);
      triangle[1][2] = triangleArea(triangle);
      heap.push(triangle);
    }

    return topology;
  };

  function cartesianRingArea(ring) {
    var i = -1,
        n = ring.length,
        a,
        b = ring[n - 1],
        area = 0;

    while (++i < n) {
      a = b;
      b = ring[i];
      area += a[0] * b[1] - a[1] * b[0];
    }

    return area * .5;
  }

  function cartesianTriangleArea(triangle) {
    var a = triangle[0], b = triangle[1], c = triangle[2];
    return Math.abs((a[0] - c[0]) * (b[1] - a[1]) - (a[0] - b[0]) * (c[1] - a[1]));
  }

  function compareArea(a, b) {
    return a[1][2] - b[1][2];
  }

  function minAreaHeap() {
    var heap = {},
        array = [],
        size = 0;

    heap.push = function(object) {
      up(array[object._ = size] = object, size++);
      return size;
    };

    heap.pop = function() {
      if (size <= 0) return;
      var removed = array[0], object;
      if (--size > 0) object = array[size], down(array[object._ = 0] = object, 0);
      return removed;
    };

    heap.remove = function(removed) {
      var i = removed._, object;
      if (array[i] !== removed) return; // invalid request
      if (i !== --size) object = array[size], (compareArea(object, removed) < 0 ? up : down)(array[object._ = i] = object, i);
      return i;
    };

    function up(object, i) {
      while (i > 0) {
        var j = ((i + 1) >> 1) - 1,
            parent = array[j];
        if (compareArea(object, parent) >= 0) break;
        array[parent._ = i] = parent;
        array[object._ = i = j] = object;
      }
    }

    function down(object, i) {
      while (true) {
        var r = (i + 1) << 1,
            l = r - 1,
            j = i,
            child = array[j];
        if (l < size && compareArea(array[l], child) < 0) child = array[j = l];
        if (r < size && compareArea(array[r], child) < 0) child = array[j = r];
        if (j === i) break;
        array[child._ = i] = child;
        array[object._ = i = j] = object;
      }
    }

    return heap;
  }

  function transformAbsolute(transform) {
    if (!transform) return noop;
    var x0,
        y0,
        kx = transform.scale[0],
        ky = transform.scale[1],
        dx = transform.translate[0],
        dy = transform.translate[1];
    return function(point, i) {
      if (!i) x0 = y0 = 0;
      point[0] = (x0 += point[0]) * kx + dx;
      point[1] = (y0 += point[1]) * ky + dy;
    };
  }

  function transformRelative(transform) {
    if (!transform) return noop;
    var x0,
        y0,
        kx = transform.scale[0],
        ky = transform.scale[1],
        dx = transform.translate[0],
        dy = transform.translate[1];
    return function(point, i) {
      if (!i) x0 = y0 = 0;
      var x1 = (point[0] - dx) / kx | 0,
          y1 = (point[1] - dy) / ky | 0;
      point[0] = x1 - x0;
      point[1] = y1 - y0;
      x0 = x1;
      y0 = y1;
    };
  }

  function noop() {}

  if (typeof define === "function" && define.amd) define(topojson);
  else if (typeof module === "object" && module.exports) module.exports = topojson;
  else this.topojson = topojson;
}();

},{}]},{},[12])(12)
});
