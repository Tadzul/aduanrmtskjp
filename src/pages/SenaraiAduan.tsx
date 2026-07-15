import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { db, Aduan, Gambar } from '../lib/db';
import { useAuth } from '../components/AuthContext';
import { Search, Filter, Edit, Trash2, Printer, Download, Eye, X, Save, ClipboardCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const formatMasa = (masa: string) => {
  if (!masa) return '';
  try {
    const [hours, minutes] = masa.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    return format(date, 'hh:mm a');
  } catch (e) {
    return masa;
  }
};

export function SenaraiAduan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [aduans, setAduans] = useState<Aduan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [filterKategori, setFilterKategori] = useState<'Semua' | 'RMT' | 'Kantin'>('Semua');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [previewAduan, setPreviewAduan] = useState<Aduan | null>(null);
  const [previewImages, setPreviewImages] = useState<Gambar[]>([]);

  const [editAduan, setEditAduan] = useState<Aduan | null>(null);
  
  const [printAduan, setPrintAduan] = useState<Aduan | null>(null);
  const [pentadbirName, setPentadbirName] = useState('EN. MOHD SHARIMAN BIN IDRIS - GURU BESAR');

  useEffect(() => {
    loadAduans();
  }, []);

  const loadAduans = async () => {
    const data = await db.getAduan();
    // Sort descending
    setAduans(data.sort((a, b) => b.createdAt - a.createdAt));
    setLoading(false);
  };

  const handlePreview = async (aduan: Aduan) => {
    let images = await db.getGambarByAduanId(aduan.id);
    if (!images || images.length === 0) {
      const gasImages = (aduan as any).gambars || [];
      images = gasImages.map((img: any) => {
        const match = img.url.match(/\/d\/(.*?)\//);
        if (match && match[1]) {
           return { base64: `https://drive.google.com/uc?export=view&id=${match[1]}` };
        }
        return { base64: img.url };
      });
    }
    setPreviewImages(images);
    setPreviewAduan(aduan);
  };

  const handleEdit = (aduan: Aduan) => {
    setEditAduan(aduan);
  };

  const saveEdit = async () => {
    if (!editAduan) return;
    try {
      await db.saveAduan(editAduan);
      toast.success('Aduan berjaya dikemaskini.');
      setEditAduan(null);
      loadAduans();
    } catch (e) {
      toast.error('Gagal kemaskini aduan.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Adakah anda pasti untuk memadam aduan ini? (Soft delete)')) {
      // In a real app this would be a soft delete, but for this mock we hard delete
      await db.deleteAduan(id);
      toast.success('Aduan telah dipadam.');
      loadAduans();
    }
  };

  const handleDownloadPDFClick = (aduan: Aduan) => {
    setPrintAduan(aduan);
  };

  const handleGenerateFormalPDF = async () => {
    if (!printAduan) return;
    
    toast.info('Menjana Laporan Formal PDF...');
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      
      let y = 20;

      // Header: Logo and School Name
      try {
        const response = await fetch('/logo.jpg');
        const blob = await response.blob();
        const reader = new FileReader();
        const base64data = await new Promise<string>((resolve) => {
          reader.readAsDataURL(blob);
          reader.onloadend = () => resolve(reader.result as string);
        });
        doc.addImage(base64data, 'JPEG', 20, 10, 25, 25);
      } catch (e) {}

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('SEKOLAH KEBANGSAAN JALAN PEGOH', pageWidth/2, y + 5, { align: 'center' });
      y += 13;
      doc.setFontSize(14);
      const tajuk = printAduan.kategoriAduan === 'Kantin' 
        ? 'LAPORAN ADUAN KANTIN' 
        : 'LAPORAN ADUAN RANCANGAN MAKANAN TAMBAHAN (RMT)';
      doc.text(tajuk, pageWidth/2, y, { align: 'center' });
      y += 10;
      
      doc.line(20, y, pageWidth - 20, y);
      y += 10;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      const addRow = (label: string, value: string) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}`, 20, y);
        doc.text(`:`, 60, y);
        doc.setFont('helvetica', 'normal');
        const splitText = doc.splitTextToSize(value || '-', pageWidth - 80);
        doc.text(splitText, 65, y);
        y += (splitText.length * 6) + 2;
      };

      addRow('No Aduan', printAduan.noAduan);
      addRow('Nama Pelapor', printAduan.namaPelapor || printAduan.guruId);
      addRow('Tarikh', format(parseISO(printAduan.tarikh), 'dd/MM/yyyy'));
      addRow('Masa', formatMasa(printAduan.masa));
      addRow('Kategori Aduan', printAduan.kategoriAduan || 'RMT');
      addRow('Lokasi', printAduan.lokasi);
      addRow('Pengusaha Kantin', printAduan.pengusaha);
      addRow('Status', printAduan.status);
      addRow('Jenis Aduan', printAduan.jenisAduan.join(', '));
      if (printAduan.lainLainJenis) addRow('Jenis (Lain-lain)', printAduan.lainLainJenis);
      addRow('Keterangan', printAduan.keterangan);
      addRow('Tindakan Susulan', printAduan.tindakanSusulan);
      if (printAduan.lainLainTindakan) addRow('Tindakan (Lain-lain)', printAduan.lainLainTindakan);
      
      y += 10;

      // Add Complaint Images
      let images = await db.getGambarByAduanId(printAduan.id);
      
      if (!images || images.length === 0) {
        const gasImages = (printAduan as any).gambars || [];
        if (gasImages.length > 0) {
          toast.info('Memuat turun gambar (Sila tunggu)...');
          images = await Promise.all(gasImages.map(async (img: any) => {
             const fileIdMatch = img.url.match(/\/d\/(.*?)\//);
             if (fileIdMatch && fileIdMatch[1]) {
                const appsScriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbzL4tFDPcur0UVhK_3A983NyEftBAsrlmUymv6ygzYdVHxV5ToLiXu4PpHeCi0wo5M1/exec';
                try {
                  const res = await fetch(`${appsScriptUrl}?action=getImage&id=${fileIdMatch[1]}`);
                  const json = await res.json();
                  if (json.success && json.base64) {
                     return { base64: json.base64 };
                  }
                } catch(e) {
                   console.error('Error fetching image base64', e);
                }
             }
             return { base64: img.url }; // fallback
          }));
        }
      }

      if (images && images.length > 0) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.text('Bukti Bergambar:', 20, y);
        y += 10;
        let xPos = 20;
        let maxHeight = 0;
        
        for (const img of images.slice(0, 4)) {
          if (xPos > 150) {
            y += maxHeight + 10;
            xPos = 20;
            maxHeight = 0;
          }
          if (y > 240) { doc.addPage(); y = 20; }
          try {
            const imageData = img.base64 || (img as any).url;
            let format = 'JPEG';
            if (imageData && imageData.startsWith('data:image/')) {
              const mime = imageData.split(';')[0].split(':')[1];
              if (mime === 'image/png') format = 'PNG';
              else if (mime === 'image/webp') format = 'WEBP';
            }
            doc.addImage(imageData, format, xPos, y, 40, 40);
            maxHeight = Math.max(maxHeight, 40);
            xPos += 45;
          } catch(e) {
            console.error('Failed to add image to PDF', e);
          }
        }
        y += maxHeight + 15;
      }
      
      // Signatures
      if (y > 220) { doc.addPage(); y = 20; }
      y += 10;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Disahkan Oleh:', 20, y);
      y += 30;

      doc.setFont('helvetica', 'normal');
      
      const cleanName = pentadbirName.split(' - ')[0];
      doc.text(`Nama: ${cleanName}`, 20, y);
      y += 6;
      
      let jawatan = 'Pentadbir';
      if (pentadbirName.includes('SHARIMAN')) jawatan = 'Guru Besar';
      else if (pentadbirName.includes('MAIZATON')) jawatan = 'PEN. KANAN HEM';
      
      doc.text(`Jawatan: ${jawatan}`, 20, y);
      y += 6;
      doc.text(`Tarikh: .......................................`, 20, y);

      // Footer
      doc.setFontSize(8);
      doc.text('Sistem e-Aduan RMT - SK Jalan Pegoh', pageWidth/2, 280, { align: 'center' });

      doc.save(`Laporan_Aduan_${printAduan.noAduan}.pdf`);
      toast.success('Laporan PDF berjaya dimuat turun.');
      setPrintAduan(null);
    } catch (e) {
      console.error(e);
      toast.error('Gagal menjana PDF.');
    }
  };

  const filteredAduans = aduans.filter(a => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      (a.noAduan || '').toLowerCase().includes(searchLower) ||
      (a.lokasi || '').toLowerCase().includes(searchLower) ||
      (a.keterangan || '').toLowerCase().includes(searchLower);
    const matchesStatus = filterStatus === 'Semua' || a.status === filterStatus;
    
    const cat = a.kategoriAduan || 'RMT';
    const matchesKategori = filterKategori === 'Semua' || cat === filterKategori;
    
    const matchesRole = true; // Allow Guru to see all aduan

    return matchesSearch && matchesStatus && matchesKategori && matchesRole;
  });

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, filterKategori]);

  const totalPages = Math.max(1, Math.ceil(filteredAduans.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAduans = filteredAduans.slice(startIndex, startIndex + itemsPerPage);

  const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
      'Belum Diambil': 'bg-red-100 text-red-600',
      'Dalam Tindakan': 'bg-orange-100 text-orange-600',
      'Selesai': 'bg-green-100 text-green-600'
    };
    return (
      <span className={`status-pill ${colors[status as keyof typeof colors]}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Senarai Aduan</h1>
          <p className="text-slate-500">Urus dan pantau rekod aduan RMT</p>
        </div>
        <button 
          onClick={() => navigate('/tambah')}
          className="btn-primary px-4 py-2 rounded-xl font-medium transition-colors"
        >
          + Tambah Aduan
        </button>
      </div>

      <div className="glass-card rounded-[24px] p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari No Aduan, Lokasi, Keterangan..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-48">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select 
                value={filterKategori}
                onChange={e => setFilterKategori(e.target.value as any)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 appearance-none"
              >
                <option value="Semua">Semua Kategori</option>
                <option value="RMT">RMT</option>
                <option value="Kantin">Kantin</option>
              </select>
            </div>
            <div className="relative w-full md:w-48">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select 
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 appearance-none"
              >
                <option value="Semua">Semua Status</option>
                <option value="Belum Diambil">Belum Diambil</option>
                <option value="Dalam Tindakan">Dalam Tindakan</option>
                <option value="Selesai">Selesai</option>
              </select>
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-sm text-slate-500 font-medium">
                <th className="pb-3 pl-2">No Aduan</th>
                <th className="pb-3">Tarikh</th>
                <th className="pb-3">Kategori & Lokasi</th>
                <th className="pb-3">Nama Pelapor</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-2">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAduans.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">Tiada rekod aduan dijumpai.</td>
                </tr>
              )}
              {paginatedAduans.map(aduan => (
                <tr key={aduan.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 pl-2 font-medium text-slate-800">{aduan.noAduan}</td>
                  <td className="py-4 text-slate-600">{format(parseISO(aduan.tarikh), 'dd/MM/yyyy')} <br/><span className="text-xs text-slate-400">{formatMasa(aduan.masa)}</span></td>
                  <td className="py-4 text-slate-600 font-medium">
                    <span className={`inline-block px-2 py-1 rounded text-xs mr-2 ${aduan.kategoriAduan === 'Kantin' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {aduan.kategoriAduan || 'RMT'}
                    </span>
                    {aduan.lokasi}
                  </td>
                  <td className="py-4 text-slate-600">{aduan.namaPelapor || aduan.guruId}</td>
                  <td className="py-4"><StatusBadge status={aduan.status} /></td>
                  <td className="py-4 text-right pr-2">
                    <div className="flex justify-end space-x-2">
                      <button onClick={() => handlePreview(aduan)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Lihat Laporan">
                        <Eye size={18} />
                      </button>
                      <button onClick={() => handleDownloadPDFClick(aduan)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Muat Turun PDF">
                        <Download size={18} />
                      </button>
                      {user?.id === aduan.guruId && user?.role !== 'Admin' && (
                        <button onClick={() => handleEdit(aduan)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Edit Aduan">
                          <Edit size={18} />
                        </button>
                      )}
                      {user?.role === 'Admin' && (
                        <button onClick={() => handleEdit(aduan)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Kemaskini Tindakan">
                          <ClipboardCheck size={18} />
                        </button>
                      )}
                      {user?.role === 'Admin' && (
                        <button onClick={() => handleDelete(aduan.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Padam">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {paginatedAduans.length === 0 && (
            <div className="py-8 text-center text-slate-500">Tiada rekod aduan dijumpai.</div>
          )}
          {paginatedAduans.map(aduan => (
            <div key={aduan.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-slate-800">{aduan.noAduan}</p>
                  <p className="text-xs text-slate-500">{format(parseISO(aduan.tarikh), 'dd/MM/yyyy')} • {formatMasa(aduan.masa)}</p>
                </div>
                <StatusBadge status={aduan.status} />
              </div>
              <div>
                <p className="text-sm text-slate-600 line-clamp-2">{aduan.keterangan}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded ${aduan.kategoriAduan === 'Kantin' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {aduan.kategoriAduan || 'RMT'}
                  </span>
                  {aduan.lokasi}
                </span>
                <div className="flex space-x-1">
                  <button onClick={() => handlePreview(aduan)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Eye size={16} />
                  </button>
                  <button onClick={() => handleDownloadPDFClick(aduan)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Download size={16} />
                  </button>
                  {user?.id === aduan.guruId && user?.role !== 'Admin' && (
                    <button onClick={() => handleEdit(aduan)} className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Edit Aduan">
                      <Edit size={16} />
                    </button>
                  )}
                  {user?.role === 'Admin' && (
                    <button onClick={() => handleEdit(aduan)} className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Kemaskini Tindakan">
                      <ClipboardCheck size={16} />
                    </button>
                  )}
                  {user?.role === 'Admin' && (
                    <button onClick={() => handleDelete(aduan.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Controls */}
        {filteredAduans.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 gap-4 mt-6">
            <div className="flex items-center space-x-2 text-sm text-slate-600">
              <span>Papar</span>
              <select 
                value={itemsPerPage} 
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
              <span>aduan</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors bg-white"
              >
                Sebelum
              </button>
              <span className="text-sm text-slate-600 font-medium">
                Muka {currentPage} dari {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors bg-white"
              >
                Seterusnya
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Preview Modal */}
      {previewAduan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-sm z-10">
              <div className="flex items-center space-x-3">
                <img src="/pwa-192x192.png" alt="Logo" className="w-8 h-8 rounded-full" />
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Laporan Aduan</h2>
                  <p className="text-xs text-slate-500 font-medium">SEKOLAH KEBANGSAAN JALAN PEGOH</p>
                </div>
              </div>
              <button 
                onClick={() => setPreviewAduan(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500 font-medium">No Aduan</p>
                  <p className="font-bold text-lg text-slate-800">{previewAduan.noAduan}</p>
                  <p className="text-sm text-slate-500 mt-1">Oleh: <span className="font-medium text-slate-700">{previewAduan.namaPelapor || previewAduan.guruId}</span></p>
                </div>
                <div className="md:text-right">
                  <StatusBadge status={previewAduan.status} />
                  <p className="text-sm text-slate-500 mt-2">{format(parseISO(previewAduan.tarikh), 'dd MMM yyyy')} • {formatMasa(previewAduan.masa)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Lokasi</p>
                  <p className="font-medium text-slate-800">{previewAduan.lokasi}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Pengusaha Kantin</p>
                  <p className="font-medium text-slate-800">{previewAduan.pengusaha}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Jenis Aduan</p>
                <div className="flex flex-wrap gap-2">
                  {previewAduan.jenisAduan.map((j, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm">
                      {j === 'Lain-lain' && previewAduan.lainLainJenis ? previewAduan.lainLainJenis : j}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Keterangan</p>
                <p className="text-slate-700 bg-white border border-slate-100 p-4 rounded-xl leading-relaxed">
                  {previewAduan.keterangan}
                </p>
              </div>

              {previewImages.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Bukti Bergambar</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {previewImages.map((img, idx) => (
                      <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-slate-200">
                        <img src={img.base64 || (img as any).url} alt="Bukti" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Tindakan Susulan</p>
                <p className="font-medium text-slate-800">
                  {previewAduan.tindakanSusulan === 'Lain-lain' && previewAduan.lainLainTindakan ? previewAduan.lainLainTindakan : previewAduan.tindakanSusulan}
                </p>
              </div>

              {previewAduan.tandatangan && (
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-2">Tandatangan</p>
                  <div className="border border-slate-200 rounded-xl p-4 bg-white inline-block">
                    <img src={previewAduan.tandatangan} alt="Tandatangan" className="h-16" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setPreviewAduan(null)}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-medium transition-colors"
              >
                Tutup
              </button>
              <button 
                onClick={() => handleDownloadPDFClick(previewAduan)}
                className="px-5 py-2.5 btn-primary rounded-xl font-medium flex items-center space-x-2 transition-all"
              >
                <Download size={18} />
                <span>Muat Turun PDF</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Modal */}
      {editAduan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-sm z-10">
              <h2 className="text-xl font-bold text-slate-800">Kemaskini Aduan {editAduan.noAduan}</h2>
              <button 
                onClick={() => setEditAduan(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              {(user?.id === editAduan.guruId || user?.role === 'Admin') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan</label>
                  <textarea 
                    value={editAduan.keterangan}
                    onChange={e => setEditAduan({ ...editAduan, keterangan: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>
              )}

              {user?.role === 'Admin' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status Aduan</label>
                    <select 
                      value={editAduan.status}
                      onChange={e => setEditAduan({ ...editAduan, status: e.target.value as any })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="Belum Diambil">Belum Diambil</option>
                      <option value="Dalam Tindakan">Dalam Tindakan</option>
                      <option value="Selesai">Selesai</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tindakan Susulan</label>
                    <select 
                      value={editAduan.tindakanSusulan}
                      onChange={e => setEditAduan({ ...editAduan, tindakanSusulan: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="Tiada">Tiada</option>
                      <option value="Teguran">Teguran</option>
                      <option value="Amaran Lisan">Amaran Lisan</option>
                      <option value="Amaran Bertulis">Amaran Bertulis</option>
                      <option value="Lain-lain">Lain-lain</option>
                    </select>
                  </div>
                  
                  {editAduan.tindakanSusulan === 'Lain-lain' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nyatakan Tindakan</label>
                      <input 
                        type="text" 
                        value={editAduan.lainLainTindakan || ''}
                        onChange={e => setEditAduan({ ...editAduan, lainLainTindakan: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setEditAduan(null)}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-medium transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={saveEdit}
                className="px-5 py-2.5 btn-primary rounded-xl font-medium flex items-center space-x-2 transition-all"
              >
                <Save size={18} />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Print Settings Modal */}
      {printAduan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white/90 backdrop-blur-sm">
              <h2 className="text-xl font-bold text-slate-800">Tetapan Laporan PDF</h2>
              <button 
                onClick={() => setPrintAduan(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Pilih Nama Pentadbir</label>
                <select 
                  value={pentadbirName}
                  onChange={e => setPentadbirName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="EN. MOHD SHARIMAN BIN IDRIS - GURU BESAR">EN. MOHD SHARIMAN BIN IDRIS - GURU BESAR</option>
                  <option value="PN. MAIZATON AZIAH BINTI ISHAB">PN. MAIZATON AZIAH BINTI ISHAB</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setPrintAduan(null)}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-medium transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleGenerateFormalPDF}
                className="px-5 py-2.5 btn-primary rounded-xl font-medium flex items-center space-x-2 transition-all"
              >
                <Printer size={18} />
                <span>Cetak Laporan</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
