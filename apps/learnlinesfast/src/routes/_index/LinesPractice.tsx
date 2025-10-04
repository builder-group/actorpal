import { useFeatureState, withLocalStorage } from 'feature-react/state';
import { createState } from 'feature-state';
import { Info, SquareChevronDown, SquareChevronRight } from 'lucide-react';
import React from 'react';
import { tokenizeText, type TToken } from '../../lib';

export const LinesPractice: React.FC<TLinesPracticeProps> = (props) => {
	const {
		defaultText = `I bought it... I bought it!
One moment...wait...if you would,
ladies and gentlemen... My head's
going round and round, I can't
speak... So now the cherry orchard
is mine! Mine! Great God in heaven
– the cherry orchard is mine!
Tell me I'm drunk – I'm out of my
mind – tell me it's all an illusion ...`
	} = props;

	const textState = React.useMemo(() => {
		const state = withLocalStorage(createState(defaultText), 'text');
		return state;
	}, [defaultText]);
	const text = useFeatureState(textState);

	const linesState = React.useMemo(() => {
		const tokens = tokenizeText(text);
		const lines: TRevealableToken[][] = [];
		let currentLine: TRevealableToken[] = [];

		for (const token of tokens) {
			if (token.type === 'newline') {
				if (currentLine.length > 0) {
					lines.push(currentLine);
					currentLine = [];
				}
			} else {
				currentLine.push({ ...token, revealed: false });
			}
		}
		if (currentLine.length > 0) {
			lines.push(currentLine);
		}

		const state = withLocalStorage(createState(lines), 'lines');
		return state;
	}, [text]);
	const lines = useFeatureState(linesState);

	const allTextRevealed = React.useMemo(
		() => lines.every((line) => line.filter((t) => t.type === 'word').every((t) => t.revealed)),
		[lines]
	);

	const handleTextChange = React.useCallback(
		(event: React.ChangeEvent<HTMLTextAreaElement>) => {
			textState._v = event.target.value;
			textState._notify();
		},
		[textState]
	);

	const toggleLine = React.useCallback(
		(lineIndex: number) => {
			const line = linesState._v[lineIndex];
			if (line == null) return;

			const allWordsRevealed = line.filter((t) => t.type === 'word').every((t) => t.revealed);

			for (const token of line) {
				if (token.type === 'word') {
					token.revealed = !allWordsRevealed;
				}
			}

			linesState._notify();
		},
		[linesState]
	);

	const toggleWord = React.useCallback(
		(lineIndex: number, tokenIndex: number) => {
			const token = linesState._v[lineIndex]?.[tokenIndex];
			if (token == null || token.type !== 'word') return;

			token.revealed = !token.revealed;
			linesState._notify();
		},
		[linesState]
	);

	const toggleAllText = React.useCallback(() => {
		const allWordsRevealed = linesState._v.every((line) =>
			line.filter((t) => t.type === 'word').every((t) => t.revealed)
		);

		for (const line of linesState._v) {
			for (const token of line) {
				if (token.type === 'word') {
					token.revealed = !allWordsRevealed;
				}
			}
		}

		linesState._notify();
	}, [linesState]);

	return (
		<div className="not-prose">
			<div className="mb-6">
				<label
					htmlFor="text-input"
					className="mb-2 block font-sans text-sm font-semibold text-neutral-700"
				>
					Text to Practice
				</label>
				<textarea
					id="text-input"
					value={text}
					onChange={handleTextChange}
					className="focus:border-secondary focus:ring-secondary/20 w-full rounded-lg border-2 border-neutral-200 px-4 py-3 font-sans text-base leading-relaxed text-neutral-900 transition-colors focus:ring-2 focus:outline-none"
					rows={4}
					placeholder="Paste your lines here..."
				/>
			</div>

			<div className="mb-6 flex max-w-2xl items-start gap-3 rounded-lg bg-blue-50 p-4 text-blue-800">
				<Info className="mt-0.5 h-5 w-5 shrink-0" />
				<span className="text-sm">
					Each box shows the first letter. Click to reveal words, use arrows for lines. Try
					recalling before clicking.
				</span>
			</div>

			<div className="flex flex-col gap-4">
				{lines.map((line, lineIndex) => {
					const allWordsRevealed = line.filter((t) => t.type === 'word').every((t) => t.revealed);

					return (
						<div key={lineIndex} className="flex flex-wrap gap-2 font-sans text-neutral-700">
							<button
								onClick={() => toggleLine(lineIndex)}
								className={`flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-all duration-200 ${
									allWordsRevealed
										? 'bg-secondary/20 text-secondary hover:bg-secondary/30'
										: 'bg-neutral-200/60 text-neutral-500 hover:bg-neutral-300/60 hover:text-neutral-700'
								}`}
								title={allWordsRevealed ? 'Hide line' : 'Reveal line'}
							>
								{allWordsRevealed ? (
									<SquareChevronDown className="h-5 w-5" />
								) : (
									<SquareChevronRight className="h-5 w-5" />
								)}
							</button>

							{line.map((token, tokenIndex) => {
								if (token.type === 'space') {
									return null;
								}

								if (token.type === 'punctuation') {
									return (
										<div
											key={tokenIndex}
											className="flex h-12 items-center justify-center rounded-lg bg-blue-100 px-3 text-xl text-blue-700"
										>
											{token.display}
										</div>
									);
								}

								if (token.type === 'word') {
									return (
										<div
											key={tokenIndex}
											onClick={() => toggleWord(lineIndex, tokenIndex)}
											className={`flex h-12 cursor-pointer items-center justify-center rounded-lg px-3 text-xl font-medium transition-all duration-200 hover:shadow-md ${
												token.revealed
													? 'bg-secondary/20 text-secondary hover:bg-secondary/30'
													: 'hover:bg-secondary/20 hover:text-secondary bg-neutral-100'
											}`}
										>
											{token.revealed ? token.original : token.display}
										</div>
									);
								}

								return null;
							})}
						</div>
					);
				})}
			</div>

			<div className="mt-6">
				<button
					onClick={toggleAllText}
					className={`rounded-lg px-6 py-3 font-sans text-sm font-medium transition-all duration-200 ${
						allTextRevealed
							? 'bg-secondary hover:bg-secondary/90 text-white'
							: 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
					}`}
				>
					{allTextRevealed ? 'Hide All' : 'Reveal All'}
				</button>
			</div>
		</div>
	);
};

interface TLinesPracticeProps {
	defaultText?: string;
}

type TRevealableToken = TToken & { revealed: boolean };
