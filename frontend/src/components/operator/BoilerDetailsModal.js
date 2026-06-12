import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export default function BoilerDetailsModal({ boiler, latest, onClose }) {
  if (!boiler) return null;

  return (
    <Modal title={`Детализация: ${boiler.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Идентификатор</p>
            <p className="text-sm font-mono text-slate-800">{boiler.id}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Сетевой адрес</p>
            <p className="text-sm font-mono text-slate-800">{boiler.ip_address}:{boiler.port}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Температура</p>
            <p className="text-2xl font-bold text-emerald-600">{latest ? `${Number(latest.temperature).toFixed(2)} °C` : 'Нет данных'}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Давление</p>
            <p className="text-2xl font-bold text-orange-500">{latest ? `${Number(latest.pressure).toFixed(2)} MPa` : 'Нет данных'}</p>
          </div>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Секретный ключ</p>
            <p className="text-sm font-mono text-slate-800 break-all">{boiler.hmac_secret}</p>
        </div>
        <div className="flex justify-end pt-4">
          <Button onClick={onClose} variant="secondary">Закрыть</Button>
        </div>
      </div>
    </Modal>
  );
}