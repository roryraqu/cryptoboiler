const BASE_URL = process.env.REACT_APP_BACKEND_URL || '';

const defaultFetch = async (url, opts = {}) => {
  try {
    const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
    const res = await fetch(fullUrl, { 
      credentials: 'include', 
      headers: { 'Content-Type': 'application/json', ...opts.headers }, 
      ...opts 
    });
    
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    
    if (!res.ok) {
      return { data: null, error: { status: res.status, message: (json && json.error) || res.statusText || 'Request failed' } };
    }
    return { data: json, error: null };
  } catch (err) {
    return { data: null, error: { status: 0, message: err.message } };
  }
};

const tableToEndpoint = (table) => {
  const map = {
    audit_logs: '/api/suricata/audit-logs',
    suricata_rules: '/api/suricata/rules',
    incidents: '/api/suricata/incidents',
    profiles: '/api/profiles',
    user_authenticators: '/api/auth/biometrics',
    boilers: '/api/boilers',
    telemetry: '/api/telemetry',
  };
  return map[table] || `/api/${table}`;
};

function buildQueryString(params = {}) {
  const esc = encodeURIComponent;
  const query = Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null)
    .map(k => `${esc(k)}=${esc(params[k])}`)
    .join('&');
  return query ? `?${query}` : '';
}

function from(table) {
  const endpoint = tableToEndpoint(table);
  const state = { filters: {}, method: 'GET', payload: null, _range: null, _limit: null };

  const qb = {
    select() { return this; },
    eq(col, val) { state.filters[col] = val; return this; },
    order() { return this; },
    range(start, end) { state._range = [start, end]; return this; },
    limit(n) { state._limit = n; return this; },
    
    update(payload) {
      state.payload = payload;
      state.method = 'PUT';
      return this;
    },

    delete() {
      state.method = 'DELETE';
      return this;
    },

    insert(payload) {
      state.payload = payload;
      state.method = 'POST';
      return this;
    },

    then(resolve, reject) {
      this._execute().then(resolve).catch(reject);
    },

    async maybeSingle() {
      const res = await this._execute();
      const arr = res.data || [];
      return { data: Array.isArray(arr) ? arr[0] || null : arr, error: res.error };
    },
    
    async single() {
      const res = await this._execute();
      const arr = res.data || [];
      if (res.error) return { data: null, error: res.error };
      if (!Array.isArray(arr) || arr.length === 0) return { data: null, error: { message: 'Not found' } };
      return { data: arr[0], error: null };
    },

    async _execute() {
      let url = endpoint;
      let method = state.method;
      let body = state.payload ? JSON.stringify(state.payload) : undefined;

      if (method === 'GET') {
        const qs = buildQueryString(state.filters);
        url = `${endpoint}${qs}`;
        const res = await defaultFetch(url, { method: 'GET' });
        if (res.error) return res;

        let dataArray = res.data;
        if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
           const key = Object.keys(res.data).find(k => Array.isArray(res.data[k]));
           dataArray = key ? res.data[key] : [res.data];
        }

        if (Array.isArray(dataArray)) {
           if (state._range) {
             dataArray = dataArray.slice(state._range[0], state._range[1]);
           }
           if (state._limit) {
             dataArray = dataArray.slice(0, state._limit);
           }
        }
        return { data: dataArray, error: null };
      } 
      
      if (method === 'PUT') {
        if (state.filters.id) {
           url = `${endpoint}/${state.filters.id}`;
        }
        return await defaultFetch(url, { method: 'PUT', body });
      }

      if (method === 'POST') {
         return await defaultFetch(endpoint, { method: 'POST', body });
      }

      if (method === 'DELETE') {
         if (state.filters.id) {
            url = `${endpoint}/${state.filters.id}`;
         } else {
            const qs = buildQueryString(state.filters);
            url = `${endpoint}${qs}`;
         }
         return await defaultFetch(url, { method: 'DELETE' });
      }
    }
  };

  return qb;
}

const auth = {
  async signInWithPassword({ email, password }) {
    const res = await defaultFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (res.error) return { data: null, error: res.error };
    return { data: { user: res.data.user }, error: null };
  },
  async signUp({ email, password, options }) {
    const fullName = options?.data?.full_name || options?.data?.fullName || null;
    const agreedToTerms = options?.data?.agreedToTerms || false;
    const res = await defaultFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, fullName, agreedToTerms }) });
    if (res.error) return { data: null, error: res.error };
    return { data: res.data, error: null };
  },
  async signOut() {
    const res = await defaultFetch('/api/auth/logout', { method: 'POST' });
    return { data: res.data, error: res.error };
  },
  async getSession() {
    const res = await defaultFetch('/api/auth/me', { method: 'GET' });
    if (res.error) return { data: { session: null }, error: res.error };
    return { data: { session: { user: res.data.user } }, error: null };
  },
  onAuthStateChange() {
    const subscription = { unsubscribe() {} };
    return { data: { subscription } };
  }
};

const backendClient = { auth, from };
export default backendClient;