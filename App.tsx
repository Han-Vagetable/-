
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Controls } from './components/Controls';
import { SimulationCanvas } from './components/SimulationCanvas';
import { StatsPanel } from './components/StatsPanel';
import { EnvironmentConfig, ProjectileEntity, ProjectileConfig, StartPosition, VectorMode } from './types';
import { calculatePhysics, checkCollision, getInitialState } from './utils/physics';

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

const App: React.FC = () => {
  // Global Environment State
  const [env, setEnv] = useState<EnvironmentConfig>({
    angleIncline: 30,
    gravity: 9.81,
    scaleVelocity: 0.5,
    scaleDisplacement: 1.0,
    timeScale: 1.0,
    showPrediction: true
  });

  const [vectorMode, setVectorMode] = useState<VectorMode>(VectorMode.Cartesian);
  const [activeId, setActiveId] = useState<string>('p1');
  const [projectIdCounter, setProjectIdCounter] = useState(1);

  // Projectiles State
  // Helper to create a new projectile entity
  const createProjectile = (id: string, name: string, color: string, partialConfig: Partial<ProjectileConfig> = {}): ProjectileEntity => {
      const config: ProjectileConfig = {
          id, name, color,
          v0: 25,
          angleLaunch: 45,
          startPos: StartPosition.Bottom,
          ...partialConfig
      };
      const init = getInitialState(config, env);
      return {
          id,
          config,
          state: {
              t: 0,
              isPlaying: false,
              isFinished: false,
              position: init.pos,
              startPosition: init.pos,
              velocity: init.vel,
              path: [init.pos]
          }
      };
  };

  const [projectiles, setProjectiles] = useState<ProjectileEntity[]>([
      createProjectile('p1', '物体 A', COLORS[0])
  ]);

  const requestRef = useRef<number>();

  // --- Actions ---

  const addProjectile = () => {
      const nextId = `p${projectIdCounter + 1}`;
      setProjectIdCounter(prev => prev + 1);
      const color = COLORS[projectiles.length % COLORS.length];
      const newP = createProjectile(nextId, `物体 ${String.fromCharCode(65 + projectiles.length)}`, color);
      setProjectiles(prev => [...prev, newP]);
      setActiveId(nextId);
  };

  const removeProjectile = (id: string) => {
      if (projectiles.length <= 1) return;
      setProjectiles(prev => prev.filter(p => p.id !== id));
      if (activeId === id) {
          setActiveId(projectiles[0].id); // Fallback to first
      }
  };

  const updateProjectileConfig = (id: string, updates: Partial<ProjectileConfig>) => {
      setProjectiles(prev => prev.map(p => {
          if (p.id !== id) return p;
          
          // If updating config, we must reset the state if it hasn't launched or is finished
          // Actually, let's just update config. 
          // Effect hook will handle resetting state based on config change if needed?
          // To keep it simple: If we edit config, we reset that projectile's state to t=0
          
          const newConfig = { ...p.config, ...updates };
          const init = getInitialState(newConfig, env);
          
          return {
              ...p,
              config: newConfig,
              state: {
                  ...p.state,
                  t: 0,
                  isPlaying: false,
                  isFinished: false,
                  position: init.pos,
                  startPosition: init.pos,
                  velocity: init.vel,
                  path: [init.pos]
              }
          };
      }));
  };

  // When Environment changes (e.g. Incline Angle), we must reset ALL projectiles that haven't launched?
  // Or just update their start positions. Simpler to reset all for consistency with physics lab UX.
  useEffect(() => {
      setProjectiles(prev => prev.map(p => {
          if (p.state.isPlaying) return p; // Don't disturb flying objects?
          // Actually, changing slope while flying is weird physics. 
          // Let's re-calc start positions for non-playing objects.
          const init = getInitialState(p.config, env);
          return {
              ...p,
              state: {
                  ...p.state,
                  position: init.pos,
                  startPosition: init.pos,
                  velocity: init.vel, // Update vector direction based on new incline
                  path: [init.pos]
              }
          }
      }));
  }, [env.angleIncline, env.gravity]); 
  // Note: timeScale, scaleVelocity don't need state resets


  const launchProjectile = (id: string) => {
      setProjectiles(prev => prev.map(p => {
          if (p.id !== id) return p;
          if (p.state.isPlaying) {
               // Toggle Pause
               return { ...p, state: { ...p.state, isPlaying: false }};
          } else {
               // Play (or Replay if finished?)
               if (p.state.isFinished) {
                   const init = getInitialState(p.config, env);
                   return {
                        ...p,
                        state: {
                            t: 0, 
                            isPlaying: true, 
                            isFinished: false,
                            position: init.pos, 
                            startPosition: init.pos,
                            velocity: init.vel, 
                            path: [init.pos]
                        }
                   }
               }
               return { ...p, state: { ...p.state, isPlaying: true }};
          }
      }));
  };

  const launchAll = () => {
    setProjectiles(prev => prev.map(p => {
        const init = getInitialState(p.config, env);
        return {
            ...p,
            state: {
                t: 0,
                isPlaying: true,
                isFinished: false,
                position: init.pos,
                startPosition: init.pos,
                velocity: init.vel,
                path: [init.pos]
            }
        };
    }));
  };

  const resetAll = () => {
    setProjectiles(prev => prev.map(p => {
        const init = getInitialState(p.config, env);
        return {
            ...p,
            state: {
                t: 0,
                isPlaying: false,
                isFinished: false,
                position: init.pos,
                startPosition: init.pos,
                velocity: init.vel,
                path: [init.pos]
            }
        };
    }));
  };


  // --- Physics Loop ---

  const animate = useCallback(() => {
    setProjectiles(prev => {
        let needsUpdate = false;
        
        const updated = prev.map(p => {
            if (!p.state.isPlaying || p.state.isFinished) return p;

            needsUpdate = true;
            const dt = (1/60) * env.timeScale; // Apply Time Scale
            const nextT = p.state.t + dt;
            
            // Calculate Next Step
            // Note: pass original v0 (from config/init) to calculation? 
            // Our calculatePhysics uses initialPos and initialVel.
            // We can retrieve initialVel from the 'start of time' or recalculate it.
            // Recalculating from config ensures consistency if config didn't change mid-flight.
            // However, we need the initialVel vector at t=0. 
            // We didn't store initialVel explicitly in config, but we can derive it or store it in state.
            // `p.state.startPosition` is accurate. Let's assume constant acceleration.
            // Better: use current pos/vel for next step (Euler integration) OR standard kinematic eq.
            // Standard Kinematic Eq is more stable for seeking time.
            
            const init = getInitialState(p.config, env);
            // Warning: If env changed mid-flight, this might be weird. But for now acceptable.
            
            const physics = calculatePhysics(nextT, env, p.state.startPosition, init.vel);

            // Collision Check
            const hasHit = checkCollision(physics.position, env.angleIncline);
            
            if (hasHit && nextT > 0.1) {
                return {
                    ...p,
                    state: {
                        ...p.state,
                        t: nextT,
                        position: physics.position,
                        velocity: { x: 0, y: 0 },
                        isPlaying: false,
                        isFinished: true
                    }
                };
            }

             // Bounds Check (Visual cleanup)
             if (physics.position.y < -30 || physics.position.x > 250) { 
                 return {
                    ...p,
                    state: { ...p.state, isPlaying: false, isFinished: true }
                 }
            }

            // Path Optimization
            const shouldAddPoint = Math.round(nextT * 60) % 5 === 0; // fewer points
            const newPath = shouldAddPoint ? [...p.state.path, physics.position] : p.state.path;

            return {
                ...p,
                state: {
                    ...p.state,
                    t: nextT,
                    position: physics.position,
                    velocity: physics.velocity,
                    path: newPath
                }
            };
        });

        if (!needsUpdate) {
            // If nothing is playing, we might stop the loop, but usually keep it running for UI responsiveness?
            // Actually requestAnimationFrame is tied to `useEffect`.
        }
        return updated;
    });

    requestRef.current = requestAnimationFrame(animate);
  }, [env]); // Re-create loop if env changes (needed for timeScale)

  useEffect(() => {
      requestRef.current = requestAnimationFrame(animate);
      return () => {
          if (requestRef.current) cancelAnimationFrame(requestRef.current);
      };
  }, [animate]);


  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-800">
      
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3 shadow-sm z-10 relative">
        <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-indigo-200 shadow-lg">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 20h20M5 20l14-16" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">习题模型：多物体斜面抛体运动</h1>
          <p className="text-sm text-slate-500">酷学物理赵（vx：hancai22222）</p>
        </div>
      </header>

      <main className="container mx-auto p-4 lg:p-6 flex flex-col lg:flex-row gap-6 h-[calc(100vh-80px)]">
        
        {/* Left: Controls & Stats */}
        <aside className="w-full lg:w-96 flex-shrink-0 flex flex-col gap-4 overflow-y-auto pr-2 pb-20 lg:pb-0 z-20">
          <Controls 
            env={env} setEnv={setEnv}
            projectiles={projectiles}
            addProjectile={addProjectile}
            removeProjectile={removeProjectile}
            updateProjectileConfig={updateProjectileConfig}
            activeId={activeId}
            setActiveId={setActiveId}
            launchProjectile={launchProjectile}
            launchAll={launchAll}
            resetAll={resetAll}
            vectorMode={vectorMode}
            setVectorMode={setVectorMode}
          />
          <StatsPanel 
            activeProjectile={projectiles.find(p => p.id === activeId)}
            env={env} 
            vectorMode={vectorMode}
          />
        </aside>

        {/* Right: Simulation Viewport */}
        <section className="flex-1 min-h-[500px] lg:h-full relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/50 bg-white">
          <SimulationCanvas 
             env={env} setEnv={setEnv}
             projectiles={projectiles}
             updateProjectileConfig={updateProjectileConfig}
             activeId={activeId}
             setActiveId={setActiveId}
             vectorMode={vectorMode}
          />
        </section>

      </main>
    </div>
  );
};

export default App;
