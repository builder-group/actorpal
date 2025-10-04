import { useCompute, useFeatureState, withLocalStorage } from 'feature-react/state';
import { createState } from 'feature-state';
import { AlignLeftIcon, InfoIcon, TextSearchIcon } from 'lucide-react';
import React from 'react';
import { cn, tokenizeText, type TToken } from '../../lib';

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

	const allTextRevealed = useCompute(
		linesState,
		({ value }) =>
			value.every((line) => line.filter((t) => t.type === 'word').every((t) => t.revealed)),
		[]
	);

	// =========================================================================
	// Events
	// =========================================================================

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

	// =========================================================================
	// UI
	// =========================================================================

	return (
		<div className="not-prose">
			<div className="mb-6">
				<label
					htmlFor="text-input"
					className="text-base-content mb-2 block font-sans text-sm font-semibold"
				>
					Text to Practice
				</label>
				<textarea
					id="text-input"
					value={text}
					onChange={handleTextChange}
					className="border-base-300 bg-base-100 text-base-content focus:border-base-content/30 w-full rounded-lg border-2 px-4 py-3 font-sans text-base leading-relaxed transition-colors focus:outline-none"
					rows={4}
					placeholder="Paste your lines here..."
				/>
			</div>

			<div className="bg-info/10 text-info mb-6 flex max-w-2xl items-start gap-3 rounded-lg p-4">
				<InfoIcon className="mt-0.5 h-5 w-5 shrink-0" />
				<span className="text-sm">
					Each box shows the first letter. Click to reveal words, use arrows for lines. Try
					recalling before clicking.
				</span>
			</div>

			<div className="flex flex-col gap-4">
				{lines.map((line, lineIndex) => {
					const allWordsRevealed = line.filter((t) => t.type === 'word').every((t) => t.revealed);

					return (
						<div key={lineIndex} className="text-base-content flex flex-wrap gap-2 font-sans">
							<button
								onClick={() => toggleLine(lineIndex)}
								className={cn(
									'flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-all duration-200',
									allWordsRevealed
										? 'bg-secondary/20 text-secondary hover:bg-secondary/30'
										: 'bg-base-300 text-base-content/70 hover:bg-base-content/10'
								)}
								title={allWordsRevealed ? 'Hide line' : 'Reveal line'}
							>
								{allWordsRevealed ? (
									<TextSearchIcon className="h-5 w-5" />
								) : (
									<AlignLeftIcon className="h-5 w-5" />
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
											className="bg-info/20 text-info flex h-12 items-center justify-center rounded-lg px-3 text-xl"
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
											className={cn(
												'flex h-12 cursor-pointer items-center justify-center rounded-lg px-3 text-xl font-medium transition-all duration-200',
												token.revealed
													? 'bg-secondary/20 text-secondary hover:bg-secondary/30'
													: 'bg-base-300 text-base-content hover:bg-base-content/10'
											)}
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
					className={cn(
						'flex cursor-pointer items-center gap-2 rounded-lg px-6 py-3 font-sans text-sm font-medium transition-all duration-200',
						allTextRevealed
							? 'bg-secondary text-secondary-content hover:bg-secondary/90'
							: 'bg-neutral text-neutral-content hover:bg-neutral/80'
					)}
				>
					{allTextRevealed ? (
						<TextSearchIcon className="h-4 w-4" />
					) : (
						<AlignLeftIcon className="h-4 w-4" />
					)}
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
