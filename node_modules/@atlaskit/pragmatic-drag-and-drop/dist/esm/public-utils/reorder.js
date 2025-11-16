import _slicedToArray from "@babel/runtime/helpers/slicedToArray";
/**
 * A function that will reorder an array (`list`).
 * `reorder` returns a new array with reordered items and does not
 *  modify the original array. The items in the array are also not modified.
 */
export function reorder(_ref) {
  var list = _ref.list,
    startIndex = _ref.startIndex,
    finishIndex = _ref.finishIndex;
  if (startIndex === -1 || finishIndex === -1) {
    // Making this function consistently return a new array reference.
    // This is consistent with .toSorted() which always returns a new array
    // even when it does not do anything
    return Array.from(list);
  }
  var result = Array.from(list);
  var _result$splice = result.splice(startIndex, 1),
    _result$splice2 = _slicedToArray(_result$splice, 1),
    removed = _result$splice2[0];
  result.splice(finishIndex, 0, removed);
  return result;
}