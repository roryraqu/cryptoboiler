import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { CustomSelect } from '../components/ui/CustomSelect';
import BoilerCard from '../components/operator/BoilerCard';
import BoilerDetailsModal from '../components/operator/BoilerDetailsModal';
import ProfileComponent from '../pages/Profile';
import api from '../api/backendClient';

export default function OperatorDashboard() {
  const { logout } = useAuth();
  const [boilers, setBoilers] = useState([]);
  const [telemetryHistory, setTelemetryHistory] = useState({});
  const [intervals, setIntervals] = useState({});
  const [statusMap, setStatusMap] = useState({});
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('operatorActiveTab') || 'boilers');
  const [prevTab, setPrevTab] = useState('boilers');

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedBoilerId, setSelectedBoilerId] = useState(null);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sort, setSort] = useState('name_asc');

  useEffect(() => {
    if (activeTab !== 'profile') localStorage.setItem('operatorActiveTab', activeTab);
  }, [activeTab]);

  const fetchInitialData = useCallback(async () => {
    const { data: bData } = await api.from('boilers').select('*').eq('is_deleted', false);
    if (!bData) return;
    setBoilers(bData);

    const hist = {};
    const ints = {};
    for (const b of bData) {
      const { data: h } = await api.from('telemetry').select('*').eq('boiler_id', b.id).limit(200);
      hist[b.id] = h || [];
      ints[b.id] = 'minutes';
    }
    setTelemetryHistory(hist);
    setIntervals(ints);

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
      setTelemetryHistory(prev => {
        const currentHist = prev[newData.boiler_id] || [];
        return { ...prev, [newData.boiler_id]: [...currentHist, newData].slice(-500) };
      });
    });

    sse.addEventListener('status', (e) => {
      const newData = JSON.parse(e.data);
      setStatusMap(prev => ({ ...prev, [newData.id]: newData.status }));
    });

    return () => sse.close();
  }, [fetchInitialData]);

  const processChartData = (history, interval) => {
    const groups = {};
    history.forEach(t => {
      const d = new Date(t.timestamp);
      let key;
      if (interval === 'minutes') {
        const sec = Math.floor(d.getSeconds() / 10) * 10;
        key = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
      } else if (interval === 'hours') {
        const min = Math.floor(d.getMinutes() / 5) * 5;
        key = `${d.getHours()}:${String(min).padStart(2, '0')}`;
      } else {
        const h = Math.floor(d.getHours() / 2) * 2;
        key = `${d.getDate()}.${d.getMonth() + 1} ${String(h).padStart(2, '0')}:00`;
      }
      if (!groups[key]) groups[key] = { tSum: 0, pSum: 0, count: 0 };
      groups[key].tSum += Number(t.temperature);
      groups[key].pSum += Number(t.pressure);
      groups[key].count += 1;
    });
    return Object.entries(groups).map(([label, d]) => ({ label, temp: d.tSum / d.count, press: d.pSum / d.count })).slice(-12);
  };

  const filteredBoilers = boilers.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase()) || b.id.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterStatus === 'all' ? true : (statusMap[b.id] || 'offline') === filterStatus;
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    if (sort === 'name_asc') return a.name.localeCompare(b.name);
    if (sort === 'name_desc') return b.name.localeCompare(a.name);
    return 0;
  });

  const selectedBoilerData = boilers.find(b => b.id === selectedBoilerId);
  const selectedLatestTelemetry = selectedBoilerId ? telemetryHistory[selectedBoilerId]?.slice(-1)[0] : null;

  return (
    <div className="min-h-screen bg-[#e6e8ec] p-6 text-slate-800">
      <header className="flex justify-between items-center mb-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Панель оператора</h1>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => { setPrevTab(activeTab); setActiveTab('profile'); }}>Профиль</Button>
          <Button variant="secondary" onClick={logout}>Выход</Button>
        </div>
      </header>

      {activeTab === 'boilers' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
            <Input placeholder="Поиск оборудования..." value={search} onChange={e => setSearch(e.target.value)} />
            <CustomSelect value={filterStatus} onChange={val => setFilterStatus(val)} options={[{value: 'all', label: 'Все статусы'}, {value: 'active', label: 'В работе'}, {value: 'stopped', label: 'Остановлен'}]} />
            <CustomSelect value={sort} onChange={val => setSort(val)} options={[{value: 'name_asc', label: 'Имя (А-Я)'}, {value: 'name_desc', label: 'Имя (Я-А)'}]} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBoilers.map(b => {
              const latest = telemetryHistory[b.id]?.slice(-1)[0];
              const nodeStatus = statusMap[b.id] || 'offline';
              return (
                  <BoilerCard
                    key={b.id}
                    boiler={b}
                    latest={latest}
                    chartData={processChartData(telemetryHistory[b.id] || [], intervals[b.id] || 'minutes')}
                    isActive={nodeStatus === 'active'}
                    isOffline={nodeStatus === 'offline'}
                    selected={selectedBoilerId === b.id}
                    onSelect={(id) => { setSelectedBoilerId(id); setDetailsModalOpen(true); }}
                    currentInterval={intervals[b.id]}
                    onIntervalChange={(id, int) => setIntervals(prev => ({...prev, [id]: int}))}
                  />
                );
            })}
          </div>      
        </>
      )}

      {activeTab === 'profile' && <ProfileComponent onBack={() => setActiveTab(prevTab)} />}

      {detailsModalOpen && selectedBoilerData && (
        <BoilerDetailsModal 
          boiler={selectedBoilerData} 
          latest={selectedLatestTelemetry} 
          onClose={() => { setDetailsModalOpen(false); setSelectedBoilerId(null); }} 
        />
      )}
    </div>
  );
}