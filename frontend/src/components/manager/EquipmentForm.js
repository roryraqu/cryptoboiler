import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export default function EquipmentForm({ compact = false, initialData, handleSaveBoiler, onCancelEdit, isSaving }) {
  const [formData, setFormData] = useState({ id: '', name: '', ip: '', port: '', secret: '' });

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        name: initialData.name || '',
        ip: initialData.ip_address || '',
        port: initialData.port || '',
        secret: initialData.hmac_secret || '',
      });
    } else {
      setFormData({ id: '', name: '', ip: '', port: '', secret: '' });
    }
  }, [initialData]);

  const submit = (e) => {
    e.preventDefault();
    handleSaveBoiler(formData);
  };

  if (compact) {
    return (
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
        <div className="min-w-[180px] flex-1">
          <label className="block text-[11px] uppercase tracking-wide text-slate-500 mb-1">Название</label>
          <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required className="h-11" />
        </div>
        <div className="min-w-[160px] flex-1">
          <label className="block text-[11px] uppercase tracking-wide text-slate-500 mb-1">IP Адрес</label>
          <Input value={formData.ip} onChange={e => setFormData({ ...formData, ip: e.target.value })} required className="h-11" />
        </div>
        <div className="min-w-[120px] w-28">
          <label className="block text-[11px] uppercase tracking-wide text-slate-500 mb-1">Порт</label>
          <Input value={formData.port} onChange={e => setFormData({ ...formData, port: e.target.value })} required className="h-11" />
        </div>
        <div className="min-w-[220px] flex-1">
          <label className="block text-[11px] uppercase tracking-wide text-slate-500 mb-1">HMAC</label>
          <Input value={formData.secret} onChange={e => setFormData({ ...formData, secret: e.target.value })} required className="h-11" />
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <Button type="submit" size="sm" disabled={isSaving} className="shrink-0">
            Сохранить
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onCancelEdit} disabled={isSaving} className="shrink-0">
            Отмена
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input
        placeholder="ID (например, boiler-001)"
        value={formData.id}
        onChange={e => setFormData({ ...formData, id: e.target.value })}
        required
        disabled={Boolean(initialData)}
        className={initialData ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''}
      />
      <Input placeholder="Название" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="IP Адрес" value={formData.ip} onChange={e => setFormData({ ...formData, ip: e.target.value })} required />
        <Input placeholder="Порт" value={formData.port} onChange={e => setFormData({ ...formData, port: e.target.value })} required />
      </div>
      <Input placeholder="Секретный ключ HMAC" value={formData.secret} onChange={e => setFormData({ ...formData, secret: e.target.value })} required />
      <div className="flex flex-col gap-2">
        <Button type="submit" className="w-full" disabled={isSaving}>
          {initialData ? 'Сохранить изменения' : 'Зарегистрировать котел'}
        </Button>
        {initialData && (
          <Button type="button" variant="secondary" className="w-full" onClick={onCancelEdit} disabled={isSaving}>
            Отменить редактирование
          </Button>
        )}
      </div>
    </form>
  );
}