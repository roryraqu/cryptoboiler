import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export default function EquipmentModal({ boiler, setBoiler, onSave, onClose, isSaving }) {
  return (
    <Modal title={boiler.isNew ? "Регистрация узла" : "Редактирование оборудования"} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Системный номер</label>
          <Input 
            value={boiler.id || ''} 
            onChange={e => setBoiler({ ...boiler, id: e.target.value })} 
            required 
            disabled={!boiler.isNew}
            className={!boiler.isNew ? 'opacity-60 bg-slate-100' : ''}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Название</label>
          <Input value={boiler.name || ''} onChange={e => setBoiler({ ...boiler, name: e.target.value })} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Сетевой адрес</label>
            <Input value={boiler.ip || boiler.ip_address || ''} onChange={e => setBoiler({ ...boiler, ip: e.target.value })} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Порт</label>
            <Input value={boiler.port || ''} onChange={e => setBoiler({ ...boiler, port: e.target.value })} required />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Секретный ключ</label>
          <Input value={boiler.secret || boiler.hmac_secret || ''} onChange={e => setBoiler({ ...boiler, secret: e.target.value })} required />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Отмена</Button>
          <Button type="submit" disabled={isSaving}>Сохранить</Button>
        </div>
      </form>
    </Modal>
  );
}