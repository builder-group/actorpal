export class TextStream {
	private _text: string;
	private _pos: number;
	private _end: number;

	constructor(text: string) {
		this._text = text;
		this._pos = 0;
		this._end = text.length;
	}

	atEnd(): boolean {
		return this._pos >= this._end;
	}

	currChar(): string | null {
		if (this.atEnd()) {
			return null;
		}
		return this._text[this._pos] ?? null;
	}

	advance(n: number = 1): void {
		this._pos += n;
	}

	consumeWhile(predicate: (char: string) => boolean): string {
		const start = this._pos;
		while (!this.atEnd()) {
			const char = this.currChar();
			if (char == null || !predicate(char)) {
				break;
			}
			this.advance();
		}
		return this._text.slice(start, this._pos);
	}
}
