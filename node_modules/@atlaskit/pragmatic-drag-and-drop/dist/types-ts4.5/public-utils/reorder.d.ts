/**
 * A function that will reorder an array (`list`).
 * `reorder` returns a new array with reordered items and does not
 *  modify the original array. The items in the array are also not modified.
 */
export declare function reorder<Value>({ list, startIndex, finishIndex, }: {
    list: Value[];
    startIndex: number;
    finishIndex: number;
}): Value[];
