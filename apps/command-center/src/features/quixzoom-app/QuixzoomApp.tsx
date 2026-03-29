import { useState } from 'react'
import { MapPin, Clock, Camera, CheckCircle, ArrowRight, ChevronLeft } from 'lucide-react'

type TaskStatus = 'available' | 'accepted' | 'started' | 'uploading' | 'reviewing' | 'approved' | 'rejected'

interface ZoomerTask {
  id: string
  location: string
  distance: string
  reward: number
  currency: string
  timeEstimate: string
  description: string
  instructions: string
  status: TaskStatus
}

const DEMO_TASKS: ZoomerTask[] = [
  { id: 't1', location: 'Brygga Värmdö Hamn', distance: '0.8 km', reward: 85, currency: 'SEK', timeEstimate: '15 min', description: 'Fotografera hela bryggan från 4 vinklar', instructions: 'Börja vid land-änden. Foto bakifrån, framifrån och båda sidor.', status: 'available' },
  { id: 't2', location: 'Kajanläggning Nacka', distance: '1.2 km', reward: 120, currency: 'SEK', timeEstimate: '20 min', description: 'Dokumentera kajanläggningens skick', instructions: 'Fokusera på räcken, plankor och bärande konstruktion.', status: 'available' },
  { id: 't3', location: 'Parkbrygga Vaxholm', distance: '2.1 km', reward: 65, currency: 'SEK', timeEstimate: '10 min', description: 'Snabbinspektion parkbrygga', instructions: 'Tre foton: hela bryggan, räcke, och ändplatta.', status: 'available' },
]

