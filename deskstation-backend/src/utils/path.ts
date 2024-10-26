class Path {
    private segments: string[];

    constructor(path: string) {
        this.segments =  path.split('/').filter(segment => segment !== '');
        if (path.startsWith('/')) {
            this.segments.unshift('/');
        }
    }
    getSegments(): string[] {
        return this.segments;
    }
    public toString(): string {
        if (this.segments[0] === '/') {
            return '/' + this.segments.slice(1).join('/');
        }
        return this.segments.join('/');
    }
    public isRoot(): boolean {
        return this.segments.length === 1 && this.segments[0] === '/';
    }
    public isAbsolute(): boolean {
        return this.segments[0] === '/';
    }
    public parentPath(): Path {
        if (this.isRoot()) {
            return this;
        }
        return new Path(this.segments.slice(0, -1).join('/'));
    }
    public join(path: string | Path): Path {
        const otherPath = path instanceof Path ? path : new Path(path);
        if (otherPath.isAbsolute()) {
            return otherPath;
        }
        const newSegments = [...this.segments, ...otherPath.getSegments()];
        return new Path(newSegments.join('/'));
    }

    public static join(...paths: (string | Path)[]): Path {
        if (paths.length === 0) {
            return new Path('');
        }
        let result = paths[0] instanceof Path ? paths[0] : new Path(paths[0] as string);
        for (let i = 1; i < paths.length; i++) {
            result = result.join(paths[i]);
        }
        return result;
    }
}

export default Path;