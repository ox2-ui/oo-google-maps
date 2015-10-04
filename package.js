Package.describe({
  name: 'ox2:google-maps',
  summary: 'TESTING_DO_NOT_USE Google Maps Components',
  version: '1.1.0',
  git: ' /* Fill me in! */ '
});

var S = 'server';
var C = 'client';
var CS = [C, S];

Package.onUse(function(api) {
  api.versionsFrom('1.2.0.2');
  // Core
  api.use([
    'templating',
    'random'
    ]);
  // 3rd party
  api.use([
    'lauricio:less-autoprefixer@2.5.0_3','mquandalle:jade@0.4.1'
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
