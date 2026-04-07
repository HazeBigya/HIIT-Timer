import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PHASE_LABELS, PHASES } from '../constants/workoutConstants'
import useAudioCues from './useAudioCues'
import type { TimerHookResult, TimerStep, WorkoutConfig } from '../types'
import { getTotalRemainingTime, normalizeWorkoutConfig } from '../utils/timeHelpers'

const TICK_INTERVAL_MS = 250

const FALLBACK_STEP: TimerStep = {
  key: PHASES.FINISHED,
  label: PHASE_LABELS[PHASES.FINISHED],
  duration: 0,
  currentSet: 1,
  currentRound: 1,
}

function buildSequence(config: WorkoutConfig): TimerStep[] {
  const sequence: TimerStep[] = []

  if (config.warmupTime > 0) {
    sequence.push({
      key: PHASES.WARMUP,
      label: PHASE_LABELS[PHASES.WARMUP],
      duration: config.warmupTime,
      currentSet: 1,
      currentRound: 1,
    })
  }

  for (let currentSet = 1; currentSet <= config.totalSets; currentSet += 1) {
    for (let currentRound = 1; currentRound <= config.rounds; currentRound += 1) {
      const isFinalRound = currentRound === config.rounds
      const isFinalSet = currentSet === config.totalSets

      sequence.push({
        key: PHASES.EXERCISE,
        label: PHASE_LABELS[PHASES.EXERCISE],
        duration: config.exerciseTime,
        currentSet,
        currentRound,
      })

      if (!isFinalRound && config.restTime > 0) {
        sequence.push({
          key: PHASES.REST,
          label: PHASE_LABELS[PHASES.REST],
          duration: config.restTime,
          currentSet,
          currentRound,
        })
      }

      if (isFinalRound && !isFinalSet && config.setRest > 0) {
        sequence.push({
          key: PHASES.SET_REST,
          label: PHASE_LABELS[PHASES.SET_REST],
          duration: config.setRest,
          currentSet,
          currentRound,
        })
      }
    }
  }

  if (config.cooldownTime > 0) {
    sequence.push({
      key: PHASES.COOLDOWN,
      label: PHASE_LABELS[PHASES.COOLDOWN],
      duration: config.cooldownTime,
      currentSet: config.totalSets,
      currentRound: config.rounds,
    })
  }

  sequence.push({
    key: PHASES.FINISHED,
    label: PHASE_LABELS[PHASES.FINISHED],
    duration: 0,
    currentSet: config.totalSets,
    currentRound: config.rounds,
  })

  return sequence
}

