import { memo, useCallback, useEffect, useRef } from 'react'
import useTimer from '../../hooks/useTimer'
import type { WorkoutConfig } from '../../types'
import TimerDisplay from './TimerDisplay'

interface TimerViewProps {
  config: WorkoutConfig
  startKey: number
  onBack: () => void
}

function TimerView({ config, startKey, onBack }: TimerViewProps) {
  const timer = useTimer(config)
  const playRef = useRef(timer.play)
  const resetRef = useRef(timer.reset)

  useEffect(() => {
    playRef.current = timer.play
    resetRef.current = timer.reset
  }, [timer.play, timer.reset])

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      resetRef.current()
      playRef.current()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [startKey])

  const handleBackToSettings = useCallback(() => {
    resetRef.current()
    onBack()
  }, [onBack])

  return (
    <div className="w-full">
      <TimerDisplay
        {...timer}
        rounds={config.rounds}
        totalSets={config.totalSets}
        exerciseTime={config.exerciseTime}
        restTime={config.restTime}
        onBack={handleBackToSettings}
      />
    </div>
  )
}

export default memo(TimerView)
