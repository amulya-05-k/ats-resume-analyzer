import axios from 'axios';

const authApi = axios.create({
  baseURL: import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:5000/api/auth',
  withCredentials: true,
  timeout: 20000,
});

export async function signup({ name, email, password }) {
  const res = await authApi.post('/signup', { name, email, password });
  return res.data;
}

export async function login({ email, password }) {
  const res = await authApi.post('/login', { email, password });
  return res.data;
}

export async function logout() {
  const res = await authApi.post('/logout');
  return res.data;
}

export async function me() {
  const res = await authApi.get('/me');
  return res.data;
}

export async function googleSignIn(idToken) {
  const res = await authApi.post('/google', { idToken });
  return res.data;
}

export default authApi;
