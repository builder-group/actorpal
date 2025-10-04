import { describe, expect, it } from 'vitest';
import { tokenizeText } from './tokenize-text';

describe('tokenizeText', () => {
	it('tokenizes simple sentence with words and spaces', () => {
		const result = tokenizeText('hello world');

		expect(result).toEqual([
			{ type: 'word', original: 'hello', display: 'h' },
			{ type: 'space', original: ' ', display: ' ' },
			{ type: 'word', original: 'world', display: 'w' }
		]);
	});

	it('groups consecutive punctuation together', () => {
		const result = tokenizeText('I bought it... really!');

		expect(result).toEqual([
			{ type: 'word', original: 'I', display: 'I' },
			{ type: 'space', original: ' ', display: ' ' },
			{ type: 'word', original: 'bought', display: 'b' },
			{ type: 'space', original: ' ', display: ' ' },
			{ type: 'word', original: 'it', display: 'i' },
			{ type: 'punctuation', original: '...', display: '...' },
			{ type: 'space', original: ' ', display: ' ' },
			{ type: 'word', original: 'really', display: 'r' },
			{ type: 'punctuation', original: '!', display: '!' }
		]);
	});

	it('strips contractions from words', () => {
		const result = tokenizeText("I can't do it!");

		expect(result).toEqual([
			{ type: 'word', original: 'I', display: 'I' },
			{ type: 'space', original: ' ', display: ' ' },
			{ type: 'word', original: 'can', display: 'c' },
			{ type: 'space', original: ' ', display: ' ' },
			{ type: 'word', original: 'do', display: 'd' },
			{ type: 'space', original: ' ', display: ' ' },
			{ type: 'word', original: 'it', display: 'i' },
			{ type: 'punctuation', original: '!', display: '!' }
		]);
	});

	it('preserves newlines', () => {
		const result = tokenizeText('hello\nworld');

		expect(result).toEqual([
			{ type: 'word', original: 'hello', display: 'h' },
			{ type: 'newline', original: '\n', display: '\n' },
			{ type: 'word', original: 'world', display: 'w' }
		]);
	});

	it('handles empty string', () => {
		expect(tokenizeText('')).toEqual([]);
	});
});
