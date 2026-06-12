import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { CustomSelect } from '../components/ui/CustomSelect';
import EquipmentList from '../components/manager/EquipmentList';
import EquipmentModal from '../components/manager/EquipmentModal';
import HmacIncidents from '../components/manager/HmacIncidents';
import ManagerTrashBin from '../components/manager/TrashBin';
import ProfileComponent from '../pages/Profile';
import api from '../api/backendClient';

const ITEMS_PER_PAGE = 5;

const downloadLogs = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export default function ManagerDashboard() {
  const { logout, user } = useAuth();
  const [boilers, setBoilers] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [telemetryMap, setTelemetryMap] = useState({});
  const [statusMap, setStatusMap] = useState({});
  
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [currentBoiler, setCurrentBoiler] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('managerActiveTab') || 'equipment');
  const [prevTab, setPrevTab] = useState('equipment');

  const [bSearch, setBSearch] = useState('');
  const [bFilterStatus, setBFilterStatus] = useState('all');
  const [bSort, setBSort] = useState('name_asc');
  const [bPage, setBPage] = useState(1);

  const [incSearch, setIncSearch] = useState('');
  const [incFilterStatus, setIncFilterStatus] = useState('all');
  const [incPage, setIncPage] = useState(1);

  const fetchInitialData = useCallback(async () => {
    const { data: bData } = await api.from('boilers').select('*');
    if (bData) setBoilers(bData);

    const { data: iData } = await api.from('incidents').select('*').eq('source', 'hmac_mismatch').order('created_at', { ascending: false });
    if (iData) setIncidents(iData);

    const { data: tData } = await api.from('telemetry').select('*').limit(200);
    if (tData) {
      const newMap = {};
      tData.forEach(t => { if (!newMap[t.boiler_id]) newMap[t.boiler_id] = t; });
      setTelemetryMap(newMap);
    }

    const baseUrl = process.env.REACT_APP_BACKEND_URL || '';
    fetch(`${baseUrl}/api/boilers/statuses/all`)
      .then(r => r.json())
      .then(d => setStatusMap(d.statuses || {}));
  }, []);

  useEffect(() => {
    fetchInitialData();
    const baseUrl = process.env.REACT_APP_BACKEND_URL || '';
    const sse = new EventSource(`${baseUrl}/api/stream`, { withCredentials: true });

    sse.addEventListener('telemetry', (e) => {
      const newData = JSON.parse(e.data);
      setTelemetryMap(prev => ({ ...prev, [newData.boiler_id]: newData }));
    });

    sse.addEventListener('status', (e) => {
      const newData = JSON.parse(e.data);
      setStatusMap(prev => ({ ...prev, [newData.id]: newData.status }));
    });

    sse.addEventListener('incident', (e) => {
      const newData = JSON.parse(e.data);
      setIncidents(prev => {
        const exists = prev.find(i => i.id === newData.id);
        if (exists) return prev.map(i => i.id === newData.id ? newData : i);
        return [newData, ...prev];
      });
    });

    sse.addEventListener('boiler_change', (e) => {
      const changed = JSON.parse(e.data);
      setBoilers(prev => {
        const exists = prev.find(b => b.id === changed.id);
        if (exists) return prev.map(b => b.id === changed.id ? changed : b);
        return [...prev, changed];
      });
    });

    return () => sse.close();
  }, [fetchInitialData]);

  useEffect(() => {
    if (activeTab !== 'profile') localStorage.setItem('managerActiveTab', activeTab);
  }, [activeTab]);

  const changeBoilerStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'stopped' : 'active';
    try {
      const baseUrl = process.env.REACT_APP_BACKEND_URL || '';
      await fetch(`${baseUrl}/api/boilers/${id}/status`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ status: newStatus }) 
      });
      await api.from('audit_logs').insert({ user_id: user.id, action: `MANAGER_STATUS_${newStatus.toUpperCase()}`, details: { boiler_id: id } });
    } catch {
      console.error(`Не удалось изменить статус котла ${id}`);
    }
  };

  const handleSaveBoiler = async () => {
    setIsSaving(true);
    try {
      if (currentBoiler.isNew) {
        await api.from('boilers').insert({ id: currentBoiler.id, name: currentBoiler.name, hmac_secret: currentBoiler.secret, ip_address: currentBoiler.ip, port: currentBoiler.port });
        await api.from('audit_logs').insert({ user_id: user.id, action: 'MANAGER_CREATE_BOILER', details: currentBoiler });
      } else {
        await api.from('boilers').update({ name: currentBoiler.name, hmac_secret: currentBoiler.secret, ip_address: currentBoiler.ip, port: currentBoiler.port }).eq('id', currentBoiler.id);
        await api.from('audit_logs').insert({ user_id: user.id, action: 'MANAGER_UPDATE_BOILER', details: { boiler_id: currentBoiler.id } });
      }
      setEquipmentModalOpen(false);
      setCurrentBoiler(null);
    } finally { setIsSaving(false); }
  };

  const handleDeleteBoiler = async (id) => {
    await api.from('boilers').update({ is_deleted: true }).eq('id', id);
  };

  const handleResolveIncident = async (incidentId) => {
    await api.from('incidents').update({ status: 'resolved' }).eq('id', incidentId);
    await api.from('audit_logs').insert({ user_id: user.id, action: 'MANAGER_RESOLVED_INCIDENT', details: { incident_id: incidentId } });
  };

  const filteredBoilers = boilers.filter(b => !b.is_deleted).filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(bSearch.toLowerCase()) || b.id.toLowerCase().includes(bSearch.toLowerCase());
    const matchesFilter = bFilterStatus === 'all' ? true : (statusMap[b.id] || 'offline') === bFilterStatus;
    return matchesSearch && matchesFilter;
  }).sort((a, b) => bSort === 'name_asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
  const totalBoilerPages = Math.ceil(filteredBoilers.length / ITEMS_PER_PAGE) || 1;
  const displayedBoilers = filteredBoilers.slice((bPage - 1) * ITEMS_PER_PAGE, bPage * ITEMS_PER_PAGE);

  const filteredIncidents = incidents.filter(inc => {
    const matchesSearch = (inc.description || '').toLowerCase().includes(incSearch.toLowerCase()) || (inc.boiler_id || '').toLowerCase().includes(incSearch.toLowerCase());
    const matchesFilter = incFilterStatus === 'all' ? true : inc.status === incFilterStatus;
    return matchesSearch && matchesFilter;
  });
  const totalIncPages = Math.ceil(filteredIncidents.length / ITEMS_PER_PAGE) || 1;
  const displayedIncidents = filteredIncidents.slice((incPage - 1) * ITEMS_PER_PAGE, incPage * ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-[#e6e8ec] p-6 text-slate-800">
      <header className="flex justify-between items-center mb-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Панель начальника смены</h1>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => { setPrevTab(activeTab); setActiveTab('profile'); }}>Профиль</Button>
          <Button variant="ghost" onClick={logout}>Выход</Button>
        </div>
      </header>

      {activeTab !== 'profile' && (
        <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-fit">
          {['equipment', 'incidents', 'trash'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === tab ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}>
              {tab === 'equipment' ? 'Контроль котлов' : tab === 'incidents' ? 'Инциденты' : 'Корзина'}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'equipment' && (
        <Card className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-slate-800">Управление оборудованием</h3>
            <Button onClick={() => { setCurrentBoiler({ isNew: true }); setEquipmentModalOpen(true); }}>Добавить узел</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input className="md:col-span-2" placeholder="Поиск котла..." value={bSearch} onChange={e => { setBSearch(e.target.value); setBPage(1); }} />
            <CustomSelect value={bFilterStatus} onChange={val => { setBFilterStatus(val); setBPage(1); }} options={[{value: 'all', label: 'Все статусы'}, {value: 'active', label: 'Включенные'}, {value: 'stopped', label: 'Остановленные'}]} />
            <CustomSelect value={bSort} onChange={val => { setBSort(val); setBPage(1); }} options={[{value: 'name_asc', label: 'Имя (А-Я)'}, {value: 'name_desc', label: 'Имя (Я-А)'}]} />
          </div>
          <EquipmentList boilers={displayedBoilers} telemetryMap={telemetryMap} changeBoilerStatus={changeBoilerStatus} handleDeleteBoiler={handleDeleteBoiler} handleEditBoiler={(b) => { setCurrentBoiler({ ...b, isNew: false }); setEquipmentModalOpen(true); }} statusMap={statusMap} />
          {totalBoilerPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button size="sm" variant="secondary" disabled={bPage === 1} onClick={() => setBPage(bPage - 1)}>Назад</Button>
              <span className="text-sm self-center text-slate-500">Стр {bPage} из {totalBoilerPages}</span>
              <Button size="sm" variant="secondary" disabled={bPage === totalBoilerPages} onClick={() => setBPage(bPage + 1)}>Вперед</Button>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'incidents' && (
        <Card className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-2/3">
              <Input placeholder="Поиск инцидентов..." value={incSearch} onChange={e => { setIncSearch(e.target.value); setIncPage(1); }} />
              <CustomSelect value={incFilterStatus} onChange={val => { setIncFilterStatus(val); setIncPage(1); }} options={[{value: 'all', label: 'Все события'}, {value: 'open', label: 'Активные'}, {value: 'resolved', label: 'Разрешенные'}]} />
            </div>
            
            <Button 
              variant="secondary" 
              onClick={() => downloadLogs(filteredIncidents, 'incidents')}
            >
              Скачать JSON
            </Button>
          </div>

          <HmacIncidents incidents={displayedIncidents} boilers={boilers} changeBoilerStatus={changeBoilerStatus} onResolve={handleResolveIncident}/>
          
          {totalIncPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button size="sm" variant="secondary" disabled={incPage === 1} onClick={() => setIncPage(incPage - 1)}>Назад</Button>
              <span className="text-sm self-center text-slate-500">Стр {incPage} из {totalIncPages}</span>
              <Button size="sm" variant="secondary" disabled={incPage === totalIncPages} onClick={() => setIncPage(incPage + 1)}>Вперед</Button>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'profile' && <ProfileComponent onBack={() => setActiveTab(prevTab)} />}
      {activeTab === 'trash' && <ManagerTrashBin boilers={boilers} fetchBoilers={fetchInitialData} />}

      {equipmentModalOpen && <EquipmentModal boiler={currentBoiler} setBoiler={setCurrentBoiler} onSave={handleSaveBoiler} onClose={() => setEquipmentModalOpen(false)} isSaving={isSaving} />}
    </div>
  );
}