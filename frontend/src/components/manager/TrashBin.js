import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import api from '../../api/backendClient';

export default function ManagerTrashBin({ boilers, fetchBoilers }) {
  const deletedBoilers = boilers.filter(b => b.is_deleted);

  const handleRestore = async (id) => {
    await api.from('boilers').update({ is_deleted: false }).eq('id', id);
    fetchBoilers();
  };

  return (
    <Card>
      <h3 className="text-lg font-bold text-slate-800 mb-4">Удаленное оборудование</h3>
      {deletedBoilers.length === 0 ? (
        <p className="text-slate-500">Корзина пуста</p>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-slate-500 uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4">Котел</th>
                <th className="py-3 px-4">Сетевой адрес</th>
                <th className="py-3 px-4">HMAC Секрет</th>
                <th className="py-3 px-4 text-right">Управление</th>
              </tr>
            </thead>
            <tbody>
              {deletedBoilers.map(b => (
                <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <p className="text-slate-800 font-medium">{b.name}</p>
                    <p className="text-slate-500 text-xs font-mono">{b.id}</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-slate-600 font-mono text-xs">{b.ip_address || 'any'}:{b.port || 'any'}</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-slate-500 font-mono text-xs max-w-[150px] truncate" title={b.hmac_secret}>
                      {b.hmac_secret}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button size="sm" variant="success" onClick={() => handleRestore(b.id)}>
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
  );
}