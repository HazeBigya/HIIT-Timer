import { ChevronDown, LockKeyhole, Save } from 'lucide-react'
import { memo, useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Database, Routine, WorkoutConfig } from '../../types'
import { supabase } from '../../lib/supabase'
import { normalizeWorkoutConfig } from '../../utils/timeHelpers'
import GlassButton from '../ui/GlassButton'
import GlassCard from '../ui/GlassCard'
import GlassInput from '../ui/GlassInput'

interface RoutineSelectorProps {
  session: Session | null
  settings: WorkoutConfig
  onLoadSettings: (config: WorkoutConfig) => void
}

function RoutineSelector({ session, settings, onLoadSettings }: RoutineSelectorProps) {
  const [routineName, setRoutineName] = useState<string>('')
  const [savedRoutines, setSavedRoutines] = useState<Routine[]>([])
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>('')
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [statusMessage, setStatusMessage] = useState<string>(
    session
      ? 'Save this setup or load one of your existing routines.'
      : 'Log in to save your routines.',
  )

  useEffect(() => {
    let cancelled = false

    async function fetchRoutines() {
      if (!session || !supabase) {
        return
      }

      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (cancelled) {
        return
      }

      if (error) {
        setStatusMessage(error.message)
        return
      }

      setSavedRoutines(data ?? [])
      setStatusMessage(
        data && data.length > 0
          ? 'Load one of your saved routines or save a new variation.'
          : 'No saved routines yet — save your first one.',
      )
    }

    void fetchRoutines()

    return () => {
      cancelled = true
    }
  }, [session])

  const handleSaveRoutine = async () => {
    if (!session || !supabase) {
      return
    }

    const nextName = routineName.trim() || `Workout ${new Date().toLocaleDateString()}`
    const payload: Database['public']['Tables']['routines']['Insert'] = {
      user_id: session.user.id,
      name: nextName,
      ...settings,
    }

    setIsSaving(true)

    const { data, error } = await supabase
      .from('routines')
      .insert(payload as never)
      .select('*')
      .single()

    setIsSaving(false)

    if (error) {
      setStatusMessage(error.message)
      return
    }

    const savedRoutine = data as Routine | null

    if (!savedRoutine) {
      setStatusMessage('Unable to save the routine right now.')
      return
    }

    setSavedRoutines((current) => [savedRoutine, ...current])
    setSelectedRoutineId(savedRoutine.id)
    setRoutineName(savedRoutine.name)
    setStatusMessage(`Saved “${savedRoutine.name}”.`)
  }

  const handleLoadRoutine = (event: ChangeEvent<HTMLSelectElement>) => {
    const routineId = event.target.value
    setSelectedRoutineId(routineId)

    const nextRoutine = savedRoutines.find((routine) => routine.id === routineId)

    if (!nextRoutine) {
      return
    }

    onLoadSettings(normalizeWorkoutConfig(nextRoutine))
    setRoutineName(nextRoutine.name)
    setStatusMessage(`Loaded “${nextRoutine.name}”.`)
  }

  if (!session) {
    return (
      <GlassCard muted className="routine-selector routine-selector--locked">
        <span className="field-label">Saved routines</span>
        <GlassButton variant="secondary" className="auth-btn" disabled Icon={LockKeyhole}>
          Log in to save your routines
        </GlassButton>
        <p className="mini-copy routine-selector__status">{statusMessage}</p>
      </GlassCard>
    )
  }

  return (
    <div className="routine-selector">
      <GlassInput
        label="Routine Name"
        type="text"
        value={routineName}
        placeholder="Morning intervals"
        onChange={(event) => setRoutineName(event.target.value)}
      />

      <GlassButton
        variant="secondary"
        className="auth-btn"
        Icon={Save}
        onClick={handleSaveRoutine}
        disabled={isSaving}
      >
        {isSaving ? 'Saving…' : 'Save Routine'}
      </GlassButton>

      <GlassInput
        as="select"
        label="Load Previous Routine"
        value={selectedRoutineId}
        onChange={handleLoadRoutine}
        suffix={<ChevronDown size={16} aria-hidden="true" />}
      >
        <option value="">Select a routine</option>
        {savedRoutines.map((routine) => (
          <option key={routine.id} value={routine.id}>
            {routine.name}
          </option>
        ))}
      </GlassInput>

      <p className="mini-copy routine-selector__status">{statusMessage}</p>
    </div>
  )
}

export default memo(RoutineSelector)
