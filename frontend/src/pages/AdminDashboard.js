import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { CustomSelect } from '../components/ui/CustomSelect';
import ProfileList from '../components/admin/ProfileList';
import ProfileModal from '../components/admin/ProfileModal';
import TrashBin from '../components/admin/TrashBin';
import RuleModal from '../components/admin/RuleModal';
import RuleList from '../components/admin/RuleList';
import AuditLogList from '../components/admin/AuditLogList';
import SuricataLogList from '../components/admin/SuricataLogList';
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

export default function AdminDashboard() {
  const { logout, user } = useAuth();
  
  const [profiles, setProfiles] = useState([]);
  const [rules, setRules] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [suricataLogs, setSuricataLogs] = useState([]);
  
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('adminActiveTab') || 'profiles');
  const [prevTab, setPrevTab] = useState('profiles');

  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState(null);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(null);

  const [pSearch, setPSearch] = useState('');
  const [pFilterRole, setPFilterRole] = useState('all');
  const [pPage, setPPage] = useState(1);

  const [rSearch, setRSearch] = useState('');
  const [rFilterProto, setRFilterProto] = useState('all');
  const [rPage, setRPage] = useState(1);

  const [auditSearch, setAuditSearch] = useState('');
  const [auditPage, setAuditPage] = useState(1);

  const [suricataSearch, setSuricataSearch] = useState('');
  const [suricataPage, setSuricataPage] = useState(1);

  const fetchInitialData = async () => {
    const { data: p } = await api.from('profiles').select('*');
    const { data: r } = await api.from('suricata_rules').select('*');
    const { data: a } = await api.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
    const { data: s } = await api.from('incidents').select('*').eq('source', 'suricata').order('created_at', { ascending: false }).limit(200);
    
    if (p) setProfiles(p);
    if (r) setRules(r);
    if (a) setAuditLogs(a);
    if (s) setSuricataLogs(s);
  };

  useEffect(() => {
    fetchInitialData();

    const baseUrl = process.env.REACT_APP_BACKEND_URL || '';
    const sse = new EventSource(`${baseUrl}/api/stream`, { withCredentials: true });

    sse.addEventListener('audit_log', (e) => {
      const log = JSON.parse(e.data);
      setAuditLogs(prev => [log, ...prev].slice(0, 500));
    });

    sse.addEventListener('incident', (e) => {
      const inc = JSON.parse(e.data);
      setSuricataLogs(prev => [inc, ...prev].slice(0, 500));
    });

    sse.addEventListener('rule_change', (e) => {
      const changed = JSON.parse(e.data);
      setRules(prev => {
        const exists = prev.find(r => r.id === changed.id);
        if (exists) return prev.map(r => r.id === changed.id ? changed : r);
        return [...prev, changed];
      });
    });

    sse.addEventListener('profile_change', (e) => {
      const changed = JSON.parse(e.data);
      setProfiles(prev => {
        const exists = prev.find(p => p.id === changed.id);
        if (exists) return prev.map(p => p.id === changed.id ? changed : p);
        return [...prev, changed];
      });
    });

    return () => sse.close();
  }, []);

  useEffect(() => {
    if (activeTab !== 'profile') {
      localStorage.setItem('adminActiveTab', activeTab);
    }
  }, [activeTab]);

  const handleSaveRule = async () => {
    if (currentRule.id) {
      await api.from('suricata_rules').update(currentRule).eq('id', currentRule.id);
    } else {
      await api.from('suricata_rules').insert(currentRule);
    }
    setRuleModalOpen(false);
    setCurrentRule(null);
  };

  const handleDeleteRule = async (id) => {
    await api.from('suricata_rules').update({ is_deleted: true }).eq('id', id);
  };

  const handleSaveProfile = async () => {
    await api.from('profiles').update(currentProfile).eq('id', currentProfile.id);
    await api.from('audit_logs').insert({ user_id: user.id, action: 'ADMIN_UPDATE_PROFILE', details: { profile_id: currentProfile.id } });
    setProfileModalOpen(false);
    setCurrentProfile(null);
  };

  const handleDeleteProfile = async (id) => {
    await api.from('profiles').update({ is_deleted: true }).eq('id', id);
    await api.from('audit_logs').insert({ user_id: user.id, action: 'ADMIN_SOFT_DELETE_PROFILE', details: { profile_id: id } });
  };

  const activeProfiles = profiles.filter(p => !p.is_deleted);
  const filteredProfiles = activeProfiles.filter(p => {
    const matchesSearch = (p.full_name || '').toLowerCase().includes(pSearch.toLowerCase()) || p.email.toLowerCase().includes(pSearch.toLowerCase());
    const matchesFilter = pFilterRole === 'all' ? true : p.role === pFilterRole;
    return matchesSearch && matchesFilter;
  });
  const totalProfilePages = Math.ceil(filteredProfiles.length / ITEMS_PER_PAGE) || 1;
  const displayedProfiles = filteredProfiles.slice((pPage - 1) * ITEMS_PER_PAGE, pPage * ITEMS_PER_PAGE);

  const activeRules = rules.filter(r => !r.is_deleted);
  const filteredRules = activeRules.filter(r => {
    const matchesSearch = r.msg.toLowerCase().includes(rSearch.toLowerCase()) || r.sid.toString().includes(rSearch);
    const matchesFilter = rFilterProto === 'all' ? true : r.protocol === rFilterProto;
    return matchesSearch && matchesFilter;
  });
  const totalRulePages = Math.ceil(filteredRules.length / ITEMS_PER_PAGE) || 1;
  const displayedRules = filteredRules.slice((rPage - 1) * ITEMS_PER_PAGE, rPage * ITEMS_PER_PAGE);

  const filteredAuditLogs = auditLogs.filter(l => l.action.toLowerCase().includes(auditSearch.toLowerCase()) || JSON.stringify(l.details).toLowerCase().includes(auditSearch.toLowerCase()));
  const totalAuditPages = Math.ceil(filteredAuditLogs.length / ITEMS_PER_PAGE) || 1;
  const displayedAuditLogs = filteredAuditLogs.slice((auditPage - 1) * ITEMS_PER_PAGE, auditPage * ITEMS_PER_PAGE);

  const filteredSuricataLogs = suricataLogs.filter(l => (l.description || '').toLowerCase().includes(suricataSearch.toLowerCase()) || (l.boiler_id || '').toLowerCase().includes(suricataSearch.toLowerCase()));
  const totalSuricataPages = Math.ceil(filteredSuricataLogs.length / ITEMS_PER_PAGE) || 1;
  const displayedSuricataLogs = filteredSuricataLogs.slice((suricataPage - 1) * ITEMS_PER_PAGE, suricataPage * ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-[#e6e8ec] p-6 font-sans text-slate-800">
      <header className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-800">Админ-панель ИБ</h1>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => { setPrevTab(activeTab); setActiveTab('profile'); }}>Профиль</Button>
          <Button variant="danger" onClick={logout}>Выйти</Button>
        </div>
      </header>

      {activeTab !== 'profile' && (
        <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-fit">
          {['profiles', 'rules', 'logs', 'trash'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === tab ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}>
              {tab === 'profiles' ? 'Профили' : tab === 'rules' ? 'Правила NIDS' : tab === 'logs' ? 'Логи' : 'Корзина'}
            </button>
          ))}
        </div>
      )}
      
      <div className="space-y-6">
        {activeTab === 'profiles' && (
          <Card>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Список сотрудников</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input placeholder="Поиск по ФИО или Email..." value={pSearch} onChange={e => { setPSearch(e.target.value); setPPage(1); }} />
              <CustomSelect value={pFilterRole} onChange={val => { setPFilterRole(val); setPPage(1); }} options={[{value: 'all', label: 'Все роли'}, {value: 'admin', label: 'Администратор'}, {value: 'manager', label: 'Начальник смены'}, {value: 'operator', label: 'Оператор'}]} />
            </div>
            <ProfileList profiles={displayedProfiles} handleEditProfile={(p) => { setCurrentProfile(p); setProfileModalOpen(true); }} handleDeleteProfile={handleDeleteProfile} />
            {totalProfilePages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button size="sm" variant="secondary" disabled={pPage === 1} onClick={() => setPPage(pPage - 1)}>Назад</Button>
                <span className="text-sm self-center text-slate-500">Стр {pPage} из {totalProfilePages}</span>
                <Button size="sm" variant="secondary" disabled={pPage === totalProfilePages} onClick={() => setPPage(pPage + 1)}>Вперед</Button>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'rules' && (
          <Card>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Активные правила</h2>
              <Button onClick={() => { setCurrentRule({ action: 'alert', protocol: 'tcp', src_ip: 'any', src_port: 'any', dst_ip: 'any', dst_port: 'any', msg: '', sid: '' }); setRuleModalOpen(true); }}>Добавить правило</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input placeholder="Поиск по сообщению или SID..." value={rSearch} onChange={e => { setRSearch(e.target.value); setRPage(1); }} />
              <CustomSelect value={rFilterProto} onChange={val => { setRFilterProto(val); setRPage(1); }} options={[{value: 'all', label: 'Все протоколы'}, {value: 'tcp', label: 'TCP'}, {value: 'udp', label: 'UDP'}, {value: 'icmp', label: 'ICMP'}, {value: 'ip', label: 'IP'}]} />
            </div>
            <RuleList rules={displayedRules} handleEditRule={(r) => { setCurrentRule(r); setRuleModalOpen(true); }} handleDeleteRule={handleDeleteRule} />
            {totalRulePages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button size="sm" variant="secondary" disabled={rPage === 1} onClick={() => setRPage(rPage - 1)}>Назад</Button>
                <span className="text-sm self-center text-slate-500">Стр {rPage} из {totalRulePages}</span>
                <Button size="sm" variant="secondary" disabled={rPage === totalRulePages} onClick={() => setRPage(rPage + 1)}>Вперед</Button>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'logs' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-800">Системные логи</h2>
                <Button size="sm" variant="secondary" onClick={() => downloadLogs(filteredAuditLogs, 'audit_logs')}>
                  Скачать JSON
                </Button>
              </div>
              <Input className="mb-4" placeholder="Поиск..." value={auditSearch} onChange={e => { setAuditSearch(e.target.value); setAuditPage(1); }} />
              <AuditLogList logs={displayedAuditLogs} />
              {totalAuditPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button size="sm" variant="secondary" disabled={auditPage === 1} onClick={() => setAuditPage(auditPage - 1)}>Назад</Button>
                  <span className="text-sm self-center text-slate-500">{auditPage} / {totalAuditPages}</span>
                  <Button size="sm" variant="secondary" disabled={auditPage === totalAuditPages} onClick={() => setAuditPage(auditPage + 1)}>Вперед</Button>
                </div>
              )}
            </Card>

            <Card>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-800">Алерты Suricata</h2>
                <Button size="sm" variant="secondary" onClick={() => downloadLogs(filteredSuricataLogs, 'suricata_logs')}>
                  Скачать JSON
                </Button>
              </div>
              <Input className="mb-4" placeholder="Поиск..." value={suricataSearch} onChange={e => { setSuricataSearch(e.target.value); setSuricataPage(1); }} />
              <SuricataLogList logs={displayedSuricataLogs} />
              {totalSuricataPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button size="sm" variant="secondary" disabled={suricataPage === 1} onClick={() => setSuricataPage(suricataPage - 1)}>Назад</Button>
                  <span className="text-sm self-center text-slate-500">{suricataPage} / {totalSuricataPages}</span>
                  <Button size="sm" variant="secondary" disabled={suricataPage === totalSuricataPages} onClick={() => setSuricataPage(suricataPage + 1)}>Вперед</Button>
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'profile' && <ProfileComponent onBack={() => setActiveTab(prevTab)} />}
        {activeTab === 'trash' && <TrashBin profiles={profiles} rules={rules} refreshData={fetchInitialData} />}
      </div>

      {ruleModalOpen && <RuleModal rule={currentRule} setRule={setCurrentRule} onSave={handleSaveRule} onClose={() => setRuleModalOpen(false)} />}
      {profileModalOpen && <ProfileModal profile={currentProfile} setProfile={setCurrentProfile} onSave={handleSaveProfile} onClose={() => setProfileModalOpen(false)} />}
    </div>
  );
}