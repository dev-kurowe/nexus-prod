import axios from 'axios';
import Cookies from 'js-cookie';

const baseURL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api` 
  : 'http://localhost:8000/api';

const api = axios.create({
  baseURL: baseURL, 
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('token'); 
  
  const publicEndpoints = ['/login', '/register', '/events'];
  const isPublicEndpoint = publicEndpoints.some(endpoint => 
    config.url?.includes(endpoint)
  );
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (!isPublicEndpoint) {
    console.warn("PERINGATAN: Tidak ada token! Request mungkin akan 401.");
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;