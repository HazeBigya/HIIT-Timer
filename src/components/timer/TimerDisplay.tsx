import { memo, useMemo } from 'react'
import { ChevronLeft, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import { PHASES } from '../../constants/workoutConstants'
import type { TimerHookResult, TimerPhaseKey, WorkoutConfig } from '../../types'
import { calculateSingleSetDuration, formatSecondsToClock } from '../../utils/timeHelpers'

interface TimerDisplayProps extends TimerHookResult {
  rounds: WorkoutConfig['rounds']
  totalSets: WorkoutConfig['totalSets']
  exerciseTime: WorkoutConfig['exerciseTime']
  restTime: WorkoutConfig['restTime']
  onBack: () => void
}

const PHASE_TONES: Record<
  TimerPhaseKey,
  {
    stroke: string
    chip: string
    glow: string
    button: string
    ringFilter: string
  }
> = {
  warmup: {
    stroke: '#60a5fa',
    chip: 'text-sky-200 bg-sky-400/10 border-sky-300/20',
    glow: 'bg-sky-400/20',
    button: 'from-sky-500 to-blue-500',
    ringFilter: 'drop-shadow(0 0 15px rgba(96, 165, 250, 0.5))',
  },
  exercise: {
    stroke: '#f87171',
    chip: 'text-rose-200 bg-rose-400/10 border-rose-300/20',
    glow: 'bg-rose-400/20',
    button: 'from-rose-500 to-red-500',
    ringFilter: 'drop-shadow(0 0 15px rgba(239, 68, 68, 0.5))',
  },
  rest: {
    stroke: '#4ade80',
    chip: 'text-emerald-200 bg-emerald-400/10 border-emerald-300/20',
    glow: 'bg-emerald-400/20',
    button: 'from-emerald-500 to-green-500',
    ringFilter: 'drop-shadow(0 0 15px rgba(34, 197, 94, 0.5))',
  },
  'set-rest': {
    stroke: '#22d3ee',
    chip: 'text-cyan-100 bg-cyan-400/10 border-cyan-300/20',
    glow: 'bg-cyan-400/20',
    button: 'from-cyan-500 to-sky-500',
    ringFilter: 'drop-shadow(0 0 15px rgba(34, 211, 238, 0.5))',
  },
  cooldown: {
    stroke: '#a78bfa',
    chip: 'text-violet-100 bg-violet-400/10 border-violet-300/20',
    glow: 'bg-violet-400/20',
    button: 'from-violet-500 to-indigo-500',
    ringFilter: 'drop-shadow(0 0 15px rgba(167, 139, 250, 0.5))',
  },
  finished: {
    stroke: '#cbd5e1',
    chip: 'text-slate-100 bg-slate-400/10 border-slate-300/20',
    glow: 'bg-slate-300/20',
    button: 'from-slate-400 to-slate-500',
    ringFilter: 'drop-shadow(0 0 12px rgba(203, 213, 225, 0.35))',
  },
}

function TimerDisplay({
  currentPhase,
  phaseKey,
  timeLeft,
  currentRound,
  currentSet,
  rounds,
  totalSets,
  exerciseTime,
  restTime,
  totalTimeRemaining,
  phaseDuration,
  isRunning,
  isMuted,
  toggleMute,
  play,
  pause,
  reset,
  onBack,
}: TimerDisplayProps) {
  const size = 320
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const tone = PHASE_TONES[phaseKey]
  const singleSetDuration = useMemo(
    () => calculateSingleSetDuration({ exerciseTime, restTime, rounds }),
    [exerciseTime, restTime, rounds],
  )

  const calculateOffset = useMemo(() => {
    if (phaseKey === PHASES.FINISHED || phaseDuration <= 0) {
      return circumference
    }

    const progressRatio = Math.max(0, Math.min(1, timeLeft / phaseDuration))
    return circumference * (1 - progressRatio)
  }, [circumference, phaseDuration, phaseKey, timeLeft])

  return (
    <section className="flex min-h-[75vh] w-full flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-900/40 to-slate-950/40 px-4 py-6 text-white">
      <div className="flex w-full max-w-xl items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to settings"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/10"
        >
          <ChevronLeft size={18} />
          <span>Back to Settings</span>
        </button>

        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] backdrop-blur-md ${tone.chip}`}>
          {currentPhase}
        </span>

        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
          aria-pressed={isMuted}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white shadow-[0_10px_30px_rgba(15,23,42,0.2)] backdrop-blur-md transition hover:bg-white/10"
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>

      <div className="relative flex h-[20rem] w-[20rem] items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-xl sm:h-[26rem] sm:w-[26rem]">
        <div className={`absolute inset-10 rounded-full ${tone.glow} blur-3xl`} />

        <svg
          className="absolute inset-0 h-full w-full -rotate-90"
          viewBox={`0 0 ${size} ${size}`}
          style={{ filter: tone.ringFilter }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={tone.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{
              strokeDashoffset: calculateOffset,
              transition: 'stroke-dashoffset 1s linear',
            }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-200/80">
            {phaseKey === PHASES.FINISHED ? 'FINISHED' : currentPhase.toUpperCase()}
          </div>
          <div className="text-8xl font-black tabular-nums tracking-tighter text-white">
            {formatSecondsToClock(timeLeft)}
          </div>
          <div className="mt-3 text-sm text-slate-200/80">
            Set {Math.min(Math.max(currentSet, 1), totalSets)}/{totalSets} • Round {Math.min(Math.max(currentRound, 1), rounds)}/{rounds}
          </div>
          <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-300/70">
            Remaining {formatSecondsToClock(totalTimeRemaining)}
          </div>
        </div>
      </div>

      <div className="grid w-full max-w-md grid-cols-2 gap-3 rounded-[24px] border border-white/10 bg-white/5 p-3 text-white backdrop-blur-md">
        <div className="rounded-2xl bg-slate-950/30 px-4 py-3">
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-300/80">
            Single Set Duration
          </div>
          <div className="mt-1 text-lg font-semibold tabular-nums text-white">
            {formatSecondsToClock(singleSetDuration)}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-950/30 px-4 py-3">
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-300/80">
            Total Remaining
          </div>
          <div className="mt-1 text-lg font-semibold tabular-nums text-white">
            {formatSecondsToClock(totalTimeRemaining)}
          </div>
        </div>
      </div>

      <div className="flex w-full max-w-md items-center justify-center gap-4 sm:gap-6">
        <button
          type="button"
          onClick={reset}
          aria-label="Reset workout"
          className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white shadow-[0_10px_30px_rgba(15,23,42,0.2)] backdrop-blur-md transition hover:bg-white/10 sm:h-20 sm:w-20"
        >
          <RotateCcw size={30} />
        </button>

        <button
          type="button"
          onClick={pause}
          disabled={!isRunning}
          aria-label="Pause workout"
          className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white shadow-[0_10px_30px_rgba(15,23,42,0.2)] backdrop-blur-md transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 sm:h-20 sm:w-20"
        >
          <Pause size={34} />
        </button>

        <button
          type="button"
          onClick={play}
          disabled={isRunning}
          aria-label={phaseKey === PHASES.FINISHED ? 'Restart workout' : 'Play workout'}
          className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r ${tone.button} text-white shadow-[0_16px_40px_rgba(59,130,246,0.3)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 sm:h-20 sm:w-20`}
        >
          <Play size={34} className="translate-x-[2px]" />
        </button>
      </div>
    </section>
  )
}

export default memo(TimerDisplay)