function useTimer(config: WorkoutConfig): TimerHookResult {
  const normalizedConfig = useMemo(() => normalizeWorkoutConfig(config), [config])
  const sequence = useMemo(() => buildSequence(normalizedConfig), [normalizedConfig])
  const initialStep = sequence[0] ?? FALLBACK_STEP

  const [phaseIndex, setPhaseIndex] = useState<number>(0)
  const [timeLeft, setTimeLeft] = useState<number>(initialStep.duration)
  const [isRunning, setIsRunning] = useState<boolean>(false)

  const { isMuted, toggleMute, playDingDing, playBeeper } = useAudioCues()

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const deadlineRef = useRef<number | null>(null)
  const remainingMsRef = useRef<number>(initialStep.duration * 1000)
  const configSignatureRef = useRef<string>(JSON.stringify(normalizedConfig))
  const countdownCueRef = useRef<string>('')
  const sequenceRef = useRef<TimerStep[]>(sequence)
  const phaseIndexRef = useRef<number>(0)

  useEffect(() => {
    sequenceRef.current = sequence
  }, [sequence])

  useEffect(() => {
    phaseIndexRef.current = phaseIndex
  }, [phaseIndex])

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    clearTimer()

    const firstStep = sequenceRef.current[0] ?? FALLBACK_STEP

    deadlineRef.current = null
    remainingMsRef.current = firstStep.duration * 1000
    countdownCueRef.current = ''
    phaseIndexRef.current = 0
    setPhaseIndex(0)
    setTimeLeft(firstStep.duration)
    setIsRunning(false)
  }, [clearTimer])

  useEffect(() => {
    const nextSignature = JSON.stringify(normalizedConfig)

    if (configSignatureRef.current === nextSignature) {
      return undefined
    }

    configSignatureRef.current = nextSignature

    const frameId = window.requestAnimationFrame(() => {
      reset()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [normalizedConfig, reset])

  const currentStep = sequence[phaseIndex] ?? sequence.at(-1) ?? FALLBACK_STEP

  const syncToStep = useCallback(
    (nextIndex: number) => {
      const nextStep = sequenceRef.current[nextIndex] ?? FALLBACK_STEP

      phaseIndexRef.current = nextIndex
      setPhaseIndex(nextIndex)
      setTimeLeft(nextStep.duration)
      remainingMsRef.current = nextStep.duration * 1000
      deadlineRef.current = null
      countdownCueRef.current = ''

      if (nextStep.key === PHASES.FINISHED) {
        setIsRunning(false)
        playDingDing()
        return
      }

      setIsRunning(true)
    },
    [playDingDing],
  )

  const advancePhase = useCallback(() => {
    clearTimer()

    const nextIndex = Math.min(phaseIndexRef.current + 1, sequenceRef.current.length - 1)
    syncToStep(nextIndex)
  }, [clearTimer, syncToStep])

  const play = useCallback(() => {
    const activeStep = sequenceRef.current[phaseIndexRef.current] ?? FALLBACK_STEP

    if (activeStep.key === PHASES.FINISHED) {
      syncToStep(0)
      return
    }

    if (remainingMsRef.current <= 0) {
      remainingMsRef.current = activeStep.duration * 1000
      setTimeLeft(activeStep.duration)
    }

    setIsRunning(true)
  }, [syncToStep])

  const pause = useCallback(() => {
    clearTimer()

    if (deadlineRef.current !== null) {
      remainingMsRef.current = Math.max(0, deadlineRef.current - Date.now())
      setTimeLeft(Math.ceil(remainingMsRef.current / 1000))
    }

    deadlineRef.current = null
    setIsRunning(false)
  }, [clearTimer])

  useEffect(() => {
    if (!isRunning || currentStep.key === PHASES.FINISHED) {
      countdownCueRef.current = ''
      return undefined
    }

    if (timeLeft === 3) {
      const cueKey = `${phaseIndex}-${timeLeft}`

      if (countdownCueRef.current !== cueKey) {
        countdownCueRef.current = cueKey
        playBeeper()
      }
    } else if (timeLeft > 3 || timeLeft <= 0) {
      countdownCueRef.current = ''
    }

    return undefined
  }, [currentStep.key, isRunning, phaseIndex, playBeeper, timeLeft])

  useEffect(() => {
    if (!isRunning || currentStep.key === PHASES.FINISHED) {
      return undefined
    }

    deadlineRef.current = Date.now() + remainingMsRef.current

    intervalRef.current = setInterval(() => {
      if (deadlineRef.current === null) {
        return
      }

      const millisecondsLeft = Math.max(0, deadlineRef.current - Date.now())
      const nextSeconds = Math.ceil(millisecondsLeft / 1000)

      remainingMsRef.current = millisecondsLeft
      setTimeLeft((currentValue) =>
        currentValue === nextSeconds ? currentValue : nextSeconds,
      )

      if (millisecondsLeft <= 0) {
        advancePhase()
      }
    }, TICK_INTERVAL_MS)

    return () => {
      clearTimer()
    }
  }, [advancePhase, clearTimer, currentStep.key, isRunning])

  const totalTimeRemaining = useMemo(
    () => getTotalRemainingTime(sequence, phaseIndex, timeLeft),
    [phaseIndex, sequence, timeLeft],
  )

  return {
    currentPhase: currentStep.label,
    phaseKey: currentStep.key,
    timeLeft,
    currentRound: currentStep.currentRound,
    currentSet: currentStep.currentSet,
    totalTimeRemaining,
    phaseDuration: currentStep.duration,
    isRunning,
    isMuted,
    toggleMute,
    play,
    pause,
    reset,
  }
}

export default useTimer
