
import React, { useState } from 'react';
import { EnvironmentConfig, ProjectileEntity, StartPosition, VectorMode } from '../types';
import { Play, Pause, RotateCcw, Settings2, Sliders, Plus, Trash2, Crosshair } from 'lucide-react';

interface ControlsProps {
  env: EnvironmentConfig;
  setEnv: React.Dispatch<React.SetStateAction<EnvironmentConfig>>;
  projectiles: ProjectileEntity[];
  addProjectile: () => void;
  removeProjectile: (id: string) => void;
  updateProjectileConfig: (id: string, updates: Partial<any>) => void;
  activeId: string;
  setActiveId: (id: string) => void;
  launchProjectile: (id: string) => void;
  launchAll: () => void;
  resetAll: () => void;
  vectorMode: VectorMode;
  setVectorMode: (m: VectorMode) => void;
}

const Slider = ({ label, value, min, max, onChange, unit, step = 0.1, editable = false }: any) => {
    const [localVal, setLocalVal] = useState(value.toString());
    
    // Sync local input state when prop value changes externally (e.g. from drag)
    React.useEffect(() => {
        setLocalVal(Number(value).toFixed(step < 1 ? 1 : 0));
    }, [value, step]);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalVal(e.target.value);
        const num = parseFloat(e.target.value);
        if (!isNaN(num)) onChange(num);
    };

    return (
        <div className="mb-3">
            <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
            <span>{label}</span>
            {editable ? (
                 <div className="flex items-center gap-1">
                     <input 
                        type="number" 
                        value={localVal}
                        onChange={handleTextChange}
                        className="w-16 text-right bg-slate-100 rounded px-1 text-indigo-600 focus:outline-indigo-500"
                     />
                     <span>{unit}</span>
                 </div>
            ) : (
                <span>{Number(value).toFixed(1)} {unit}</span>
            )}
            </div>
            <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:bg-slate-300 transition-colors"
            />
        </div>
    );
};

