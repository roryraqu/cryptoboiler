import React from 'react';

export default function AuditLogList({ logs }) {
  if (!logs?.length) {
    return <p className="text-slate-500">Системных логов нет.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="pb-3 px-2">Дата</th>
            <th className="pb-3 px-2">Пользователь</th>
            <th className="pb-3 px-2">Действие</th>
            <th className="pb-3 px-2">Детали</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-3 px-2 text-slate-700">{new Date(log.created_at).toLocaleString()}</td>
              <td className="py-3 px-2 text-slate-700">{log.user_email}</td>
              <td className="py-3 px-2 text-slate-700">{log.action}</td>
              <td className="py-3 px-2 text-slate-700 font-mono text-[12px] break-all">{typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}