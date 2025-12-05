
import React, { useRef, useState } from 'react';
import { EnvironmentConfig, ProjectileEntity, VectorMode } from '../types';
import { INCLINE_LENGTH, projectToIncline, toRad, toDeg, predictTrajectory, getInitialState } from '../utils/physics';

interface SimulationCanvasProps {
  env: EnvironmentConfig;
  setEnv: React.Dispatch<React.SetStateAction<EnvironmentConfig>>;
  projectiles: ProjectileEntity[];
  updateProjectileConfig: (id: string, updates: Partial<any>) => void;
  activeId: string;
  setActiveId: (id: string) => void;
  vectorMode: VectorMode;
}

const SCALE = 6; // Pixels per meter (Base zoom)
const PADDING = 60;
const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 600;

// Helper for arrows
const Arrow = ({ start, end, color, label, opacity = 1, dashed = false, width = 2 }: any) => {
  const len = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
  if (len < 1) return null;

  return (
    <g opacity={opacity} className="pointer-events-none">
      <line
        x1={start.x}
        y1={-start.y}
        x2={end.x}
        y2={-end.y}
        stroke={color}
        strokeWidth={width}
        strokeDasharray={dashed ? "5,3" : "none"}
        markerEnd={`url(#head-${color.replace('#', '')})`}
      />
      {label && (
        <text
          x={(start.x + end.x) / 2}
          y={-(start.y + end.y) / 2 - 8}
          fill={color}
          fontSize="12"
          fontWeight="bold"
          textAnchor="middle"
          style={{ textShadow: '0px 0px 3px rgba(255,255,255,0.8)' }}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ 
  env, 
  setEnv, 
  projectiles, 
  updateProjectileConfig, 
  activeId, 
  setActiveId, 
  vectorMode 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Interaction State
  // dragTarget: 'incline' OR string (projectile ID)
  const [dragTarget, setDragTarget] = useState<'incline' | string | null>(null);

  // Coordinate Transform
  const toScreen = (p: { x: number, y: number }) => ({
    x: PADDING + p.x * SCALE,
    y: VIEW_HEIGHT - PADDING - p.y * SCALE
  });

  const fromScreen = (s: { x: number, y: number }) => ({
    x: (s.x - PADDING) / SCALE,
    y: (VIEW_HEIGHT - PADDING - s.y) / SCALE
  });

  // Incline Visuals
  const theta = toRad(env.angleIncline);
  const screenInclineStart = toScreen({ x: 0, y: 0 });
  const screenInclineEnd = toScreen({
    x: INCLINE_LENGTH * Math.cos(theta),
    y: INCLINE_LENGTH * Math.sin(theta)
  });


  // --- Event Handlers ---

  const handlePointerDown = (e: React.PointerEvent, target: 'incline' | string) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragTarget(target);
    if (typeof target === 'string') {
      setActiveId(target);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragTarget || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const mousePhysics = fromScreen({ 
      x: e.clientX - rect.left, 
      y: e.clientY - rect.top 
    });

    if (dragTarget === 'incline') {
      const angle = Math.atan2(mousePhysics.y, mousePhysics.x);
      let deg = toDeg(angle);
      deg = Math.min(Math.max(deg, 0), 80);
      setEnv(prev => ({ ...prev, angleIncline: deg }));
    } 
    else {
      // Dragging velocity vector for a specific projectile
      const proj = projectiles.find(p => p.id === dragTarget);
      if (proj && !proj.state.isPlaying) {
        // Calculate delta from the projectile's position
        const dx = mousePhysics.x - proj.state.position.x;
        const dy = mousePhysics.y - proj.state.position.y;
        
        // Calculate new magnitude
        const mag = Math.sqrt(dx*dx + dy*dy);
        const newV0 = Math.min(Math.max(mag / env.scaleVelocity, 1), 60);

        // Calculate new global angle
        let globalAngle = Math.atan2(dy, dx);
        // Convert to relative angle (beta)
        let newBeta = toDeg(globalAngle) - env.angleIncline;
        
        // Normalize beta
        if (newBeta > 180) newBeta -= 360;
        if (newBeta < -180) newBeta += 360;

        updateProjectileConfig(dragTarget, {
          v0: newV0,
          angleLaunch: newBeta
        });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragTarget) {
        (e.target as Element).releasePointerCapture(e.pointerId);
        setDragTarget(null);
    }
  };


  // --- Render Functions ---

  const renderVectors = (proj: ProjectileEntity, isSelected: boolean) => {
    const { state, config } = proj;
    const { position, velocity, startPosition } = state;
    
    // Only show detailed vectors for the selected object to avoid clutter
    if (!isSelected && !state.isPlaying) return null;

    const vScale = env.scaleVelocity;
    
    // Determine vector to draw (Instantaneous vs Initial)
    let vecToRender = velocity;
    
    // If stopped/reset, we recalculate the initial vector based on config for the drag handle visualization
    if (!state.isPlaying && !state.isFinished) {
       const init = getInitialState(config, env);
       vecToRender = init.vel;
    }

    const screenPos = toScreen(position);
    const vEnd = {
      x: position.x + vecToRender.x * vScale,
      y: position.y + vecToRender.y * vScale
    };
    const screenVEnd = toScreen(vEnd);

    // Displacement
    const dScale = env.scaleDisplacement;
    const dispVec = {
      x: position.x - startPosition.x,
      y: position.y - startPosition.y
    };
    const dEnd = {
        x: startPosition.x + dispVec.x * dScale,
        y: startPosition.y + dispVec.y * dScale
    };
    const screenStartPos = toScreen(startPosition);
    const screenDEnd = toScreen(dEnd);
    const hasDisplacement = Math.sqrt(dispVec.x**2 + dispVec.y**2) > 0.1;

    return (
      <g key={`vec-${proj.id}`}>
        {/* Main Velocity Vector */}
        <Arrow 
          start={{ x: screenPos.x, y: -screenPos.y }} 
          end={{ x: screenVEnd.x, y: -screenVEnd.y }} 
          color={config.color}
          label={state.isPlaying ? "v" : "v₀"}
          width={isSelected ? 3 : 2}
        />

        {/* Drag Handle (Only when not playing and selected) */}
        {!state.isPlaying && isSelected && !state.isFinished && (
           <circle
             cx={screenVEnd.x}
             cy={screenVEnd.y}
             r={8}
             fill={config.color}
             fillOpacity={0.2}
             stroke={config.color}
             strokeWidth={1}
             className="cursor-move hover:fill-opacity-50 transition-all"
             onPointerDown={(e) => handlePointerDown(e, proj.id)}
           />
        )}

        {/* --- Decomposed Vectors (Only for Selected) --- */}
        {isSelected && (
          <>
            {/* Cartesian Velocity */}
            {vectorMode === VectorMode.Cartesian && (
              <>
                <Arrow 
                  start={{ x: screenPos.x, y: -screenPos.y }} 
                  end={{ x: screenVEnd.x, y: -screenPos.y }} 
                  color="#3b82f6" label="vx" opacity={0.7} dashed
                />
                <Arrow 
                  start={{ x: screenPos.x, y: -screenPos.y }} 
                  end={{ x: screenPos.x, y: -screenVEnd.y }} 
                  color="#10b981" label="vy" opacity={0.7} dashed
                />
              </>
            )}

            {/* Incline Velocity */}
            {vectorMode === VectorMode.Incline && (() => {
               const comps = projectToIncline(vecToRender, env.angleIncline);
               const uPara = { x: Math.cos(theta), y: Math.sin(theta) };
               const uPerp = { x: -Math.sin(theta), y: Math.cos(theta) };
               const paraEnd = toScreen({
                 x: position.x + comps.parallel.mag * uPara.x * vScale,
                 y: position.y + comps.parallel.mag * uPara.y * vScale
               });
               const perpEnd = toScreen({
                 x: position.x + comps.perpendicular.mag * uPerp.x * vScale,
                 y: position.y + comps.perpendicular.mag * uPerp.y * vScale
               });
               return (
                 <>
                   <Arrow 
                    start={{ x: screenPos.x, y: -screenPos.y }} 
                    end={{ x: paraEnd.x, y: -paraEnd.y }} 
                    color="#8b5cf6" label="v∥" opacity={0.8} dashed
                  />
                   <Arrow 
                    start={{ x: screenPos.x, y: -screenPos.y }} 
                    end={{ x: perpEnd.x, y: -perpEnd.y }} 
                    color="#f59e0b" label="v⊥" opacity={0.8} dashed
                  />
                 </>
               );
            })()}

            {/* Displacement Vectors (Dashed) */}
            {hasDisplacement && (
                <>
                    <Arrow 
                        start={{ x: screenStartPos.x, y: -screenStartPos.y }} 
                        end={{ x: screenDEnd.x, y: -screenDEnd.y }} 
                        color={config.color} label="s" opacity={0.6} dashed
                    />
                     {vectorMode === VectorMode.Cartesian && (
                        <>
                            <Arrow 
                                start={{ x: screenStartPos.x, y: -screenStartPos.y }} 
                                end={{ x: screenDEnd.x, y: -screenStartPos.y }} 
                                color={config.color} opacity={0.3} dashed
                            />
                            <Arrow 
                                start={{ x: screenDEnd.x, y: -screenStartPos.y }} 
                                end={{ x: screenDEnd.x, y: -screenDEnd.y }} 
                                color={config.color} opacity={0.3} dashed
                            />
                        </>
                     )}
                     {vectorMode === VectorMode.Incline && (() => {
                        const comps = projectToIncline(dispVec, env.angleIncline);
                        const uPara = { x: Math.cos(theta), y: Math.sin(theta) };
                        const paraEnd = toScreen({
                            x: startPosition.x + comps.parallel.mag * uPara.x * dScale,
                            y: startPosition.y + comps.parallel.mag * uPara.y * dScale
                        });
                        return (
                            <>
                                <Arrow 
                                    start={{ x: screenStartPos.x, y: -screenStartPos.y }} 
                                    end={{ x: paraEnd.x, y: -paraEnd.y }} 
                                    color={config.color} opacity={0.3} dashed
                                />
                                <Arrow 
                                    start={{ x: paraEnd.x, y: -paraEnd.y }} 
                                    end={{ x: screenDEnd.x, y: -screenDEnd.y }} 
                                    color={config.color} opacity={0.3} dashed
                                />
                            </>
                        )
                     })()}
                </>
            )}
          </>
        )}
      </g>
    );
  };

  return (
    <div className="w-full h-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner relative select-none">
       {/* Background Grid */}
       <div className="absolute inset-0 pointer-events-none opacity-5" 
            style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
       </div>

      <svg 
        ref={svgRef}
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} 
        className="w-full h-full preserve-3d touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <defs>
          <marker id="head-ef4444" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" /></marker>
          <marker id="head-3b82f6" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" /></marker>
          <marker id="head-10b981" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#10b981" /></marker>
          <marker id="head-8b5cf6" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#8b5cf6" /></marker>
          <marker id="head-f59e0b" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" /></marker>
          <marker id="head-0ea5e9" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#0ea5e9" /></marker>
          {/* Dynamic Colors for Projectiles */}
          {projectiles.map(p => (
             <marker key={p.id} id={`head-${p.config.color.replace('#', '')}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                 <polygon points="0 0, 10 3.5, 0 7" fill={p.config.color} />
             </marker>
          ))}
        </defs>

        {/* Floor */}
        <line x1={0} y1={VIEW_HEIGHT - PADDING} x2={VIEW_WIDTH} y2={VIEW_HEIGHT - PADDING} stroke="#94a3b8" strokeWidth="2" />

        {/* Incline */}
        <path 
          d={`M ${screenInclineStart.x} ${screenInclineStart.y} L ${screenInclineEnd.x} ${screenInclineEnd.y} L ${screenInclineEnd.x} ${VIEW_HEIGHT - PADDING} Z`}
          fill="#e2e8f0" stroke="#475569" strokeWidth="3"
        />
        
        {/* Angle Handle */}
        <g 
            className="cursor-ew-resize hover:opacity-100"
            onPointerDown={(e) => handlePointerDown(e, 'incline')}
        >
            <path
            d={`M ${screenInclineStart.x + 50} ${screenInclineStart.y} A 50 50 0 0 0 ${screenInclineStart.x + 50 * Math.cos(-theta)} ${screenInclineStart.y + 50 * Math.sin(-theta)}`}
            stroke="#64748b" fill="transparent" strokeWidth="2"
            />
            <circle cx={screenInclineStart.x} cy={screenInclineStart.y} r={40} fill="transparent" />
            <text x={screenInclineStart.x + 60} y={screenInclineStart.y - 15} fontSize="14" fill="#64748b" fontWeight="bold">
            {env.angleIncline.toFixed(0)}°
            </text>
        </g>

        {/* --- Loop through Projectiles --- */}
        {projectiles.map(proj => {
            const isSelected = proj.id === activeId;
            const screenPos = toScreen(proj.state.position);
            
            // Path Trace
            const pathData = proj.state.path.length > 0 ? `M ${proj.state.path.map(p => {
                 const sp = toScreen(p);
                 return `${sp.x},${sp.y}`;
            }).join(' L ')}` : '';

            // Prediction Trace (Only if selected and not playing)
            let predData = '';
            if (env.showPrediction && isSelected && !proj.state.isPlaying && !proj.state.isFinished) {
                const points = predictTrajectory(proj.config, env);
                predData = `M ${points.map(p => {
                    const sp = toScreen(p);
                    return `${sp.x},${sp.y}`;
               }).join(' L ')}`;
            }

            return (
                <React.Fragment key={proj.id}>
                    {/* Actual Path */}
                    <path d={pathData} fill="none" stroke={proj.config.color} strokeWidth="2" strokeDasharray="5,5" opacity={0.6} />
                    
                    {/* Prediction Path */}
                    {predData && (
                        <path d={predData} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,4" opacity={0.8} />
                    )}

                    {/* Vectors */}
                    {renderVectors(proj, isSelected)}

                    {/* Ball Body */}
                    <g 
                        onClick={(e) => { e.stopPropagation(); setActiveId(proj.id); }}
                        className="cursor-pointer"
                    >
                         {/* Selection Halo */}
                         {isSelected && (
                            <circle cx={screenPos.x} cy={screenPos.y} r={16} fill="none" stroke={proj.config.color} strokeWidth="2" strokeDasharray="2,2" opacity={0.5} />
                         )}
                        <circle 
                            cx={screenPos.x} 
                            cy={screenPos.y} 
                            r={10} 
                            fill={proj.config.color} 
                            stroke="white" 
                            strokeWidth="2" 
                            className="shadow-lg transition-transform hover:scale-110" 
                        />
                    </g>
                </React.Fragment>
            );
        })}

      </svg>
    </div>
  );
};
