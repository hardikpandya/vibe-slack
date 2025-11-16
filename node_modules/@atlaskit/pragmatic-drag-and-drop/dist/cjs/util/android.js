"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isAndroid = exports.androidFallbackText = void 0;
var _once = require("../public-utils/once");
// Using `once` as the value won't change in a browser

var isAndroid = exports.isAndroid = (0, _once.once)(function isAndroid() {
  return navigator.userAgent.toLocaleLowerCase().includes('android');
});
var androidFallbackText = exports.androidFallbackText = 'pdnd:android-fallback';