"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.makeMonitor = makeMonitor;
var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));
var _once = require("../public-utils/once");
function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t.return || t.return(); } finally { if (u) throw o; } } }; }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { (0, _defineProperty2.default)(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function makeMonitor() {
  var registry = new Set();
  var dragging = null;
  function tryAddToActive(monitor) {
    if (!dragging) {
      return;
    }
    // Monitor is allowed to monitor events if:
    // 1. It has no `canMonitor` function (default is that a monitor can listen to everything)
    // 2. `canMonitor` returns true
    if (!monitor.canMonitor || monitor.canMonitor(dragging.canMonitorArgs)) {
      dragging.active.add(monitor);
    }
  }
  function monitorForConsumers(args) {
    // We are giving each `args` a new reference so that you
    // can create multiple monitors with the same `args`.
    var entry = _objectSpread({}, args);
    registry.add(entry);

    // if there is an active drag we need to see if this new monitor is relevant
    tryAddToActive(entry);
    function cleanup() {
      registry.delete(entry);

      // We need to stop publishing events during a drag to this monitor!
      if (dragging) {
        dragging.active.delete(entry);
      }
    }

    // Wrapping in `once` to prevent unexpected side effects if consumers call
    // the clean up function multiple times.
    return (0, _once.once)(cleanup);
  }
  function dispatchEvent(_ref) {
    var eventName = _ref.eventName,
      payload = _ref.payload;
    if (eventName === 'onGenerateDragPreview') {
      dragging = {
        canMonitorArgs: {
          initial: payload.location.initial,
          source: payload.source
        },
        active: new Set()
      };
      var _iterator = _createForOfIteratorHelper(registry),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var monitor = _step.value;
          tryAddToActive(monitor);
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    }

    // This should never happen.
    if (!dragging) {
      return;
    }

    // Creating an array from the set _before_ iterating
    // This is so that monitors added during the current event will not be called.
    // This behaviour matches native EventTargets where an event listener
    // cannot add another event listener during an active event to the same
    // event target in the same event (for us we have a single global event target)
    var active = Array.from(dragging.active);
    for (var _i = 0, _active = active; _i < _active.length; _i++) {
      var _monitor = _active[_i];
      // A monitor can be removed by another monitor during an event.
      // We need to check that the monitor is still registered before calling it
      if (dragging.active.has(_monitor)) {
        var _monitor$eventName;
        // @ts-expect-error: I cannot get this type working!
        (_monitor$eventName = _monitor[eventName]) === null || _monitor$eventName === void 0 || _monitor$eventName.call(_monitor, payload);
      }
    }
    if (eventName === 'onDrop') {
      dragging.active.clear();
      dragging = null;
    }
  }
  return {
    dispatchEvent: dispatchEvent,
    monitorForConsumers: monitorForConsumers
  };
}