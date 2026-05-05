import { useState } from 'react';
import { GlassCard } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Key } from 'lucide-react';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    const res = await signup({ name, email, password });
    setLoading(false);
    if (res.ok) navigate('/');
  };

  return (
    <div className="mx-auto max-w-md">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <GlassCard className="p-8">
          <h2 className="text-2xl font-semibold">Create account</h2>
          <p className="mt-2 text-sm text-muted">Create an account to save analysis history and access the dashboard</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <div className="text-xs text-muted">Full name</div>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/6 px-3 py-2">
                <UserPlus className="h-4 w-4 text-muted" />
                <input className="bg-transparent outline-none w-full" type="text" value={name} onChange={e => setName(e.target.value)} />
              </div>
            </label>

            <label className="block">
              <div className="text-xs text-muted">Email</div>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/6 px-3 py-2">
                <Mail className="h-4 w-4 text-muted" />
                <input className="bg-transparent outline-none w-full" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </label>

            <label className="block">
              <div className="text-xs text-muted">Password</div>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/6 px-3 py-2">
                <Key className="h-4 w-4 text-muted" />
                <input className="bg-transparent outline-none w-full" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
              </div>
            </label>

            <div className="flex items-center justify-between">
              <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create account'}</button>
              <Link to="/login" className="text-sm text-muted">Already have an account?</Link>
            </div>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );
}
