import {CSSParsedDeclaration} from '../css/index';
import {TEXT_TRANSFORM} from '../css/property-descriptors/text-transform';
import {parseTextBounds, TextBounds} from '../css/layout/text';
import {Context} from '../core/context';
import {Bounds, nextLine} from '../css/layout/bounds';

export class TextContainer {
    text: string;
    textBounds: TextBounds[];

    constructor(context: Context, node: Text, styles: CSSParsedDeclaration) {
        this.text = transform(node.data, styles.textTransform);
        this.textBounds = parseTextBounds(context, this.text, styles, node);
    }

    lineboxBounds(): Bounds[] {
        const lineBounds: Bounds[] = [];
        let bounds: Bounds | null = null;
        this.textBounds.forEach((t) => {
            if (!bounds) {
                bounds = t.bounds;
                return;
            }
            if (nextLine(bounds, t.bounds)) {
                lineBounds.push(bounds);
                bounds = t.bounds;
            }
            bounds = bounds.join(t.bounds);
        });
        if (bounds) {
            lineBounds.push(bounds);
        }
        return lineBounds;
    }
}

const transform = (text: string, transform: TEXT_TRANSFORM) => {
    switch (transform) {
        case TEXT_TRANSFORM.LOWERCASE:
            return text.toLowerCase();
        case TEXT_TRANSFORM.CAPITALIZE:
            return text.replace(CAPITALIZE, capitalize);
        case TEXT_TRANSFORM.UPPERCASE:
            return text.toUpperCase();
        default:
            return text;
    }
};

const CAPITALIZE = /(^|\s|:|-|\(|\))([a-z])/g;

const capitalize = (m: string, p1: string, p2: string) => {
    if (m.length > 0) {
        return p1 + p2.toUpperCase();
    }

    return m;
};
