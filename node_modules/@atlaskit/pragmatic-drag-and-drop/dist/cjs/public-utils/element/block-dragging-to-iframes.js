"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.blockDraggingToIFrames = blockDraggingToIFrames;
var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));
var _elementAdapter = require("../../adapter/element-adapter");
var _combine = require("../combine");
/**
 * Set a `style` property on a `HTMLElement`
 *
 * @returns a `cleanup` function to restore the `style` property to it's original state
 */
function setStyle(el, _ref) {
  var property = _ref.property,
    rule = _ref.rule,
    _ref$priority = _ref.priority,
    priority = _ref$priority === void 0 ? '' : _ref$priority;
  var originalValue = el.style.getPropertyValue(property);
  var originalPriority = el.style.getPropertyPriority(property);
  el.style.setProperty(property, rule, priority);
  return function cleanup() {
    el.style.setProperty(property, originalValue, originalPriority);
  };
}
var isActive = false;

/**
 * Start blocking dragging to iframes. Only to be called once a drag has started.
 */
function tryStart() {
  // There can technically be multiple registrations on the same element.
  // Adding a guard to ensure that only one registration does the blocking.
  if (isActive) {
    return;
  }
  isActive = true;

  // At this stage, we are also not watching for new iframe elements being added to the page
  // (we _could_ do that as a future change)
  var iframeCleanups = Array.from(document.querySelectorAll('iframe')).map(function (iframe) {
    return setStyle(iframe, {
      property: 'pointer-events',
      rule: 'none',
      priority: 'important'
    });
  });

  // Not returning the cleanup function.
  // This code will clean itself up when the interaction ends in `onDrop()`.
  // Once a drag has started we are blocking iframes until the interaction is finished.
  var cleanup = _combine.combine.apply(void 0, (0, _toConsumableArray2.default)(iframeCleanups).concat([
  // We only need this monitor for listening to the drop
  // as our monitor in `blockDraggingToIFrames()` will only
  // call this function when the drag has started
  (0, _elementAdapter.monitorForElements)({
    onDrop: function onDrop() {
      cleanup();
    }
  }), function release() {
    isActive = false;
  }]));
}

/**
 * Block dragging of a draggable element to <iframe> elements.
 *
 * @description
 *
 * - This function sets `pointer-events:none !important` to all `<iframe>` elements for the duration of the drag.
 * - Once an `<iframe>` is disabled, it will only be re-enabled once the current drag interaction is completed (and not when the `CleanupFn` is called)
 * - This function currently does not watch for new `<iframe>` elements being adding during a drag operation.
 */
function blockDraggingToIFrames(_ref2) {
  var element = _ref2.element;
  return (0, _elementAdapter.monitorForElements)({
    onGenerateDragPreview: function onGenerateDragPreview(_ref3) {
      var source = _ref3.source;
      // only starting if we are dragging the provided element
      if (source.element === element) {
        tryStart();
      }
    }
  });
}