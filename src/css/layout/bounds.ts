import {Context} from '../../core/context';

export class Bounds {
    constructor(readonly left: number, readonly top: number, readonly width: number, readonly height: number) {}

    add(x: number, y: number, w: number, h: number): Bounds {
        return new Bounds(this.left + x, this.top + y, this.width + w, this.height + h);
    }

    join(other: Bounds): Bounds {
        const left = Math.min(this.left, other.left);
        const top = Math.min(this.top, other.top);
        const right = Math.max(this.left + this.width, other.left + other.width);
        const bottom = Math.max(this.top + this.height, other.top + other.height);
        const width = Math.max(this.width, right - left);
        const height = Math.max(this.height, bottom - top);
        return new Bounds(left, top, width, height);
    }

    static fromClientRect(context: Context, clientRect: ClientRect): Bounds {
        return new Bounds(
            clientRect.left + context.windowBounds.left,
            clientRect.top + context.windowBounds.top,
            clientRect.width,
            clientRect.height
        );
    }

    static fromDOMRectList(context: Context, domRectList: DOMRectList): Bounds {
        const domRect = Array.from(domRectList).find((rect) => rect.width !== 0);
        return domRect
            ? new Bounds(
                  domRect.left + context.windowBounds.left,
                  domRect.top + context.windowBounds.top,
                  domRect.width,
                  domRect.height
              )
            : Bounds.EMPTY;
    }

    static EMPTY = new Bounds(0, 0, 0, 0);

    isEqual(other: Bounds): boolean {
        return (
            this.left === other.left &&
            this.top === other.top &&
            this.width === other.width &&
            this.height === other.height
        );
    }
}

export const parseBounds = (context: Context, node: Element): Bounds => {
    return Bounds.fromClientRect(context, node.getBoundingClientRect());
};

export const parseDocumentSize = (document: Document): Bounds => {
    const body = document.body;
    const documentElement = document.documentElement;

    if (!body || !documentElement) {
        throw new Error(`Unable to get document size`);
    }
    const width = Math.max(
        Math.max(body.scrollWidth, documentElement.scrollWidth),
        Math.max(body.offsetWidth, documentElement.offsetWidth),
        Math.max(body.clientWidth, documentElement.clientWidth)
    );

    const height = Math.max(
        Math.max(body.scrollHeight, documentElement.scrollHeight),
        Math.max(body.offsetHeight, documentElement.offsetHeight),
        Math.max(body.clientHeight, documentElement.clientHeight)
    );

    return new Bounds(0, 0, width, height);
};

export const nextLine = (prev: Bounds, next: Bounds): boolean => {
    return next.left <= prev.left + prev.width && next.top >= prev.top + prev.height;
};
