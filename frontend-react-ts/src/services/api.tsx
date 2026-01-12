import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: 'http://localhost:8000/api', 
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('token'); 
  
  // Endpoint yang tidak memerlukan token (public endpoints)
  const publicEndpoints = ['/login', '/register', '/events'];
  const isPublicEndpoint = publicEndpoints.some(endpoint => 
    config.url?.includes(endpoint)
  );
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (!isPublicEndpoint) {
    // Hanya tampilkan warning untuk endpoint yang memerlukan token
    console.warn("PERINGATAN: Tidak ada token! Request mungkin akan 401.");
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;