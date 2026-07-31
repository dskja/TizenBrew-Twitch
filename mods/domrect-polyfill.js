// DOMRect polyfill for older Tizen versions
if (!window.DOMRect) {
    window.DOMRect = class DOMRect {
        constructor(x = 0, y = 0, width = 0, height = 0) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.top = y;
            this.right = x + width;
            this.bottom = y + height;
            this.left = x;
        }

        static fromRect(rect) {
            return new DOMRect(
                rect.x || 0,
                rect.y || 0,
                rect.width || 0,
                rect.height || 0
            );
        }

        toJSON() {
            return {
                x: this.x,
                y: this.y,
                width: this.width,
                height: this.height,
                top: this.top,
                right: this.right,
                bottom: this.bottom,
                left: this.left
            };
        }
    };
}