export function QuixzoomApp() {
  const [screen, setScreen] = useState<'home' | 'task' | 'camera' | 'status'>('home')
  const [activeTask, setActiveTask] = useState<ZoomerTask | null>(null)
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('available')

  function acceptTask(task: ZoomerTask) {
    setActiveTask(task)
    setTaskStatus('accepted')
    setScreen('task')
  }

  function startTask() {
    setTaskStatus('started')
    setScreen('camera')
  }

  function uploadPhoto() {
    setTaskStatus('uploading')
    setTimeout(() => {
      setTaskStatus('reviewing')
      setScreen('status')
    }, 1500)
    setTimeout(() => setTaskStatus('approved'), 4000)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-8">
      <div style={{
        width: 390,
        height: 844,
        background: '#FFFFFF',
        borderRadius: 48,
        overflow: 'hidden',
        boxShadow: '0 40px 80px rgba(0,0,0,0.3), 0 0 0 2px #1C1C1E',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}>
        {/* Status bar */}
        <div style={{ height: 50, background: '#FFFFFF', display: 'flex', alignItems: 'flex-end', paddingBottom: 10, paddingLeft: 20, paddingRight: 20 }}>
          <span style={{ fontSize: 14, fontWeight: 600, fontFamily: 'system-ui', color: '#1C1C1E' }}>9:41</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ width: 18, height: 12, border: '2px solid #1C1C1E', borderRadius: 3, position: 'relative' }}>
              <div style={{ position: 'absolute', left: 1, top: 1, width: 10, height: 6, background: '#34C759', borderRadius: 1 }} />
            </div>
          </div>
        </div>

        {/* Screen content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* HOME */}
          {screen === 'home' && (
            <div style={{ flex: 1, overflowY: 'auto', background: '#F2F2F7' }}>
              <div style={{ padding: '16px 20px', background: '#FFFFFF' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1C1C1E', fontFamily: 'system-ui' }}>Uppdrag nära dig</div>
                <div style={{ fontSize: 14, color: '#8E8E93', marginTop: 2 }}>3 tillgängliga · Stockholm</div>
              </div>

              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {DEMO_TASKS.map(task => (
                  <div key={task.id} style={{
                    background: '#FFFFFF',
                    borderRadius: 16,
                    padding: '16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E' }}>{task.location}</div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                          <span style={{ fontSize: 12, color: '#8E8E93', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <MapPin style={{ width: 11, height: 11 }} />{task.distance}
                          </span>
                          <span style={{ fontSize: 12, color: '#8E8E93', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Clock style={{ width: 11, height: 11 }} />{task.timeEstimate}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#34C759' }}>{task.reward}</div>
                        <div style={{ fontSize: 11, color: '#8E8E93' }}>{task.currency}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: '#3C3C43CC', marginBottom: 12 }}>{task.description}</div>
                    <button
                      onClick={() => acceptTask(task)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: '#5856D6',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 12,
                        fontSize: 15,
                        fontWeight: 600,
                        fontFamily: 'system-ui',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      Ta uppdrag <ArrowRight style={{ width: 16, height: 16 }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TASK DETAIL */}
          {screen === 'task' && activeTask && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
              <div style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <button onClick={() => setScreen('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <ChevronLeft style={{ width: 20, height: 20, color: '#5856D6' }} />
                </button>
                <span style={{ fontSize: 15, fontWeight: 600 }}>Uppdrag</span>
              </div>

              {/* Map placeholder */}
              <div style={{ height: 200, background: 'linear-gradient(135deg, #E8F0FE 0%, #D2E3FC 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <MapPin style={{ width: 32, height: 32, color: '#FF3B30' }} />
                <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'white', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                  {activeTask.distance} bort
                </div>
              </div>

              <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1C1C1E', marginBottom: 4 }}>{activeTask.location}</div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                  <span style={{ fontSize: 24, fontWeight: 700, color: '#34C759' }}>{activeTask.reward} {activeTask.currency}</span>
                  <span style={{ fontSize: 14, color: '#8E8E93', alignSelf: 'flex-end', marginBottom: 4 }}>• {activeTask.timeEstimate}</span>
                </div>

                <div style={{ background: '#F2F2F7', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#8E8E93', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Instruktioner</div>
                  <div style={{ fontSize: 14, color: '#1C1C1E', lineHeight: 1.6 }}>{activeTask.instructions}</div>
                </div>
              </div>

              <div style={{ padding: '16px 20px', paddingBottom: 34 }}>
                <button onClick={startTask} style={{
                  width: '100%', padding: '16px', background: '#5856D6', color: '#FFFFFF',
                  border: 'none', borderRadius: 14, fontSize: 17, fontWeight: 600, fontFamily: 'system-ui', cursor: 'pointer',
                }}>
                  Starta uppdrag
                </button>
              </div>
            </div>
          )}

          {/* CAMERA */}
          {screen === 'camera' && (
            <div style={{ flex: 1, background: '#000000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
                <Camera style={{ width: 64, height: 64, color: 'rgba(255,255,255,0.6)' }} />
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: 500 }}>Kameran är redo</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', maxWidth: 260, lineHeight: 1.5 }}>
                  Se till att bryggan syns tydligt. GPS registreras automatiskt.
                </div>
              </div>
              <div style={{ padding: '24px', paddingBottom: 40 }}>
                <button onClick={uploadPhoto} style={{
                  width: 72, height: 72, borderRadius: '50%', background: '#FFFFFF', border: '4px solid rgba(255,255,255,0.3)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FFFFFF', border: '2px solid rgba(0,0,0,0.1)' }} />
                </button>
              </div>
            </div>
          )}

          {/* STATUS */}
          {screen === 'status' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 20 }}>
              {taskStatus === 'reviewing' && (
                <>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#FF950015', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock style={{ width: 40, height: 40, color: '#FF9500' }} />
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#1C1C1E', textAlign: 'center' }}>Vi granskar din bild</div>
                  <div style={{ fontSize: 15, color: '#8E8E93', textAlign: 'center', lineHeight: 1.6 }}>Vanligtvis klart inom 2 minuter.</div>
                </>
              )}
              {taskStatus === 'approved' && (
                <>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#34C75915', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle style={{ width: 40, height: 40, color: '#34C759' }} />
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#1C1C1E', textAlign: 'center' }}>Godkänt! Pengar på väg</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#34C759' }}>+85 SEK</div>
                  <div style={{ fontSize: 14, color: '#8E8E93', textAlign: 'center' }}>Utbetalning inom 24 timmar</div>
                  <button onClick={() => { setScreen('home'); setTaskStatus('available') }} style={{
                    marginTop: 16, padding: '14px 32px', background: '#5856D6', color: '#FFFFFF',
                    border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 600, cursor: 'pointer',
                  }}>
                    Fler uppdrag
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Home indicator */}
        {screen !== 'camera' && (
          <div style={{ height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
            <div style={{ width: 134, height: 5, background: '#1C1C1E', borderRadius: 3, opacity: 0.15 }} />
          </div>
        )}
      </div>
    </div>
  )
}
