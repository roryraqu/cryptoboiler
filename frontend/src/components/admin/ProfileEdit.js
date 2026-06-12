import React from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CustomSelect } from '../ui/CustomSelect';

export default function ProfileEdit({ draft, setDraft, onSave, onCancel }) {
  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 mb-6">
      <Input value={draft.full_name} onChange={e => setDraft({...draft, full_name: e.target.value})} placeholder="ФИО" />
      <Input value={draft.email} onChange={e => setDraft({...draft, email: e.target.value})} placeholder="Email" />
      <CustomSelect 
        value={draft.role} 
        onChange={val => setDraft({...draft, role: val})}
        options={[{value: 'admin', label: 'Администратор'}, {value: 'manager', label: 'Начальник смены'}, {value: 'operator', label: 'Оператор'}, {value: 'pending', label: 'Ожидает'}]}
      />
      <div className="flex gap-2">
        <Button variant="success" size="sm" onClick={onSave}>Сохранить профиль</Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>Отмена</Button>
      </div>
    </div>
  );
}