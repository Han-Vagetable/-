
import React from 'react';
import { ProjectileEntity, EnvironmentConfig, VectorMode } from '../types';
import { projectToIncline } from '../utils/physics';

interface StatsPanelProps {
  activeProjectile: ProjectileEntity | undefined;
  env: EnvironmentConfig;
  vectorMode: VectorMode;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ activeProjectile, env, vectorMode }) => {
  if (!activeProjectile) {
      return (
          <div className="bg-white/90 backdrop-blur-md shadow-lg border border-slate-200 rounded-xl p-4 w-full max-w-sm mt-4 text-center text-slate-400 text-sm">
              无选中物体
          </div>
      )
  }

  const { state, config } = activeProjectile;
  const { velocity, position, startPosition } = state;
  const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
  
  const displacement = {
      x: position.x - startPosition.x,
      y: position.y - startPosition.y
  };
  const dist = Math.sqrt(displacement.x ** 2 + displacement.y ** 2);

  // Decomposition logic for display
  const renderComponents = () => {
    if (vectorMode === VectorMode.Cartesian) {
      return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 p-2 bg-slate-50 rounded border border-slate-100">
          <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">水平 / 竖直 分解</div>
          <StatRow label="Vx" value={velocity.x} color="text-blue-600" compact />
          <StatRow label="Vy" value={velocity.y} color="text-emerald-600" compact />
          <StatRow label="Dx" value={displacement.x} color="text-blue-600" unit="m" compact />
          <StatRow label="Dy" value={displacement.y} color="text-emerald-600" unit="m" compact />
        </div>
      );
    }
    if (vectorMode === VectorMode.Incline) {
      const vProj = projectToIncline(velocity, env.angleIncline);
      const dProj = projectToIncline(displacement, env.angleIncline);
      
      return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 p-2 bg-slate-50 rounded border border-slate-100">
           <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">平行 / 垂直 分解</div>
          <StatRow label="V∥" value={vProj.parallel.mag} color="text-violet-600" compact />
          <StatRow label="V⊥" value={vProj.perpendicular.mag} color="text-amber-600" compact />
          <StatRow label="D∥" value={dProj.parallel.mag} color="text-violet-600" unit="m" compact />
          <StatRow label="D⊥" value={dProj.perpendicular.mag} color="text-amber-600" unit="m" compact />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/90 backdrop-blur-md shadow-lg border border-slate-200 rounded-xl p-4 w-full max-w-sm mt-4 border-t-4" style={{ borderTopColor: config.color }}>
      <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">实时数据: {config.name}</h3>
          {state.isFinished && (
               <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">已停止</span>
          )}
      </div>
      
      <div className="space-y-2">
        <StatRow label="时间 (t)" value={state.t} unit="s" />
        <div className="h-px bg-slate-100 my-1" />
        
        <StatRow label="瞬时速率 (v)" value={speed} />
        <StatRow label="总位移 (s)" value={dist} unit="m" />
        
        {renderComponents()}
      </div>
    </div>
  );
};

const StatRow = ({ label, value, unit = 'm/s', color = 'text-slate-800', compact = false }: any) => (
  <div className={`flex justify-between items-center ${compact ? 'text-xs' : 'text-sm'}`}>
    <span className={`${compact ? 'text-slate-500' : 'text-slate-600 font-medium'}`}>{label}</span>
    <span className={`font-mono font-medium ${color}`}>
      {value.toFixed(2)} <span className="text-xs text-slate-400">{unit}</span>
    </span>
  </div>
);
