Package.describe({
  name: 'ox2:google-maps',
  summary: 'Google Maps Components',
  version: '1.0.0',
  git: ' /* Fill me in! */ '
});

var S = 'server';
var C = 'client';
var CS = [C, S];

Package.onUse(function(api) {
  api.versionsFrom('1.0.2.1');
  // Core
  api.use([
    'templating'
    ]);
  // 3rd party
  api.use([
    'lauricio:less-autoprefixer@1.0.15','mquandalle:jade@0.4.1'
    ]);
  api.addFiles('lib/oo-google-maps.jade', C);
  api.addFiles('lib/oo-google-maps.less', C);
  api.addFiles('lib/map-tools.js', C);
  api.addFiles('lib/oo-google-maps.js', C);
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('ox2:google-maps');
  api.addFiles('tests/oo-google-maps-tests.js');
});