export const Controls: React.FC<ControlsProps> = ({
  env, setEnv, projectiles, 
  addProjectile, removeProjectile, updateProjectileConfig,
  activeId, setActiveId,
  launchProjectile, launchAll, resetAll,
  vectorMode, setVectorMode
}) => {
  const [activeTab, setActiveTab] = useState<'env' | 'object' | 'display'>('object');
  const activeProj = projectiles.find(p => p.id === activeId);

  return (
    <div className="bg-white/90 backdrop-blur-md shadow-xl border border-white/20 rounded-xl flex flex-col w-full max-w-sm overflow-hidden h-[600px]">
      
      {/* Tab Header */}
      <div className="flex border-b border-slate-100">
        <button onClick={() => setActiveTab('object')} className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1 transition-colors ${activeTab === 'object' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500'}`}>
          <Crosshair size={14} /> 物体
        </button>
        <button onClick={() => setActiveTab('env')} className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1 transition-colors ${activeTab === 'env' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500'}`}>
          <Sliders size={14} /> 环境
        </button>
        <button onClick={() => setActiveTab('display')} className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1 transition-colors ${activeTab === 'display' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500'}`}>
          <Settings2 size={14} /> 显示
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        
        {/* OBJECT TAB */}
        {activeTab === 'object' && (
           <div className="space-y-4 animate-in fade-in">
              {/* Object List */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                 {projectiles.map(p => (
                     <button 
                        key={p.id}
                        onClick={() => setActiveId(p.id)}
                        className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${activeId === p.id ? 'border-indigo-600 scale-110 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}
                        style={{ backgroundColor: p.config.color }}
                     >
                        <span className="text-white text-xs font-bold">{p.config.name}</span>
                     </button>
                 ))}
                 <button onClick={addProjectile} className="flex-shrink-0 w-10 h-10 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-400">
                     <Plus size={16} />
                 </button>
              </div>

              {activeProj && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-2">
                          <span className="text-xs font-bold text-slate-500">当前物体参数</span>
                          {projectiles.length > 1 && (
                              <button onClick={() => removeProjectile(activeId)} className="text-red-400 hover:text-red-600">
                                  <Trash2 size={14} />
                              </button>
                          )}
                      </div>
                      <Slider 
                        label="初速度 (v₀)" 
                        value={activeProj.config.v0} 
                        min={0} max={60} unit="m/s" editable
                        onChange={(v: number) => updateProjectileConfig(activeId, { v0: v })} 
                        />
                        <Slider 
                        label="抛出角度-相对斜面 (β)" 
                        value={activeProj.config.angleLaunch} 
                        min={-90} max={90} unit="°" editable
                        onChange={(v: number) => updateProjectileConfig(activeId, { angleLaunch: v })} 
                        />
                        <div>
                        <label className="text-xs font-semibold text-slate-600 mb-2 block">起始位置</label>
                        <div className="flex bg-slate-200 p-1 rounded-lg">
                            {[
                            { id: StartPosition.Bottom, label: '底端' },
                            { id: StartPosition.Top, label: '顶端' }
                            ].map((pos) => (
                            <button
                                key={pos.id}
                                onClick={() => updateProjectileConfig(activeId, { startPos: pos.id })}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                                activeProj.config.startPos === pos.id
                                    ? 'bg-white text-indigo-600 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {pos.label}
                            </button>
                            ))}
                        </div>
                        </div>
                  </div>
              )}
           </div>
        )}

        {/* ENV TAB */}
        {activeTab === 'env' && (
          <div className="space-y-2 animate-in fade-in">
             <Slider 
              label="斜面倾角 (α)" 
              value={env.angleIncline} 
              min={0} max={80} unit="°" editable
              onChange={(v: number) => setEnv(prev => ({ ...prev, angleIncline: v }))} 
            />
             <Slider 
              label="重力加速度 (g)" 
              value={env.gravity} 
              min={1} max={20} unit="m/s²" editable
              onChange={(v: number) => setEnv(prev => ({ ...prev, gravity: v }))} 
            />
             <div className="pt-2 border-t border-slate-100">
                <Slider 
                    label="仿真速度 (时间倍率)" 
                    value={env.timeScale} 
                    min={0.1} max={5.0} step={0.1} unit="x" editable
                    onChange={(v: number) => setEnv(prev => ({ ...prev, timeScale: v }))} 
                />
             </div>
          </div>
        )}

        {/* DISPLAY TAB */}
        {activeTab === 'display' && (
          <div className="space-y-4 animate-in fade-in">
             <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                 <span className="text-xs font-semibold text-slate-700">显示预测轨迹 (虚线)</span>
                 <button 
                    onClick={() => setEnv(prev => ({ ...prev, showPrediction: !prev.showPrediction }))}
                    className={`w-10 h-5 rounded-full relative transition-colors ${env.showPrediction ? 'bg-indigo-500' : 'bg-slate-300'}`}
                 >
                     <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${env.showPrediction ? 'left-6' : 'left-1'}`} />
                 </button>
             </div>

            <Slider 
              label="速度矢量缩放" 
              value={env.scaleVelocity} 
              min={0.1} max={3.0} step={0.1} unit="x"
              onChange={(v: number) => setEnv(prev => ({ ...prev, scaleVelocity: v }))} 
            />
             <Slider 
              label="位移矢量缩放" 
              value={env.scaleDisplacement} 
              min={0.1} max={3.0} step={0.1} unit="x"
              onChange={(v: number) => setEnv(prev => ({ ...prev, scaleDisplacement: v }))} 
            />
             <div>
              <label className="text-xs font-semibold text-slate-600 mb-2 block">矢量分解模式</label>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
                {[
                  { m: VectorMode.None, l: '无' },
                  { m: VectorMode.Cartesian, l: '水平/竖直' },
                  { m: VectorMode.Incline, l: '平行/垂直' }
                ].map((item) => (
                  <button
                    key={item.m}
                    onClick={() => setVectorMode(item.m)}
                    className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                      vectorMode === item.m
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {item.l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

        {/* Global Action Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 grid grid-cols-2 gap-2">
           <button
             onClick={() => launchProjectile(activeId)}
             className={`flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-white text-xs transition-colors shadow-sm ${
                activeProj?.state.isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-500 hover:bg-indigo-600'
             }`}
           >
             {activeProj?.state.isPlaying ? <><Pause size={14}/> 暂停</> : <><Play size={14}/> 发射选中</>}
           </button>
           
           <button
             onClick={launchAll}
             className="flex items-center justify-center gap-2 py-2 rounded-lg font-bold bg-slate-800 text-white text-xs hover:bg-slate-900 transition-colors shadow-sm"
           >
             <Play size={14} fill="currentColor" /> 发射全部
           </button>
           
           <button
             onClick={resetAll}
             className="col-span-2 flex items-center justify-center p-2 rounded-lg bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors text-xs font-medium"
           >
             <RotateCcw size={14} className="mr-2" /> 全部重置
           </button>
        </div>
    </div>
  );
};
