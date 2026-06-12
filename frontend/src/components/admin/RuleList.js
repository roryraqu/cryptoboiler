import React from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CustomSelect } from '../ui/CustomSelect';

export default function RuleList({ rules, ruleEditId, ruleDraft, setRuleDraft, handleEditRule, handleCancelEditRule, handleSaveRule, handleDeleteRule }) {
  const activeRules = rules.filter(r => !r.is_deleted);

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-2xl">
      <table className="w-full text-left text-sm font-mono">
        <thead className="bg-slate-50">
          <tr className="border-b border-slate-200 text-slate-500 uppercase text-[11px] tracking-wider">
            <th className="py-3 px-4">Действие</th>
            <th className="py-3 px-4">Протокол</th>
            <th className="py-3 px-4">Источник</th>
            <th className="py-3 px-4">Порт исх.</th>
            <th className="py-3 px-4">Назначение</th>
            <th className="py-3 px-4">Порт назн.</th>
            <th className="py-3 px-4">Сообщение</th>
            <th className="py-3 px-4 w-24">SID</th>
            <th className="py-3 px-4 text-right">Управление</th>
          </tr>
        </thead>
        <tbody>
          {activeRules.map(r => {
            const isEditing = ruleEditId === r.id;
            return (
              <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4">
                  {isEditing ? (
                    <CustomSelect value={ruleDraft.action} onChange={val => setRuleDraft(prev => ({ ...prev, action: val }))} options={[{ value: 'alert', label: 'ALERT' }, { value: 'drop', label: 'DROP' }, { value: 'pass', label: 'PASS' }]} />
                  ) : (
                    <span className={`font-bold ${r.action === 'alert' ? 'text-orange-500' : r.action === 'drop' ? 'text-red-600' : 'text-emerald-600'}`}>{r.action}</span>
                  )}
                </td>
                <td className="py-3 px-4 text-blue-600">
                  {isEditing ? (
                    <CustomSelect value={ruleDraft.protocol} onChange={val => setRuleDraft(prev => ({ ...prev, protocol: val }))} options={[{ value: 'tcp', label: 'TCP' }, { value: 'udp', label: 'UDP' }, { value: 'icmp', label: 'ICMP' }, { value: 'ip', label: 'IP' }]} />
                  ) : r.protocol}
                </td>
                <td className="py-3 px-4 text-slate-700">
                  {isEditing ? <Input value={ruleDraft.src_ip} onChange={e => setRuleDraft(prev => ({ ...prev, src_ip: e.target.value }))} /> : r.src_ip}
                </td>
                <td className="py-3 px-4 text-slate-700">
                  {isEditing ? <Input value={ruleDraft.src_port} onChange={e => setRuleDraft(prev => ({ ...prev, src_port: e.target.value }))} /> : r.src_port}
                </td>
                <td className="py-3 px-4 text-slate-700">
                  {isEditing ? <Input value={ruleDraft.dst_ip} onChange={e => setRuleDraft(prev => ({ ...prev, dst_ip: e.target.value }))} /> : r.dst_ip}
                </td>
                <td className="py-3 px-4 text-slate-700">
                  {isEditing ? <Input value={ruleDraft.dst_port} onChange={e => setRuleDraft(prev => ({ ...prev, dst_port: e.target.value }))} /> : r.dst_port}
                </td>
                <td className="py-3 px-4 text-slate-700 max-w-xs truncate" title={r.msg}>
                  {isEditing ? <Input value={ruleDraft.msg} onChange={e => setRuleDraft(prev => ({ ...prev, msg: e.target.value }))} /> : r.msg}
                </td>
                <td className="py-3 px-4 text-slate-600 font-bold">{r.sid}</td>
                <td className="py-3 px-4 text-right">
                  {isEditing ? (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="success" onClick={() => handleSaveRule(r.id)}>Сохранить</Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEditRule}>Отмена</Button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => handleEditRule(r)}>Изменить</Button>
                      <Button size="sm" variant="danger" onClick={() => handleDeleteRule(r.id)}>Удалить</Button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
          {activeRules.length === 0 && (
            <tr><td colSpan="9" className="py-12 text-center text-slate-500 font-sans">Нет активных правил NIDS. Создайте новое правило или проверьте корзину.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}