import React from 'react';

export default function SuricataLogList({ logs }) {
  if (!logs?.length) {
    return <p className="text-slate-500">Логов Suricata нет.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="pb-3 px-2">Дата</th>
            <th className="pb-3 px-2">Severity</th>
            <th className="pb-3 px-2">Описание</th>
            <th className="pb-3 px-2">Котёл</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-3 px-2 text-slate-700">{new Date(log.created_at).toLocaleString()}</td>
              <td className="py-3 px-2 text-slate-700 uppercase">{log.severity || 'unknown'}</td>
              <td className="py-3 px-2 text-slate-700 font-mono text-[12px] break-all">{log.description}</td>
              <td className="py-3 px-2 text-slate-700">{log.boiler_id || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}