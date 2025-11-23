import {
	BarChart2Icon,
	ClockIcon,
	MonitorIcon,
	PauseIcon,
	PlayIcon,
	RotateCcwIcon,
	SettingsIcon
} from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router';
import { Err, Ok } from 'tuple-result';
import { specta } from '@/environment';
import { resultLoader, toTuple, withResultLoader } from '@/lib';

const Page = withResultLoader<TSuccessLoaderData, TErrorLoaderData>({
	Success: ({ data }) => {
		const {
			windowActivities,
			appActivities,
			settings: { pomodoro: pomodoroSettings },
			currentApp,
			currentWindow
		} = data;
		const navigate = useNavigate();

		const [timerState, setTimerState] = React.useState<TTimerState>({
			timeLeft: pomodoroSettings.focusDuration * 60,
			isActive: false,
			phase: 'focus',
			currentRound: 1
		});

		const [activeApp, setActiveApp] = React.useState<specta.AppInfo | null>(currentApp);
		const [activeWindow, setActiveWindow] = React.useState<specta.WindowInfo | null>(currentWindow);
		const unlistenAppRef = React.useRef<(() => void) | null>(null);
		const unlistenWindowRef = React.useRef<(() => void) | null>(null);

		// =============================================================================
		// Events
		// =============================================================================

		const getDurationForPhase = React.useCallback(
			(phase: TPomodoroPhase, currentSettings: specta.PomodoroSettings) => {
				switch (phase) {
					case 'focus':
						return currentSettings.focusDuration;
					case 'shortBreak':
						return currentSettings.shortBreakDuration;
					case 'longBreak':
						return currentSettings.longBreakDuration;
				}
			},
			[]
		);

		const handleTimerComplete = React.useCallback(() => {
			// TODO: Play sound / Notification via Tauri
			// specta.commands.notify('Timer Complete');

			switch (timerState.phase) {
				case 'focus': {
					const isLongBreak = timerState.currentRound % pomodoroSettings.rounds === 0;
					setTimerState({
						timeLeft:
							(isLongBreak
								? pomodoroSettings.longBreakDuration
								: pomodoroSettings.shortBreakDuration) * 60,
						isActive: false,
						phase: isLongBreak ? 'longBreak' : 'shortBreak',
						currentRound: timerState.currentRound
					});
					break;
				}
				case 'shortBreak':
				case 'longBreak':
					setTimerState({
						timeLeft: pomodoroSettings.focusDuration * 60,
						isActive: false,
						phase: 'focus',
						currentRound: timerState.currentRound + 1
					});
					break;
			}
		}, [pomodoroSettings, timerState.phase, timerState.currentRound]);

		const toggleTimer = React.useCallback(() => {
			if (!timerState.isActive) {
				// TODO: Tell Tauri to start blocking sites
				// specta.commands.startBlocking(pomodoroSettings.blockedSites);
			} else {
				// TODO: Tell Tauri to stop blocking sites
				// specta.commands.stopBlocking();
			}
			setTimerState((prev) => ({ ...prev, isActive: !prev.isActive }));
		}, [timerState.isActive]);

		const resetTimer = React.useCallback(() => {
			// TODO: Tell Tauri to stop blocking sites
			// specta.commands.stopBlocking();
			setTimerState({
				timeLeft: getDurationForPhase(timerState.phase, pomodoroSettings) * 60,
				isActive: false,
				phase: timerState.phase,
				currentRound: timerState.currentRound
			});
		}, [getDurationForPhase, timerState.phase, timerState.currentRound, pomodoroSettings]);

		const skipPhase = React.useCallback(() => {
			handleTimerComplete();
		}, [handleTimerComplete]);

		// =============================================================================
		// Effects
		// =============================================================================

		// Timer Interval
		React.useEffect(() => {
			let interval: NodeJS.Timeout;

			if (timerState.isActive && timerState.timeLeft > 0) {
				interval = setInterval(() => {
					setTimerState((prev) => ({
						...prev,
						timeLeft: prev.timeLeft - 1
					}));
				}, 1000);
			}

			return () => clearInterval(interval);
		}, [timerState.isActive, timerState.timeLeft]);

		// Completion Check
		React.useEffect(() => {
			if (timerState.timeLeft === 0 && timerState.isActive) {
				handleTimerComplete();
			}
		}, [timerState.timeLeft, timerState.isActive, handleTimerComplete]);

		// Update timer when settings change (if not active)
		React.useEffect(() => {
			if (!timerState.isActive) {
				setTimerState((prev) => ({
					...prev,
					timeLeft: getDurationForPhase(prev.phase, pomodoroSettings) * 60
				}));
			}
		}, [pomodoroSettings, timerState.isActive, getDurationForPhase, timerState.phase]);

		// Listen to active app/window changes
		React.useEffect(() => {
			setActiveApp(currentApp);
			setActiveWindow(currentWindow);

			(async () => {
				unlistenAppRef.current = await specta.events.activeAppChangedEvent.listen((event) => {
					setActiveApp(event.payload.data);
				});

				unlistenWindowRef.current = await specta.events.activeWindowChangedEvent.listen((event) => {
					setActiveWindow(event.payload.data);
				});
			})();

			return () => {
				if (unlistenAppRef.current != null) {
					unlistenAppRef.current();
					unlistenAppRef.current = null;
				}
				if (unlistenWindowRef.current != null) {
					unlistenWindowRef.current();
					unlistenWindowRef.current = null;
				}
			};
		}, [currentApp, currentWindow]);

		// =============================================================================
		// UI
		// =============================================================================

		// Calculate progress for circle
		const totalTime = getDurationForPhase(timerState.phase, pomodoroSettings) * 60;
		const progress = ((totalTime - timerState.timeLeft) / totalTime) * 100;

		return (
			<div className="flex min-h-screen flex-col bg-gray-50 text-gray-900">
				{/* Fixed Header */}
				<header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-8 py-6 shadow-sm">
					<div className="mx-auto max-w-4xl">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
									<ClockIcon className="h-6 w-6" />
								</div>
								<div>
									<h1 className="text-xl font-bold text-gray-900">Isshin Focus</h1>
									<p className="text-xs font-medium text-gray-500">Pomodoro Timer</p>
								</div>
							</div>
							<button
								onClick={() => navigate('/settings', { state: { source: 'main' } })}
								className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
							>
								<SettingsIcon className="h-6 w-6" />
							</button>
						</div>
					</div>
				</header>

				{/* Main Content */}
				<main className="flex flex-1 flex-col items-center justify-center p-8 pb-20">
					<div className="flex flex-col items-center gap-12">
						{/* Phase Indicators */}
						<div className="flex items-center gap-2 rounded-full bg-white p-1 shadow-sm ring-1 ring-gray-200">
							{(['focus', 'shortBreak', 'longBreak'] as const).map((p) => (
								<div
									key={p}
									className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
										timerState.phase === p
											? 'bg-indigo-600 text-white shadow-sm'
											: 'text-gray-500 hover:text-gray-700'
									}`}
								>
									{p === 'focus' ? 'Focus' : p === 'shortBreak' ? 'Short Break' : 'Long Break'}
								</div>
							))}
						</div>

						{/* Timer Circle */}
						<div className="relative flex h-90 w-90 items-center justify-center">
							{/* Background Circle */}
							<svg className="absolute h-full w-full -rotate-90" viewBox="0 0 100 100">
								<circle
									cx="50"
									cy="50"
									r="45"
									fill="none"
									stroke="currentColor"
									strokeWidth="4"
									className="text-gray-200"
								/>
								{/* Progress Circle */}
								<circle
									cx="50"
									cy="50"
									r="45"
									fill="none"
									stroke="currentColor"
									strokeWidth="4"
									strokeLinecap="round"
									strokeDasharray="283"
									strokeDashoffset={283 - (283 * progress) / 100}
									className={`transition-all duration-1000 ease-linear ${
										timerState.isActive ? 'text-indigo-600' : 'text-gray-400'
									}`}
								/>
							</svg>

							{/* Time Display */}
							<div className="absolute flex flex-col items-center">
								<span className="text-7xl font-bold tracking-tighter text-gray-900 tabular-nums">
									{Math.floor(timerState.timeLeft / 60)
										.toString()
										.padStart(2, '0')}
									:{(timerState.timeLeft % 60).toString().padStart(2, '0')}
								</span>
								<span className="mt-2 text-sm font-medium text-gray-500">
									Round {timerState.currentRound} / {pomodoroSettings.rounds}
								</span>
							</div>
						</div>

						{/* Controls */}
						<div className="grid w-full max-w-60 grid-cols-3 items-center">
							{/* Left: Reset */}
							<div className="flex justify-start">
								<button
									onClick={resetTimer}
									className="group rounded-full p-4 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
									title="Reset Timer"
								>
									<RotateCcwIcon className="h-6 w-6 transition-transform group-hover:-rotate-180" />
								</button>
							</div>

							{/* Center: Play/Pause (always centered) */}
							<div className="flex justify-center">
								<button
									onClick={toggleTimer}
									className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-200 transition-transform hover:scale-105 active:scale-95"
								>
									{timerState.isActive ? (
										<PauseIcon className="h-8 w-8 fill-current" />
									) : (
										<PlayIcon className="ml-1 h-8 w-8 fill-current" />
									)}
								</button>
							</div>

							{/* Right: Skip (conditionally visible) */}
							<div className="flex justify-end">
								{timerState.isActive && (
									<button
										onClick={skipPhase}
										className="rounded-full p-4 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
										title="Skip Phase"
									>
										<span className="text-xs font-bold tracking-wider uppercase">Skip</span>
									</button>
								)}
							</div>
						</div>
					</div>
				</main>

				{/* Footer Sections */}
				<footer className="border-t border-gray-200 bg-white px-8 py-6">
					<div className="mx-auto max-w-4xl space-y-6">
						{/* Activity Summary */}
						<section>
							<div className="flex items-center gap-3 text-gray-500">
								<BarChart2Icon className="h-5 w-5" />
								<h3 className="text-sm font-medium tracking-wider uppercase">Activity Summary</h3>
							</div>
							<div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
								<div className="rounded-lg bg-gray-50 p-4">
									<p className="text-xs text-gray-500">Total Activities</p>
									<p className="text-xl font-bold text-gray-900">
										{windowActivities.length + appActivities.length}
									</p>
								</div>
								<div className="rounded-lg bg-gray-50 p-4">
									<p className="text-xs text-gray-500">Focus Score</p>
									<p className="text-xl font-bold text-indigo-600">--</p>
								</div>
							</div>
						</section>

						{/* Currently Active */}
						<section>
							<div className="flex items-center gap-3 text-gray-500">
								<MonitorIcon className="h-5 w-5" />
								<h3 className="text-sm font-medium tracking-wider uppercase">Currently Active</h3>
							</div>
							<div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-2">
								<div className="rounded-lg bg-gray-50 p-4">
									<p className="text-xs text-gray-500">Active App</p>
									<p className="mt-1 truncate text-xl font-bold text-gray-900">
										{activeApp?.name ?? '--'}
									</p>
								</div>
								<div className="rounded-lg bg-gray-50 p-4">
									<p className="text-xs text-gray-500">Active Window</p>
									<p className="mt-1 truncate text-xl font-bold text-gray-900">
										{activeWindow?.title ?? activeWindow?.app.name ?? '--'}
									</p>
								</div>
							</div>
						</section>
					</div>
				</footer>
			</div>
		);
	},
	Error: ({ error }) => (
		<div className="flex min-h-screen items-center justify-center bg-gray-50 p-8">
			<div className="rounded-lg border border-red-200 bg-red-50 px-8 py-6 text-center shadow-sm">
				<p className="text-lg font-medium text-red-900">Failed to load application</p>
				<p className="mt-2 text-sm text-red-700">{String(error)}</p>
			</div>
		</div>
	)
});

export default Page;

export const clientLoader = resultLoader<TSuccessLoaderData, TErrorLoaderData>(async () => {
	const [
		[isWindowActivitiesOk, , windowActivities],
		[isAppActivitiesOk, , appActivities],
		[areSettingsOk, areSettingsError, settings],
		[isCurrentAppOk, , currentApp],
		[isCurrentWindowOk, , currentWindow]
	] = await Promise.all([
		toTuple(await specta.commands.getWindowActivities()),
		toTuple(await specta.commands.getAppActivities()),
		toTuple(await specta.commands.getSettings()),
		toTuple(await specta.commands.getCurrentActiveApp()),
		toTuple(await specta.commands.getCurrentActiveWindow())
	]);

	if (!areSettingsOk) {
		return Err(`Failed to load settings: ${areSettingsError}`);
	}

	return Ok({
		windowActivities: isWindowActivitiesOk ? windowActivities : [],
		appActivities: isAppActivitiesOk ? appActivities : [],
		settings,
		currentApp: isCurrentAppOk ? currentApp : null,
		currentWindow: isCurrentWindowOk ? currentWindow : null
	});
});

type TPomodoroPhase = 'focus' | 'shortBreak' | 'longBreak';

interface TTimerState {
	timeLeft: number;
	isActive: boolean;
	phase: TPomodoroPhase;
	currentRound: number;
}

interface TSuccessLoaderData {
	windowActivities: specta.WindowActivity[];
	appActivities: specta.AppActivity[];
	settings: specta.AppSettings;
	currentApp: specta.AppInfo | null;
	currentWindow: specta.WindowInfo | null;
}

type TErrorLoaderData = string;
