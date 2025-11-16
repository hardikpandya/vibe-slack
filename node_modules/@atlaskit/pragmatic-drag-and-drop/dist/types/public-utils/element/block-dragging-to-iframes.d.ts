import { type CleanupFn } from '../../internal-types';
/**
 * Block dragging of a draggable element to <iframe> elements.
 *
 * @description
 *
 * - This function sets `pointer-events:none !important` to all `<iframe>` elements for the duration of the drag.
 * - Once an `<iframe>` is disabled, it will only be re-enabled once the current drag interaction is completed (and not when the `CleanupFn` is called)
 * - This function currently does not watch for new `<iframe>` elements being adding during a drag operation.
 */
export declare function blockDraggingToIFrames({ element }: {
    element: HTMLElement;
}): CleanupFn;
