/**
 * @fileoverview This file provides a "elevation" directive. This directive is
 * used to insert Elevation information into the HTML page.
 * Example:
 *
 * <app-elevation app-elevation-active="mainCtrl.infobarOpen"
 *     app-elevation-map="::mainCtrl.map"></app-elevation>
 *
 * Note the use of the one-time binding operator (::) in the map expression.
 * One-time binding is used because we know the map is not going to change
 * during the lifetime of the application.
 *
 */
goog.module('app.infobar.elevationDirective');

goog.module.declareLegacyNamespace();
const appModule = goog.require('app.module');


/**
 * @return {angular.Directive} The Directive Object Definition.
 * @ngInject
 */
exports = function() {
  return {
    restrict: 'E',
    scope: {
      'map': '=appElevationMap',
      'active': '=appElevationActive'
    },
    controller: 'AppElevationController',
    controllerAs: 'ctrl',
    bindToController: true,
    template: '<span class="elevation" translate>' +
        'Elevation: {{ctrl.elevation}}</span>'
  };
};


appModule.directive('appElevation', exports);
