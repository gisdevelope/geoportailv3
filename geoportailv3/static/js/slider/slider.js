goog.provide('app.SliderController');
goog.provide('app.sliderDirective');

goog.require('app');
goog.require('ol.Map');


/**
 * @param {string} appSliderTemplateUrl Url to slider template.
 * @return {angular.Directive} The directive specs.
 * @ngInject
 */
app.sliderDirective = function(appSliderTemplateUrl) {
  return {
    restrict: 'A',
    scope: {
      'map': '=appSliderMap',
      'active': '=appSliderActive',
      'layers': '=appSliderLayers'
    },
    bindToController: true,
    controller: 'AppSliderController',
    controllerAs: 'ctrl'
  };
};


app.module.directive('appSlider', app.sliderDirective);

/**
 * @param {angular.JQLite} $element Element.
 * @param {ngeo.statemanager.Location} ngeoLocation ngeo location service.
 * @param {Document} $document The document.
 * @param {angular.Scope} $scope Scope.
 * @constructor
 * @ngInject
 */
app.SliderController = function($element, ngeoLocation, $document, $scope) {

  /**
   * @type {angular.Scope}
   * @private
   */
  this.scope_ = $scope;

  /**
   * @type {Document}
   * @private
   */
  this.$document_ = $document;

  /**
   * @type {ngeo.statemanager.Location}
   * @private
   */
  this.ngeoLocation_ = ngeoLocation;

  /**
   * @type {ol.Map}
   * @private
   */
  this.map_ = this['map'];

  /**
   * @type {angular.JQLite}
   * @private
   */
  this.element_ = $element;

  /**
   * @type {boolean}
   * @private
   */
  this.isDragging_ = false;

  /**
   * @type {ol.EventsKey?}
   * @private
   */
  this.mousemoveEvent_ = null;

  /**
   * @type {ol.EventsKey?}
   * @private
   */
  this.mapResizeEvent_ = null;

  /**
   * @type {ol.EventsKey?}
   * @private
   */
  this.postcomposeEvent_ = null;

  /**
   * @type {ol.EventsKey?}
   * @private
   */
  this.precomposeEvent_ = null;

  /**
   * @type {ol.EventsKey?}
   * @private
   */
  this.mousedownEvent_ = null;
  this.scope_.$watch(function() {
    return this['active'];
  }.bind(this), function(show, oldShow) {
    if (show === undefined) {
      return;
    }
    this.activate(show);
  }.bind(this));

  this.scope_.$watchCollection(function() {
    return this.layers;
  }.bind(this), function(newSelectedLayers, oldSelectedLayers) {
    if (this['active'] && newSelectedLayers.length > 0 &&
        newSelectedLayers.length != oldSelectedLayers.length) {
      this.activate(false);
      this.activate(true);
    } else if (newSelectedLayers.length === 0) {
      this.activate(false);
      this['active'] = false;
    }
  }.bind(this));
};

/**
 * Activate the slider on the line.
 * @param {boolean} active Is active.
 */
app.SliderController.prototype.activate = function(active) {
  if (active) {
    if (this.ngeoLocation_.getParam('sliderRatio') === undefined) {
      this.ngeoLocation_.updateParams({'sliderRatio': 0.5});
    }
    this.moveLine_();

    this.mapResizeEvent_ = ol.events.listen(this.map_, 'change:size', this.moveLine_, this);
    this.mousedownEvent_ = ol.events.listen(this.element_[0], 'mousedown',
        function(event) {
          this.isDragging_ = true;
          if (this.mousemoveEvent_ === null) {
            this.mousemoveEvent_ = ol.events.listen(this.map_,
                ol.MapBrowserEventType.POINTERMOVE, this.drag_, this);
          }
          ol.events.listenOnce(this.$document_[0],
              'mouseup', function() {
                if (this.mousemoveEvent_) {
                  ol.Observable.unByKey(this.mousemoveEvent_);
                }
                this.isDragging_ = false;
                this.mousemoveEvent_ = null;
              }, this);
        }, this);

    var layer = this['layers'][0];
    if (layer !== undefined) {
      this.precomposeEvent_ = ol.events.listen(layer, 'precompose', function(event) {
        if (this['layers'][0] === layer) {
          var ratio = this.ngeoLocation_.getParam('sliderRatio');
          var ctx = event.context;
          var width = ctx.canvas.width * (1 - ratio);
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, ctx.canvas.width - width, ctx.canvas.height);
          ctx.clip();
        } else {
          this['active'] = false;
        }
      }, this);

      this.postcomposeEvent_ = ol.events.listen(layer, 'postcompose', function(event) {
        if (this['layers'][0] === layer) {
          var ctx = event.context;
          ctx.restore();
        } else {
          this['active'] = false;
        }
      }, this);
    }
  } else {
    if (this.mousedownEvent_) {
      ol.Observable.unByKey(this.mousedownEvent_);
    }
    if (this.mapResizeEvent_) {
      ol.Observable.unByKey(this.mapResizeEvent_);
    }
    if (this.precomposeEvent_ !== null) {
      ol.Observable.unByKey(this.precomposeEvent_);
    }
    if (this.postcomposeEvent_ !== null) {
      ol.Observable.unByKey(this.postcomposeEvent_);
    }
  }
  this.map_.render();
};


/**
 * @private
 */
app.SliderController.prototype.moveLine_ = function() {
  var curRatio = this.ngeoLocation_.getParam('sliderRatio');

  var offset = (curRatio * this.map_.getSize()[0]) -
               (this.element_.width() / 2) +
               angular.element(this.map_.getViewport()).offset().left;
  this.element_.css({'left': offset});
};

/**
 * Dragging the line compartor over the map.
 * @param {ol.MapBrowserEvent} event The event.
 * @private
 */
app.SliderController.prototype.drag_ = function(event) {
  if (this.isDragging_) {
    var mapOffset = angular.element(this.map_.getViewport()).offset().left;

    this.element_.css({'left': event.pixel[0] + mapOffset});
    var curRatio = ((this.element_.offset().left - mapOffset) +
                   (this.element_.width() / 2)) / this.map_.getSize()[0];

    if (curRatio < 0.10) {
      curRatio = 0.10;
    } else if (curRatio > 0.90) {
      curRatio = 0.90;
    }
    var offset = (curRatio * this.map_.getSize()[0]) -
                 (this.element_.width() / 2) +
                 angular.element(this.map_.getViewport()).offset().left;
    this.element_.css({'left': offset});

    this.ngeoLocation_.updateParams({'sliderRatio': curRatio});
    this.map_.render();
  }
};

app.module.controller('AppSliderController', app.SliderController);
