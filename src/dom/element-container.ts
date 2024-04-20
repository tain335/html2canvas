import {CSSParsedDeclaration} from '../css/index';
import {TextContainer} from './text-container';
import {Bounds, nextLine, parseBounds} from '../css/layout/bounds';
import {isHTMLElementNode, isInlineElement, isTextNode} from './node-parser';
import {Context} from '../core/context';
import {DebuggerType, isDebugging} from '../core/debugger';

export const enum FLAGS {
    CREATES_STACKING_CONTEXT = 1 << 1,
    CREATES_REAL_STACKING_CONTEXT = 1 << 2,
    IS_LIST_OWNER = 1 << 3,
    DEBUG_RENDER = 1 << 4
}

const computeTextNodeRect = (context: Context, textNode: Node): {height: number; top: number} => {
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 1);
    const rects = range.getClientRects();
    if (rects.length) {
        return {
            height: rects[0].height,
            top: rects[0].top + context.windowBounds.top
        };
    }
    return {height: 0, top: 0};
};

const computeLineboxRect = (context: Context, element: Element): {top: number; height: number} => {
    if (element.firstChild && isTextNode(element.firstChild)) {
        return computeTextNodeRect(context, element.firstChild);
    } else {
        const span = document.createElement('span');
        span.innerText = 'x';
        span.style.display = 'inline-block';
        element.prepend(span);
        const width = span.getBoundingClientRect().width;
        span.style.marginLeft = -width + 'px';
        const result = computeTextNodeRect(context, span.firstChild as Node);
        span.remove();
        return result;
    }
};

export class ElementContainer {
    readonly styles: CSSParsedDeclaration;
    readonly textNodes: TextContainer[] = [];
    readonly elements: ElementContainer[] = [];
    readonly nodes: (TextContainer | ElementContainer)[] = [];
    readonly host: Element;
    bounds: Bounds;
    flags = 0;

    constructor(protected readonly context: Context, element: Element) {
        if (isDebugging(element, DebuggerType.PARSE)) {
            debugger;
        }
        this.host = element;
        this.styles = new CSSParsedDeclaration(context, window.getComputedStyle(element, null));

        if (isHTMLElementNode(element)) {
            if (this.styles.animationDuration.some((duration) => duration > 0)) {
                element.style.animationDuration = '0s';
            }

            if (this.styles.transform !== null) {
                // getBoundingClientRect takes transforms into account
                element.style.transform = 'none';
            }
        }

        this.bounds = parseBounds(this.context, element);

        if (isDebugging(element, DebuggerType.RENDER)) {
            this.flags |= FLAGS.DEBUG_RENDER;
        }
    }

    realBounds(): Bounds[] {
        if (isInlineElement(this.host)) {
            const lineboxBounds: Bounds[] = [];
            // 仍然没有办法做到完美计算linebox
            const initialLineboxRect = computeLineboxRect(this.context, this.host);
            let bounds: Bounds | null = null;
            const mergeBounds = (b: Bounds) => {
                if (!bounds) {
                    bounds = new Bounds(b.left, initialLineboxRect.top, b.width, initialLineboxRect.height);
                    return;
                }
                if (nextLine(bounds, b)) {
                    lineboxBounds.push(bounds);
                    bounds = new Bounds(b.left, b.top, b.width, initialLineboxRect.height);
                } else {
                    bounds = bounds.join(b);
                }
            };
            this.nodes.forEach((node) => {
                if (node instanceof TextContainer) {
                    const lbs = node.lineboxBounds();
                    lbs.forEach((b) => {
                        mergeBounds(b);
                    });
                } else {
                    const bounds = node.realBounds();
                    bounds.forEach((b) => {
                        mergeBounds(b);
                    });
                }
            });
            if (bounds) {
                lineboxBounds.push(bounds);
            }
            return lineboxBounds;
        } else {
            return [this.bounds];
        }
    }
}
