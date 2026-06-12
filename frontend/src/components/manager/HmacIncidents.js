import React from 'react';
import { Button } from '../ui/Button';

export default function HmacIncidents({ incidents, boilers, changeBoilerStatus, isLoading, onResolve }) {
  if (incidents.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-12 text-center">
        <h3 className="text-xl font-bold text-slate-800 mb-2">Инциденты отсутствуют</h3>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
      <h3 className="text-slate-800 font-bold text-lg mb-4">Журнал безопасности целостности (HMAC)</h3>
      <div className="grid gap-4">
        {incidents.map(inc => {
          const relatedBoiler = boilers.find(b => b.id === inc.boiler_id);
          const isOpen = inc.status === 'open';
          return (
            <div key={inc.id} className={`flex justify-between items-center bg-white p-4 rounded-lg border ${isOpen ? 'border-red-300' : 'border-slate-200'}`}>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${isOpen ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'}`}>
                    {isOpen ? 'АКТИВЕН' : 'РАЗРЕШЕН'}
                  </span>
                  <span className="text-xs text-slate-500">{new Date(inc.created_at).toLocaleString()}</span>
                </div>
                <span className="text-slate-800 text-sm block mt-2">{inc.description}</span>
              </div>
              
              {isOpen && (
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => onResolve(inc.id)}>Квитировать</Button>
                  {relatedBoiler && relatedBoiler.status === 'active' && (
                    <Button variant="danger" size="sm" disabled={isLoading} onClick={() => changeBoilerStatus(relatedBoiler.id, relatedBoiler.ip_address, relatedBoiler.port, 'active')}>Экстренный стоп</Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}