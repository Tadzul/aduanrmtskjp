import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(username, password);
    if (success) {
      toast.success('Log masuk berjaya!');
      navigate('/');
    } else {
      toast.error('Log masuk gagal. Sila semak ID Pengguna dan Kata Laluan.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-card rounded-[24px] shadow-xl overflow-hidden">
          <div className="p-8 text-center bg-gradient-to-br from-blue-600 to-emerald-500">
            <div className="w-20 h-20 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4 transform -rotate-3">
              <span className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-emerald-500">
                RMT
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">e-Aduan</h1>
            <p className="text-blue-100 mt-2 text-sm">Sistem Pengurusan e-Aduan Rancangan Makanan Tambahan</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ID Pengguna</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  placeholder="Masukkan ID Pengguna"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kata Laluan</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-3.5 px-4 btn-primary rounded-xl font-medium shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
            >
              Log Masuk
            </button>
          </form>
        </div>
        
        <p className="text-center text-slate-500 text-sm mt-8">
          Tadzul Apps @ Sk Jalan Pegoh
        </p>
      </motion.div>
    </div>
  );
}
