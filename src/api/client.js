import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 15000,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
});

let accessToken = null;
let refreshingPromise = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

client.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url = original?.url || '';

    if (status === 401 && original && !original._retry && !url.includes('/auth/login') && !url.includes('/auth/refresh')) {
      original._retry = true;
      try {
        if (!refreshingPromise) {
          refreshingPromise = client.post('/auth/refresh').finally(() => {
            refreshingPromise = null;
          });
        }
        const { data } = await refreshingPromise;
        setAccessToken(data.accessToken);
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return client(original);
      } catch (refreshError) {
        setAccessToken(null);
        localStorage.removeItem('assetrak_had_session');
        window.dispatchEvent(new CustomEvent('auth:expired'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default client;
