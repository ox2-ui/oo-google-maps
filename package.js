Package.describe({
  name: 'ox2:google-maps',
  summary: 'TESTING_DO_NOT_USE Google Maps Components',
  version: '1.4.0',
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
    'less',
    'random'
    ]);
  // 3rd party
  api.use([
    'mquandalle:jade@0.4.9'
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
