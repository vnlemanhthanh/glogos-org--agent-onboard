'use strict';

module.exports = Object.freeze({
  service: require('./services/package-service'),
  surface: require('./services/package-surface-service'),
  sourceManifest: require('./services/source-manifest-service'),
  coordinate: require('./services/package-coordinate-service'),
  firstReadContract: require('./services/installed-first-read-contract')
});
