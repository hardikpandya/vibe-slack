import { once } from '../public-utils/once';

// Using `once` as the value won't change in a browser

export var isAndroid = once(function isAndroid() {
  return navigator.userAgent.toLocaleLowerCase().includes('android');
});
export var androidFallbackText = 'pdnd:android-fallback';