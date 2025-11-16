"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isSafariOnIOS = void 0;
var _once = require("../public-utils/once");
var _isSafari = require("./is-safari");
// Using `once` as the value won't change in a browser

/**
 * **Notes**
 *
 * All browsers on iOS (Safari, Chrome, Firefox) use the same rendering engine (Safari / Webkit).
 *
 * → https://developer.apple.com/app-store/review/guidelines/ (see 2.5.6)
 *
 * There is some ongoing change in this space, and we might see some new browser
 * engines soon on iOS (at least in Europe)
 *
 * → https://developer.apple.com/support/alternative-browser-engines/
 **/

/**
 * Returns `true` if browser is Safari (WebKit) on iOS.
 */
var isSafariOnIOS = exports.isSafariOnIOS = (0, _once.once)(function isSafariOnIOS() {
  if (process.env.NODE_ENV === 'test') {
    return false;
  }
  return (0, _isSafari.isSafari)() && 'ontouchend' in document;
});