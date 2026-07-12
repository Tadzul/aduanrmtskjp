import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Camera, Image as ImageIcon, X, Save, RotateCcw, Loader2 } from 'lucide-react';
import Webcam from 'react-webcam';
import { db, Aduan, Gambar } from '../lib/db';
import { useAuth } from '../components/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { generateId } from '../lib/utils';
import TimeKeeper from 'react-timekeeper';
import { Clock } from 'lucide-react';

const formatMasa = (masa: string) => {
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

const JENIS_ADUAN_OPTIONS = [
  'Makanan tidak mencukupi',
  'Menu tidak mengikut menu',
  'Makanan tidak bersih / terdapat benda asing',
  'Makanan basi atau berbau',
  'Rasa kurang enak',
  'Penyediaan lewat',
  'Saiz hidangan tidak mencukupi',
  'Lain-lain'
];

export function FormAduan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  
  const [tarikh, setTarikh] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [masa, setMasa] = useState(format(new Date(), 'HH:mm'));
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [lokasi, setLokasi] = useState('Kantin');
  const [pengusaha, setPengusaha] = useState('');
  const [jenisAduan, setJenisAduan] = useState<string[]>([]);
  const [lainLainJenis, setLainLainJenis] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [tindakanSusulan, setTindakanSusulan] = useState('Tiada');
  const [lainLainTindakan, setLainLainTindakan] = useState('');
  const [status, setStatus] = useState<'Belum Diambil'|'Dalam Tindakan'|'Selesai'>('Belum Diambil');
  const [namaPelapor, setNamaPelapor] = useState('');
  const [guruOptions, setGuruOptions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const fetchGurus = async () => {
      try {
        const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vQvYWt8Xq7vgkRJ60j8I1NsHmgko7wuWCc84Ut3alFbR2n_CB01BYsWehOSYLKZTLs3GgvdWylb2mO3/pub?gid=1225266516&single=true&output=csv');
        const text = await response.text();
        const names = text.split('\n').slice(1).map(n => n.trim()).filter(Boolean);
        setGuruOptions(names);
      } catch (err) {
        console.error('Failed to fetch guru names', err);
      }
    };
    fetchGurus();
  }, []);

  const filteredGurus = namaPelapor ? guruOptions.filter(g => 
    g.toLowerCase().includes(namaPelapor.toLowerCase()) && 
    g.toLowerCase() !== namaPelapor.toLowerCase()
  ).slice(0, 5) : [];

  // Images state
  const [images, setImages] = useState<{id: string, base64: string}[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Signature Removed
  
  // Computed Hari
  const hari = new Date(tarikh).toLocaleDateString('ms-MY', { weekday: 'long' });

  const handleJenisChange = (jenis: string) => {
    setJenisAduan(prev => 
      prev.includes(jenis) ? prev.filter(j => j !== jenis) : [...prev, jenis]
    );
  };

  const capturePhoto = React.useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        if (images.length >= 10) {
          toast.error('Maksimum 10 gambar sahaja.');
          return;
        }
        setImages(prev => [...prev, { id: generateId(), base64: imageSrc }]);
        setShowCamera(false);
      }
    }
  }, [webcamRef, images]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (images.length + files.length > 10) {
      toast.error('Maksimum 10 gambar sahaja dibenarkan.');
      return;
    }

    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`Saiz gambar ${file.name} melebihi 5MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, { id: generateId(), base64: reader.result as string }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleReset = () => {
    if (confirm('Adakah anda pasti untuk reset borang ini?')) {
      setTarikh(format(new Date(), 'yyyy-MM-dd'));
      setMasa(format(new Date(), 'HH:mm'));
      setLokasi('Kantin');
      setPengusaha('');
      setJenisAduan([]);
      setLainLainJenis('');
      setKeterangan('');
      setTindakanSusulan('Tiada');
      setLainLainTindakan('');
      setStatus('Belum Diambil');
      setImages([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (jenisAduan.length === 0) {
      toast.error('Sila pilih sekurang-kurangnya satu Jenis Aduan.');
      return;
    }

    setSubmitting(true);
    try {
      const newAduanData: Omit<Aduan, 'noAduan'> = {
        id: generateId(),
        guruId: user?.id || '',
        namaPelapor,
        tarikh,
        masa,
        lokasi,
        pengusaha,
        jenisAduan,
        lainLainJenis: jenisAduan.includes('Lain-lain') ? lainLainJenis : undefined,
        keterangan,
        tindakanSusulan,
        lainLainTindakan: tindakanSusulan === 'Lain-lain' ? lainLainTindakan : undefined,
        status,
        gambarIds: images.map(img => img.id),
        tandatangan: undefined,
        createdAt: Date.now()
      };

      const savedAduan = await db.saveAduanComplete(newAduanData, images.map(img => ({
        id: img.id,
        aduanId: '', // Will be set in saveAduanComplete
        base64: img.base64
      })));

      toast.success('Aduan berjaya disimpan!');
      navigate('/senarai');
    } catch (error) {
      console.error(error);
      toast.error('Gagal menyimpan aduan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Tambah Aduan Baru</h1>
        <p className="text-slate-500">Isi maklumat aduan RMT di bawah</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card rounded-[24px] p-6 md:p-8 space-y-8">
        
        {/* Seksyen 1: Maklumat Asas */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">Maklumat Aduan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Guru</label>
              <input 
                type="text" 
                value={namaPelapor} 
                onChange={e => {
                  setNamaPelapor(e.target.value);
                  setShowDropdown(true);
                }} 
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder="Taip nama guru..."
                required
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white" 
              />
              {showDropdown && filteredGurus.length > 0 && (
                <ul className="absolute z-10 w-full bg-white mt-1 rounded-xl shadow-lg border border-slate-100 max-h-48 overflow-y-auto">
                  {filteredGurus.map((g, idx) => (
                    <li 
                      key={idx} 
                      className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-slate-700"
                      onClick={() => {
                        setNamaPelapor(g);
                        setShowDropdown(false);
                      }}
                    >
                      {g}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tarikh & Hari</label>
              <div className="flex space-x-2">
                <input type="date" value={tarikh} onChange={e => setTarikh(e.target.value)} required className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                <input type="text" value={hari} disabled className="w-1/3 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-center" />
              </div>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-1">Masa</label>
              <div 
                className="w-full px-4 py-2 rounded-xl border border-slate-200 cursor-pointer flex justify-between items-center bg-white"
                onClick={() => setShowTimePicker(true)}
              >
                <span>{formatMasa(masa)}</span>
                <Clock size={18} className="text-slate-400" />
              </div>
              
              {showTimePicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowTimePicker(false)}>
                  <div onClick={e => e.stopPropagation()} className="bg-white rounded-[24px] shadow-xl overflow-hidden flex flex-col items-center">
                    <TimeKeeper
                      time={masa}
                      onChange={(newTime) => setMasa(newTime.formatted24)}
                      onDoneClick={() => setShowTimePicker(false)}
                      switchToMinuteOnHourSelect
                    />
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lokasi</label>
              <select value={lokasi} onChange={e => setLokasi(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                <option>Kantin</option>
                <option>Dewan</option>
                <option>Blok A</option>
                <option>Blok B</option>
                <option>Lain-lain</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Pengusaha Kantin</label>
              <input type="text" value={pengusaha} onChange={e => setPengusaha(e.target.value)} placeholder="Sila isi nama pengusaha kantin" className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
            </div>
          </div>
        </section>

        {/* Seksyen 2: Jenis & Keterangan */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">Jenis & Keterangan Aduan</h2>
          <label className="block text-sm font-medium text-slate-700 mb-2">Jenis Aduan (Boleh pilih lebih dari satu)</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
            {JENIS_ADUAN_OPTIONS.map(opt => (
              <label key={opt} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100">
                <input 
                  type="checkbox" 
                  checked={jenisAduan.includes(opt)}
                  onChange={() => handleJenisChange(opt)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="text-sm text-slate-700">{opt}</span>
              </label>
            ))}
          </div>
          {jenisAduan.includes('Lain-lain') && (
            <div className="mb-4">
              <input 
                type="text" 
                placeholder="Nyatakan jenis aduan lain..." 
                value={lainLainJenis}
                onChange={e => setLainLainJenis(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
          )}

          <label className="block text-sm font-medium text-slate-700 mb-1 mt-4">Keterangan Aduan (Pilihan)</label>
          <textarea 
            value={keterangan}
            onChange={e => setKeterangan(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            placeholder="Terangkan dengan terperinci tentang aduan tersebut (jika ada)..."
          />
          <p className="text-xs text-slate-400 mt-1 text-right">{keterangan.length} aksara</p>
        </section>

        {/* Seksyen 3: Bukti Bergambar */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">Bukti Bergambar (Maksimum 10)</h2>
          
          <div className="flex flex-wrap gap-3 mb-4">
            <button 
              type="button" 
              onClick={() => setShowCamera(!showCamera)}
              className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl transition-colors font-medium text-sm"
            >
              <Camera size={18} />
              <span>Ambil Gambar</span>
            </button>
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl transition-colors font-medium text-sm"
            >
              <ImageIcon size={18} />
              <span>Muat Naik (Maks 5MB)</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept="image/jpeg, image/png, image/webp" 
              multiple 
              className="hidden" 
            />
          </div>

          {showCamera && (
            <div className="bg-black rounded-xl overflow-hidden mb-4 relative max-w-md mx-auto aspect-video flex flex-col items-center justify-center">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "environment" }}
                className="w-full h-full object-cover"
              />
              <button 
                type="button" 
                onClick={capturePhoto}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-2 rounded-full font-bold shadow-lg"
              >
                TANGKAP
              </button>
            </div>
          )}

          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
              {images.map(img => (
                <div key={img.id} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square">
                  <img src={img.base64} alt="Bukti" className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={() => removeImage(img.id)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Seksyen 4: Tindakan Susulan */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">Tindakan Susulan & Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tindakan Susulan</label>
              <div className="space-y-2">
                {['Tiada', 'Teguran', 'Amaran Lisan', 'Amaran Bertulis', 'Lain-lain'].map(opt => (
                  <label key={opt} className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      name="tindakan" 
                      checked={tindakanSusulan === opt}
                      onChange={() => setTindakanSusulan(opt)}
                      className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-sm text-slate-700">{opt}</span>
                  </label>
                ))}
              </div>
              {tindakanSusulan === 'Lain-lain' && (
                <input 
                  type="text" 
                  value={lainLainTindakan}
                  onChange={e => setLainLainTindakan(e.target.value)}
                  placeholder="Nyatakan tindakan lain..."
                  className="w-full mt-2 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                  required
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status Aduan</label>
              <select 
                value={status} 
                onChange={e => setStatus(e.target.value as any)} 
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="Belum Diambil">Belum Diambil</option>
                <option value="Dalam Tindakan">Dalam Tindakan</option>
                <option value="Selesai">Selesai</option>
              </select>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100">
          <button 
            type="submit" 
            disabled={submitting}
            className="flex-1 btn-primary py-3 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-70"
          >
            {submitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            <span>{submitting ? 'Memproses...' : 'Simpan Aduan'}</span>
          </button>
          <button 
            type="button" 
            onClick={handleReset}
            disabled={submitting}
            className="sm:w-1/3 bg-white/50 hover:bg-white/80 text-slate-700 py-3 rounded-xl font-medium flex items-center justify-center space-x-2 transition-colors disabled:opacity-70"
          >
            <RotateCcw size={20} />
            <span>Reset</span>
          </button>
        </div>

      </form>

      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center max-w-sm w-full mx-4">
            <Loader2 size={48} className="animate-spin text-blue-600 mb-6" />
            <h3 className="text-xl font-bold text-slate-800 mb-2 text-center">Menyimpan Aduan</h3>
            <p className="text-slate-500 text-center">Sila tunggu aduan sedang diproses...</p>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-6 overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full animate-pulse w-full"></div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
