import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CustomSelect } from '../ui/CustomSelect';

export default function RuleModal({ rule, setRule, onSave, onClose }) {
  return (
    <Modal title={rule.id ? "Редактирование правила" : "Новое правило"} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Действие</label>
            <CustomSelect value={rule.action || 'alert'} onChange={val => setRule({ ...rule, action: val })} options={[{ value: 'alert', label: 'ALERT' }, { value: 'drop', label: 'DROP' }, { value: 'pass', label: 'PASS' }]} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Протокол</label>
            <CustomSelect value={rule.protocol || 'tcp'} onChange={val => setRule({ ...rule, protocol: val })} options={[{ value: 'tcp', label: 'TCP' }, { value: 'udp', label: 'UDP' }, { value: 'icmp', label: 'ICMP' }, { value: 'ip', label: 'IP' }]} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Источник</label>
            <Input value={rule.src_ip || ''} onChange={e => setRule({ ...rule, src_ip: e.target.value })} placeholder="any" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Порт источника</label>
            <Input value={rule.src_port || ''} onChange={e => setRule({ ...rule, src_port: e.target.value })} placeholder="any" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Назначение</label>
            <Input value={rule.dst_ip || ''} onChange={e => setRule({ ...rule, dst_ip: e.target.value })} placeholder="any" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Порт назначения</label>
            <Input value={rule.dst_port || ''} onChange={e => setRule({ ...rule, dst_port: e.target.value })} placeholder="any" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Сообщение</label>
          <Input value={rule.msg || ''} onChange={e => setRule({ ...rule, msg: e.target.value })} required />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Идентификатор</label>
          <Input value={rule.sid || ''} onChange={e => setRule({ ...rule, sid: e.target.value })} placeholder="Авто" />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button onClick={onSave}>Сохранить</Button>
        </div>
      </div>
    </Modal>
  );
}