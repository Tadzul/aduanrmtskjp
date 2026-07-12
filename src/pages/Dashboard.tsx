import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { db, Aduan } from '../lib/db';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { format, isToday, isThisWeek, isThisMonth, isThisYear, parseISO } from 'date-fns';
import { FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export function Dashboard() {
  const [aduans, setAduans] = useState<Aduan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const data = await db.getAduan();
      setAduans(data);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  // Analytics Calculations
  const totalHariIni = aduans.filter(a => isToday(a.createdAt)).length;
  const totalMingguIni = aduans.filter(a => isThisWeek(a.createdAt)).length;
  const totalBulanIni = aduans.filter(a => isThisMonth(a.createdAt)).length;
  const totalTahunIni = aduans.filter(a => isThisYear(a.createdAt)).length;

  const totalBelumDiambil = aduans.filter(a => a.status === 'Belum Diambil').length;
  const totalDalamTindakan = aduans.filter(a => a.status === 'Dalam Tindakan').length;
  const totalSelesai = aduans.filter(a => a.status === 'Selesai').length;

  // Pie Chart: Jenis Aduan
  const jenisAduanCount: Record<string, number> = {};
  aduans.forEach(a => {
    a.jenisAduan.forEach(j => {
      jenisAduanCount[j] = (jenisAduanCount[j] || 0) + 1;
    });
  });
  const pieData = Object.entries(jenisAduanCount).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5);

  // Bar Chart: Aduan Mengikut Bulan
  const bulanCount: Record<string, number> = {};
  aduans.forEach(a => {
    const month = format(parseISO(a.tarikh), 'MMM yyyy');
    bulanCount[month] = (bulanCount[month] || 0) + 1;
  });
  const barData = Object.entries(bulanCount).map(([name, jumlah]) => ({ name, jumlah }));

  const StatCard = ({ title, value, icon, shadowColor, bgGradient, textColor = "text-white", iconBg = "bg-white/20", iconColor = "text-white" }: any) => (
    <div className={`relative overflow-hidden ${bgGradient} p-6 rounded-[24px] flex items-center space-x-4 shadow-lg hover:shadow-2xl ${shadowColor} hover:-translate-y-1 transition-all duration-500 cursor-pointer group`}>
      <div className={`absolute -right-8 -top-8 w-32 h-32 bg-white rounded-full opacity-10 group-hover:opacity-20 transition-opacity duration-500 blur-2xl`}></div>
      <div className={`absolute -left-8 -bottom-8 w-24 h-24 bg-white rounded-full opacity-10 group-hover:opacity-20 transition-opacity duration-500 blur-xl`}></div>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${iconBg} ${iconColor} shadow-inner relative z-10 group-hover:scale-110 transition-transform duration-500 backdrop-blur-sm border border-white/10`}>
        {icon}
      </div>
      <div className="relative z-10">
        <p className={`${textColor} opacity-90 text-sm font-medium`}>{title}</p>
        <h3 className={`text-3xl font-bold ${textColor}`}>{value}</h3>
      </div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500">Ringkasan statistik e-Aduan RMT</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Hari Ini" value={totalHariIni} icon={<FileText size={24} />} shadowColor="hover:shadow-blue-500/40" bgGradient="bg-gradient-to-br from-blue-500 to-indigo-600" />
        <StatCard title="Belum Diambil" value={totalBelumDiambil} icon={<AlertCircle size={24} />} shadowColor="hover:shadow-rose-500/40" bgGradient="bg-gradient-to-br from-rose-400 to-red-500" />
        <StatCard title="Dalam Tindakan" value={totalDalamTindakan} icon={<Clock size={24} />} shadowColor="hover:shadow-violet-500/40" bgGradient="bg-gradient-to-br from-violet-500 to-purple-600" />
        <StatCard title="Selesai" value={totalSelesai} icon={<CheckCircle size={24} />} shadowColor="hover:shadow-emerald-500/40" bgGradient="bg-gradient-to-br from-emerald-400 to-teal-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jenis Aduan Pie Chart */}
        <div className="glass-card p-6 rounded-[24px]">
          <h3 className="font-semibold text-slate-800 mb-6">Top 5 Jenis Aduan</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend Aduan Bar Chart */}
        <div className="glass-card p-6 rounded-[24px]">
          <h3 className="font-semibold text-slate-800 mb-6">Bilangan Aduan Mengikut Bulan</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="jumlah" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Extra stat summary */}
      <div className="sidebar-item-active rounded-[24px] p-6 text-white flex justify-around shadow-lg">
        <div className="text-center">
          <p className="text-blue-100 text-sm">Minggu Ini</p>
          <p className="text-2xl font-bold">{totalMingguIni}</p>
        </div>
        <div className="text-center">
          <p className="text-blue-100 text-sm">Bulan Ini</p>
          <p className="text-2xl font-bold">{totalBulanIni}</p>
        </div>
        <div className="text-center">
          <p className="text-blue-100 text-sm">Tahun Ini</p>
          <p className="text-2xl font-bold">{totalTahunIni}</p>
        </div>
      </div>
    </motion.div>
  );
}
