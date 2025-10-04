import { TextStream } from './TextStream';

export function tokenizeText(text: string): TToken[] {
	const tokens: TToken[] = [];
	const stream = new TextStream(text);

	while (!stream.atEnd()) {
		const char = stream.currChar();

		if (char == null) {
			break;
		}

		if (char === '\n') {
			tokens.push({
				type: 'newline',
				original: char,
				display: char
			});
			stream.advance();
		} else if (isSpace(char)) {
			const spaces = stream.consumeWhile(isSpace);
			tokens.push({
				type: 'space',
				original: spaces,
				display: spaces
			});
		} else if (isLetter(char)) {
			const word = stream.consumeWhile(isLetter);
			let fullWord = word;

			// Check if there's a contraction (apostrophe + letters)
			const nextChar = stream.currChar();
			if (nextChar === "'") {
				// Include the apostrophe and contraction in original
				stream.advance(); // skip '
				const contraction = stream.consumeWhile(isLetter); // get 't, 'm, 's, etc.
				fullWord = word + "'" + contraction;
			}

			tokens.push({
				type: 'word',
				original: fullWord,
				display: word.charAt(0)
			});
		} else {
			// Punctuation - consume all consecutive punctuation characters
			const punctuation = stream.consumeWhile(isPunctuation);
			tokens.push({
				type: 'punctuation',
				original: punctuation,
				display: punctuation
			});
		}
	}

	return tokens;
}

export type TToken = {
	type: 'word' | 'punctuation' | 'space' | 'newline';
	original: string;
	display: string;
};

function isLetter(char: string): boolean {
	return /[a-zA-Z]/.test(char);
}

function isSpace(char: string): boolean {
	return char === ' ' || char === '\t';
}

function isPunctuation(char: string): boolean {
	return !isLetter(char) && !isSpace(char) && char !== '\n';
}
