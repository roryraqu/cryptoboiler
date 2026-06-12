import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import api from '../../api/backendClient';

export default function TrashBin({ profiles, rules, refreshData }) {
  const deletedProfiles = profiles.filter(p => p.is_deleted);
  const deletedRules = rules.filter(r => r.is_deleted);

  const handleRestore = async (table, id) => {
    await api.from(table).update({ is_deleted: false }).eq('id', id);
    refreshData();
  };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-bold text-slate-800 mb-4">Удаленные профили</h3>
        {deletedProfiles.length === 0 ? (
          <p className="text-slate-500">Корзина пуста</p>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Сотрудник</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Роль</th>
                  <th className="py-3 px-4 text-right">Управление</th>
                </tr>
              </thead>
              <tbody>
                {deletedProfiles.map(p => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-800 font-medium">{p.full_name || 'Не указано'}</td>
                    <td className="py-3 px-4 text-slate-600">{p.email}</td>
                    <td className="py-3 px-4 text-blue-600 uppercase text-xs font-bold">{p.role}</td>
                    <td className="py-3 px-4 text-right">
                      <Button size="sm" variant="success" onClick={() => handleRestore('profiles', p.id)}>
                        Восстановить
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      
      <Card>
        <h3 className="text-lg font-bold text-slate-800 mb-4">Удаленные правила NIDS</h3>
        {deletedRules.length === 0 ? (
          <p className="text-slate-500">Корзина пуста</p>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
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
                {deletedRules.map(r => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className={`py-3 px-4 font-bold ${r.action === 'alert' ? 'text-orange-500' : r.action === 'drop' ? 'text-red-600' : 'text-emerald-600'}`}>
                      {r.action}
                    </td>
                    <td className="py-3 px-4 text-blue-600">{r.protocol}</td>
                    <td className="py-3 px-4 text-slate-700">{r.src_ip}</td>
                    <td className="py-3 px-4 text-slate-700">{r.src_port}</td>
                    <td className="py-3 px-4 text-slate-700">{r.dst_ip}</td>
                    <td className="py-3 px-4 text-slate-700">{r.dst_port}</td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate" title={r.msg}>{r.msg}</td>
                    <td className="py-3 px-4 text-slate-600 font-bold">{r.sid}</td>
                    <td className="py-3 px-4 text-right">
                      <Button size="sm" variant="success" onClick={() => handleRestore('suricata_rules', r.id)}>
                        Восстановить
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}