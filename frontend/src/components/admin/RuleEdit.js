import React from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CustomSelect } from '../ui/CustomSelect';

export default function RuleEdit({ newRule, setNewRule, handleCreateRule }) {
  return (
    <form onSubmit={handleCreateRule} className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
      <div className="md:col-span-1">
        <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Действие</label>
        <CustomSelect
          value={newRule.action}
          onChange={val => setNewRule({ ...newRule, action: val })}
          className="w-full"
          options={[{ value: 'alert', label: 'ALERT' }, { value: 'drop', label: 'DROP' }, { value: 'pass', label: 'PASS' }]}
        />
      </div>
      <div className="md:col-span-1">
        <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Протокол</label>
        <CustomSelect
          value={newRule.protocol}
          onChange={val => setNewRule({ ...newRule, protocol: val })}
          className="w-full"
          options={[{ value: 'tcp', label: 'TCP' }, { value: 'udp', label: 'UDP' }, { value: 'icmp', label: 'ICMP' }, { value: 'ip', label: 'IP' }]}
        />
      </div>
      <div className="md:col-span-1">
        <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">IP Источника</label>
        <Input type="text" value={newRule.src_ip} onChange={e => setNewRule({ ...newRule, src_ip: e.target.value })} placeholder="any" />
      </div>
      <div className="md:col-span-1">
        <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Порт Источника</label>
        <Input type="text" value={newRule.src_port} onChange={e => setNewRule({ ...newRule, src_port: e.target.value })} placeholder="any" />
      </div>
      <div className="md:col-span-1">
        <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">IP Назначения</label>
        <Input type="text" value={newRule.dst_ip} onChange={e => setNewRule({ ...newRule, dst_ip: e.target.value })} placeholder="any" />
      </div>
      <div className="md:col-span-1">
        <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Порт Назначения</label>
        <Input type="text" value={newRule.dst_port} onChange={e => setNewRule({ ...newRule, dst_port: e.target.value })} placeholder="any" />
      </div>
      <div className="md:col-span-1 flex items-end">
        <Button type="submit" className="w-full h-[38px]">Добавить</Button>
      </div>
      <div className="md:col-span-7 mt-2 flex gap-4">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Сообщение (msg)</label>
          <Input type="text" value={newRule.msg} onChange={e => setNewRule({ ...newRule, msg: e.target.value })} placeholder="Например: Подозрительный SSH трафик" required />
        </div>
        <div className="w-32">
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">SID</label>
          <Input type="text" value={newRule.sid} onChange={e => setNewRule({ ...newRule, sid: e.target.value })} placeholder="Авто" />
        </div>
      </div>
    </form>
  );
}