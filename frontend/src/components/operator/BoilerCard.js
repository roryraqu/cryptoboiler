import React, { useState } from 'react';
import { Card } from '../ui/Card';

export default function BoilerCard({ boiler, latest, chartData, isActive, isOffline, isCompromised, onIntervalChange, currentInterval, onSelect, selected }) {
  const [metric, setMetric] = useState('temp');
  const isStopped = !isOffline && !isActive;

  return (
    <Card onClick={() => onSelect?.(boiler.id)} className={`flex flex-col transition-all duration-300 cursor-pointer ${selected ? 'ring-2 ring-blue-500' : ''} ${isOffline ? 'border-orange-300 bg-orange-50/50' : isStopped ? 'opacity-70' : isCompromised ? 'border-red-300 bg-red-50/50' : ''}`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{boiler.name}</h3>
          <p className="text-xs text-slate-500 font-mono">{boiler.id}</p>
        </div>
        {!isOffline && (
          <div className="flex items-center gap-1.5">
            {isActive && <span className="online-dot"></span>}
            <span className={`text-[10px] font-bold uppercase ${isActive ? 'text-emerald-600' : 'text-orange-500'}`}>
              {isActive ? 'В РАБОТЕ' : 'ОСТАНОВЛЕН'}
            </span>
          </div>
        )}
      </div>

      {isOffline ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8">
          <p className="text-lg font-bold text-rose-500">НЕТ СВЯЗИ</p>
          <p className="text-sm text-slate-500 mt-2">Последняя телеметрия: {latest ? new Date(latest.timestamp).toLocaleString() : 'нет данных'}</p>
        </div>
      ) : (latest ? (
        <div className="flex-1 space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Темп.</span>
              <p className="text-lg font-bold text-emerald-600">{Number(latest.temperature).toFixed(1)}°C</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Давл.</span>
              <p className="text-lg font-bold text-orange-500">{Number(latest.pressure).toFixed(1)} MPa</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <div className="flex bg-slate-200 rounded p-0.5">
                <button onClick={(e) => { e.stopPropagation(); setMetric('temp'); }} className={`px-2 py-1 text-[9px] rounded font-medium ${metric === 'temp' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Темп</button>
                <button onClick={(e) => { e.stopPropagation(); setMetric('press'); }} className={`px-2 py-1 text-[9px] rounded font-medium ${metric === 'press' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Давл</button>
              </div>
              <div className="flex bg-slate-200 rounded p-0.5">
                {['minutes', 'hours', 'days'].map(int => (
                  <button key={int} onClick={(e) => { e.stopPropagation(); onIntervalChange(boiler.id, int); }} className={`px-2 py-1 text-[9px] rounded font-medium ${currentInterval === int ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500'}`}>
                    {int === 'minutes' ? 'Мин' : int === 'hours' ? 'Час' : 'Дни'}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="h-24 flex items-end justify-between gap-1">
              {chartData.map((d, i) => {
                const val = metric === 'temp' ? d.temp : d.press;
                const max = metric === 'temp' ? 120 : 6;
                const color = metric === 'temp' ? 'bg-emerald-400' : 'bg-orange-400';
                return (
                  <div key={i} className="flex-1 group relative h-full flex items-end" title={`${metric}: ${Number(val).toFixed(1)}`}>
                    <div className={`w-full rounded-t-[2px] transition-all ${color}`} style={{ height: `${(Math.max(0, val) / max) * 100}%` }}></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : <div className="py-8 text-center text-slate-500 text-xs">Ожидание данных...</div>)}
    </Card>
  );
}