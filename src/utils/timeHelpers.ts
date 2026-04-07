import {
  DEFAULT_WORKOUT_CONFIG,
  PHASE_LABELS,
  PHASES,
} from '../constants/workoutConstants'
import type { TimerStep, WorkoutConfig } from '../types'

export function clampNumber(value: unknown, min: number, fallback: number): number {
  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue)) {
    return fallback
  }

  return Math.max(min, parsedValue)
}

type WorkoutConfigInput = Partial<WorkoutConfig> & {
  warmup?: unknown
  workTime?: unknown
  work?: unknown
  workout?: unknown
  exercise?: unknown
  exerciseTime?: unknown
  rest?: unknown
  roundsPerSet?: unknown
  cooldown?: unknown
}

export function normalizeWorkoutConfig(config: WorkoutConfigInput = {}): WorkoutConfig {
  return {
    warmupTime: clampNumber(
      config.warmupTime ?? config.warmup,
      0,
      DEFAULT_WORKOUT_CONFIG.warmupTime,
    ),
    exerciseTime: clampNumber(
      config.exerciseTime ?? config.workTime ?? config.work ?? config.workout ?? config.exercise,
      1,
      DEFAULT_WORKOUT_CONFIG.exerciseTime,
    ),
    restTime: clampNumber(
      config.restTime ?? config.rest,
      0,
      DEFAULT_WORKOUT_CONFIG.restTime,
    ),
    rounds: clampNumber(
      config.rounds ?? config.roundsPerSet,
      1,
      DEFAULT_WORKOUT_CONFIG.rounds,
    ),
    setRest: clampNumber(
      config.setRest,
      0,
      DEFAULT_WORKOUT_CONFIG.setRest,
    ),
    totalSets: clampNumber(config.totalSets, 1, DEFAULT_WORKOUT_CONFIG.totalSets),
    cooldownTime: clampNumber(
      config.cooldownTime ?? config.cooldown,
      0,
      DEFAULT_WORKOUT_CONFIG.cooldownTime,
    ),
  }
}

export function formatSecondsToClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function calculateWorkoutDuration(config: Partial<WorkoutConfig>): number {
  const {
    warmupTime,
    exerciseTime,
    restTime,
    rounds,
    setRest,
    totalSets,
    cooldownTime,
  } = normalizeWorkoutConfig(config)

  return Math.max(
    0,
    warmupTime + (((exerciseTime + restTime) * rounds - restTime + setRest) * totalSets - setRest) + cooldownTime,
  )
}

export function calculateSingleSetDuration(config: Partial<WorkoutConfig>): number {
  const { exerciseTime, restTime, rounds } = normalizeWorkoutConfig(config)

  return Math.max(0, (exerciseTime + restTime) * rounds)
}

export function buildWorkoutSequence(config: Partial<WorkoutConfig>): TimerStep[] {
  const {
    warmupTime,
    exerciseTime,
    restTime,
    rounds,
    setRest,
    totalSets,
    cooldownTime,
  } = normalizeWorkoutConfig(config)
  const sequence: TimerStep[] = []

  if (warmupTime > 0) {
    sequence.push({
      key: PHASES.WARMUP,
      label: PHASE_LABELS[PHASES.WARMUP],
      duration: warmupTime,
      currentSet: 1,
      currentRound: 1,
    })
  }

  for (let currentSet = 1; currentSet <= totalSets; currentSet += 1) {
    for (let currentRound = 1; currentRound <= rounds; currentRound += 1) {
      const isFinalRound = currentRound === rounds
      const isFinalSet = currentSet === totalSets

      sequence.push({
        key: PHASES.EXERCISE,
        label: PHASE_LABELS[PHASES.EXERCISE],
        duration: exerciseTime,
        currentSet,
        currentRound,
      })

      if (!isFinalRound && restTime > 0) {
        sequence.push({
          key: PHASES.REST,
          label: PHASE_LABELS[PHASES.REST],
          duration: restTime,
          currentSet,
          currentRound,
        })
      } else if (isFinalRound && !isFinalSet && setRest > 0) {
        sequence.push({
          key: PHASES.SET_REST,
          label: PHASE_LABELS[PHASES.SET_REST],
          duration: setRest,
          currentSet,
          currentRound,
        })
      }
    }
  }

  if (cooldownTime > 0) {
    sequence.push({
      key: PHASES.COOLDOWN,
      label: PHASE_LABELS[PHASES.COOLDOWN],
      duration: cooldownTime,
      currentSet: totalSets,
      currentRound: rounds,
    })
  }

  sequence.push({
    key: PHASES.FINISHED,
    label: PHASE_LABELS[PHASES.FINISHED],
    duration: 0,
    currentSet: totalSets,
    currentRound: rounds,
  })

  return sequence
}

export function getTotalRemainingTime(
  sequence: TimerStep[],
  phaseIndex: number,
  timeLeft: number,
): number {
  const futureDuration = sequence
    .slice(phaseIndex + 1)
    .reduce((sum, step) => sum + step.duration, 0)

  return Math.max(0, Math.floor(timeLeft) + futureDuration)
}
