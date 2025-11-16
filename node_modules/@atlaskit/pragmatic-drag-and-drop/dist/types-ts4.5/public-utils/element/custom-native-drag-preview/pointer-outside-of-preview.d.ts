import type { GetOffsetFn } from './types';
/** Any valid CSS string value
 * @example `calc(var(--grid) * 2)
 */
type CSSValue = string;
/**
 * Position the native drag preview **in front** of the users pointer.
 *
 * **Distance**
 *
 * If the total width of your preview (including the offset applied by this function)
 * exceeds `280px` then the drag preview will have more opacity applied on Windows.
 *
 * https://atlassian.design/components/pragmatic-drag-and-drop/web-platform-design-constraints
 *
 * **Direction**
 *
 * This function will position the drag preview on the _right hand side for left to right (`ltr`) interfaces_, and on the _left hand side for right to left (`rtl`) languages_.
 *
 * The direction will be calculated based on the direction (`dir`) being applied to the `container`
 * element (which will be a child of the `body` element).
 *
 * **iOS, iPadOS and Android**
 *
 * The drag preview will be centered under the users pointer rather than
 * pushed away on iOS due to platform limitations.
 */
export declare function pointerOutsideOfPreview(point: {
    x: CSSValue;
    y: CSSValue;
}): GetOffsetFn;
export {};
