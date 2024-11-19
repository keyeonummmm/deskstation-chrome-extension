"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Path {
    constructor(path) {
        this.segments = path.split('/').filter(segment => segment !== '');
        if (path.startsWith('/')) {
            this.segments.unshift('/');
        }
    }
    getSegments() {
        return this.segments;
    }
    toString() {
        if (this.segments[0] === '/') {
            return '/' + this.segments.slice(1).join('/');
        }
        return this.segments.join('/');
    }
    isRoot() {
        return this.segments.length === 1 && this.segments[0] === '/';
    }
    isAbsolute() {
        return this.segments[0] === '/';
    }
    parentPath() {
        if (this.isRoot()) {
            return this;
        }
        return new Path(this.segments.slice(0, -1).join('/'));
    }
    join(path) {
        const otherPath = path instanceof Path ? path : new Path(path);
        if (otherPath.isAbsolute()) {
            return otherPath;
        }
        const newSegments = [...this.segments, ...otherPath.getSegments()];
        return new Path(newSegments.join('/'));
    }
    static join(...paths) {
        if (paths.length === 0) {
            return new Path('');
        }
        let result = paths[0] instanceof Path ? paths[0] : new Path(paths[0]);
        for (let i = 1; i < paths.length; i++) {
            result = result.join(paths[i]);
        }
        return result;
    }
}
exports.default = Path;
