import React from 'react';
import { Button } from '../ui/Button';

export default function ProfileList({ profiles, handleEditProfile, handleDeleteProfile }) {
  const activeProfiles = profiles.filter(p => !p.is_deleted);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="py-3 px-3">Сотрудник</th>
            <th className="py-3 px-3">Email</th>
            <th className="py-3 px-3">Роль</th>
            <th className="py-3 px-3 text-right">Действия</th>
          </tr>
        </thead>
        <tbody>
          {activeProfiles.map(profile => (
            <tr key={profile.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-3 px-3 text-slate-800 font-medium">{profile.full_name || 'Не указано'}</td>
              <td className="py-3 px-3 text-slate-600">{profile.email}</td>
              <td className="py-3 px-3 uppercase text-xs font-bold text-blue-600">{profile.role}</td>
              <td className="py-3 px-3 text-right space-x-2">
                <Button size="sm" variant="secondary" onClick={() => handleEditProfile(profile)}>Изменить</Button>
                <Button size="sm" variant="danger" onClick={() => handleDeleteProfile(profile.id)}>В корзину</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}