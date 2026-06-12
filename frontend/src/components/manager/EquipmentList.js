import React from 'react';
import { Button } from '../ui/Button';
import EquipmentForm from './EquipmentForm';

export default function EquipmentList({ boilers, changeBoilerStatus, isLoading, isSaving, handleDeleteBoiler, handleEditBoiler, selectedBoilerId, handleSaveBoiler, handleCancelEdit, statusMap }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="pb-3 px-2">Котел</th>
            <th className="pb-3 px-2">Сетевой адрес</th>
            <th className="pb-3 px-2">Статус</th>
            <th className="pb-3 px-2 text-right">Управление</th>
          </tr>
        </thead>
        <tbody>
          {boilers.filter(b => !b.is_deleted).flatMap(b => {
            const nodeStatus = statusMap[b.id] || 'offline';
            const displayIsActive = nodeStatus === 'active';
            const isUnavailable = nodeStatus === 'offline';
            
            const row = (
              <tr key={b.id} className={`border-b border-slate-100 hover:bg-slate-50 ${selectedBoilerId === b.id ? 'bg-blue-50' : ''}`}>
                <td className="py-4 px-2">
                  <p className="text-slate-800 font-medium">{b.name}</p>
                  <p className="text-slate-500 text-xs">{b.id}</p>
                </td>
                <td className="py-4 px-2">
                  <p className="text-slate-600 font-mono text-xs">{b.ip_address || 'any'}:{b.port || 'any'}</p>
                </td>
                <td className="py-4 px-2">
                  {isUnavailable ? (
                    <span className="px-2 py-1 rounded text-xs font-bold bg-slate-200 text-slate-600">НЕ ДОСТУПЕН</span>
                  ) : (
                    <span className={`px-2 py-1 rounded text-xs font-bold ${displayIsActive ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                      {displayIsActive ? 'ВКЛ' : 'ВЫКЛ'}
                    </span>
                  )}
                </td>
                <td className="py-4 px-2 text-right flex justify-end items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => handleEditBoiler(b)}>Изменить</Button>
                  <button 
                    onClick={() => changeBoilerStatus(b.id, nodeStatus)}
                    disabled={isUnavailable || isLoading}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${isUnavailable ? 'bg-slate-300' : displayIsActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${displayIsActive && !isUnavailable ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <Button size="sm" variant="danger" onClick={() => handleDeleteBoiler(b.id)}>В корзину</Button>
                </td>
              </tr>
            );

            const editRow = selectedBoilerId === b.id ? (
              <tr key={`${b.id}-edit`} className="bg-slate-50">
                <td colSpan="4" className="p-3 border-t border-slate-200">
                  <EquipmentForm compact initialData={b} handleSaveBoiler={handleSaveBoiler} onCancelEdit={handleCancelEdit} isSaving={isSaving} />
                </td>
              </tr>
            ) : null;

            return [row, editRow];
          })}
        </tbody>
      </table>
    </div>
  );
}