export type AppView = 'settings' | 'timer'

export type TimerPhase = 'Warmup' | 'Exercise' | 'Rest' | 'Set Rest' | 'Cooldown' | 'Finished'
export type TimerPhaseKey = 'warmup' | 'exercise' | 'rest' | 'set-rest' | 'cooldown' | 'finished'

export interface WorkoutConfig {
  warmupTime: number
  exerciseTime: number
  restTime: number
  rounds: number
  setRest: number
  totalSets: number
  cooldownTime: number
}

export interface TimerState {
  currentPhase: TimerPhase
  timeLeft: number
  currentRound: number
  currentSet: number
  totalTimeRemaining: number
  isRunning: boolean
}

export interface TimerStep {
  key: TimerPhaseKey
  label: TimerPhase
  duration: number
  currentRound: number
  currentSet: number
}

export interface Routine extends WorkoutConfig {
  id: string
  user_id: string
  name: string
  created_at?: string | null
}

export interface Database {
  public: {
    Tables: {
      routines: {
        Row: Routine
        Insert: Omit<Routine, 'id' | 'created_at'> & {
          id?: string
          created_at?: string | null
        }
        Update: Partial<Routine>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export interface TimerHookResult extends TimerState {
  phaseKey: TimerPhaseKey
  phaseDuration: number
  isMuted: boolean
  toggleMute: () => void
  play: () => void
  pause: () => void
  reset: () => void
}
