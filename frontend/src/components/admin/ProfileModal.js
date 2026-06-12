import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CustomSelect } from '../ui/CustomSelect';

export default function ProfileModal({ profile, setProfile, onSave, onClose }) {
  return (
    <Modal title="Редактирование профиля" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">ФИО</label>
          <Input value={profile.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Электронная почта</label>
          <Input value={profile.email || ''} onChange={e => setProfile({...profile, email: e.target.value})} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Роль</label>
          <CustomSelect 
            value={profile.role || 'pending'} 
            onChange={val => setProfile({...profile, role: val})}
            options={[
              {value: 'admin', label: 'Администратор'}, 
              {value: 'manager', label: 'Начальник смены'}, 
              {value: 'operator', label: 'Оператор'}, 
              {value: 'pending', label: 'Ожидает'}
            ]}
          />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button variant="success" onClick={onSave}>Сохранить</Button>
        </div>
      </div>
    </Modal>
  );
}