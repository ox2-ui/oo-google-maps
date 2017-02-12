Template.ooGoogleMaps.created = function () {
  var self = this;
  self.mapId = new Blaze.ReactiveVar("MAP" + Random.id()); // map-tools crashes if id begins with a numer
};

Template.ooGoogleMaps.rendered =function () {
  var self = this;
  var zoom = self.data.zoom || 14;
  var apiKey = Session.get('clientAPI');
  if(self.data.lat && self.data.lng) {
    var map = new mapTools({
      id: self.mapId.get(),
      lat: self.data.lat,
      lng: self.data.lng,
      disableDoubleClickZoom: true,
      mapTypeControl: false,
      streetViewControl: false,
      zoom: zoom,
      apiKey: apiKey ? apiKey.googleMapAPI : '',
    }, function (err, instance) {
      if (!err) {
        console.log('Hey! the Map was fully loaded! Add some Markers :)');
        map.addMarker({
          lat: self.data.lat,
          lng: self.data.lng,
          title: 'Barcelona',
          move: 'drop'
        });
      }
    });
  } else {
    console.log('%c ERROR ooGoogleMaps no lat or lng specified   ',  'background: #FF9900; color: white; padding: 1px 15px 1px 5px;');
  }
};

Template.ooGoogleMaps.helpers({
  mapId : function () {
   return Template.instance().mapId.get();
  }
});

Template.ooGoogleMaps.events({
  'click .oo-GoogleMaps' : function (e, t) {
    e.preventDefault();
    e.stopPropagation();

  },
  'click .js-OpenGoogleMap': function(e) {
    var self = this,
        href = '';

    if (self.address) {
      var addressPlus = self.address.replace(/[ ]/g, "+")
      href = "https://maps.google.com/?q=" + addressPlus;
      console.log('%c href   ',  'background: #B3CC57; color: white; padding: 1px 15px 1px 5px;', href);
    } else
      href = "https://maps.google.com/?q=" + self.lat + "," + self.lng;

    if(typeof device === "undefined"){
         var ref = window.open(href, '_blank');
       } else {
          openUrl(href);
       }
  }
});
