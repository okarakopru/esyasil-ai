import React, { useState, useCallback } from 'react';
import Navbar from './components/Navbar';
import ImageSlider from './components/ImageSlider';
import { useFirebaseAuth } from './firebase';
import { ProcessedImage } from './types';
import { fileToBase64, processImagesViaFunction } from './services/gemini';
import { auth } from './firebase';

export default function App() {
  const { user, loading, login, onLogout } = useFirebaseAuth();
  const [activePage, setActivePage] = useState('home');
  const [files, setFiles] = useState<File[]>([]);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (files.length >= 5) return;
    const droppedFiles = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    setFiles(prev => [...prev, ...droppedFiles].slice(0, 5));
  }, [files]);

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && files.length < 5) {
      const selectedFiles = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
      setFiles(prev => [...prev, ...selectedFiles].slice(0, 5));
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 🔥 AI Processing via Cloud Function
  const handleProcess = async () => {
    if (!user) {
      alert("Lütfen önce giriş yapın.");
      return;
    }

    if (files.length === 0) return;

    setIsProcessing(true);
    setError(null);

    try {
      // 🔥 Get user token for backend auth
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Auth token alınamadı.");

      // 🔥 Convert all files to base64
      const base64Images = [];
      for (const file of files) {
        base64Images.push(await fileToBase64(file));
      }

      // 🔥 Create placeholders in UI
      const placeholders = files.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        originalUrl: URL.createObjectURL(file),
        processedUrl: null,
        status: "processing",
        timestamp: Date.now()
      }));

      setProcessedImages(prev => [...placeholders, ...prev]);

      // 🔥 Send to Firebase Function
      const result = await processImagesViaFunction(base64Images, idToken);

      result.results.forEach((r: any, index: number) => {
        const id = placeholders[index].id;

        if (r.status === "success") {
          setProcessedImages(prev =>
            prev.map(img =>
              img.id === id
                ? { ...img, processedUrl: `data:image/png;base64,${r.data}`, status: "completed" }
                : img
            )
          );
        } else {
          setProcessedImages(prev =>
            prev.map(img =>
              img.id === id ? { ...img, status: "error" } : img
            )
          );
        }
      });

      setFiles([]);

    } catch (err) {
      console.error(err);
      setError("İşlem sırasında bir hata oluştu.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubscribe = () => {
    const confirmPay = window.confirm("100 TL tutarındaki Stripe Ödemesini simüle et?");
    if (confirmPay) {
      alert("Abonelik Aktif! (Simülasyon)");
      setActivePage('home');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} onLogin={login} onLogout={onLogout} onNavigate={setActivePage} />

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">

        {activePage === 'home' && (
          <div className="space-y-12">
            <div className="text-center space-y-4">
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
                Emlak Fotoğraflarını <span className="text-blue-600">Anında Temizleyin</span>
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                İç mekan fotoğraflarınızdan eşyaları kaldırarak boş oda görüntüsü oluşturur.
              </p>
            </div>

            {!user && (
              <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-100 border-b border-slate-200">
                  <h3 className="text-center font-semibold text-slate-700">Nasıl Çalışır?</h3>
                </div>
                <div className="p-6">
                  <ImageSlider 
                    beforeImage="/assets/demo_original.jpg" 
                    afterImage="/assets/demo_clean.jpg" 
                  />
                </div>
              </div>
            )}

            <div className="max-w-3xl mx-auto">
              {!user ? (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center mt-8">
                   <h3 className="text-lg font-semibold mb-4">Düzenlemeye başlamak için giriş yapın</h3>
                   <button onClick={login} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
                     Google ile Başlayın
                   </button>
                   <p className="mt-2 text-sm text-slate-500">Yeni üyelere 5 fotoğraf hediye!</p>
                </div>
              ) : (
                <div className="space-y-6">
                   <div 
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${files.length > 0 ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-blue-400 bg-white'}`}
                   >
                     <div className="flex flex-col items-center space-y-4">
                       <p className="text-lg font-medium text-slate-900">Fotoğrafları buraya sürükleyip bırakın</p>
                       <p className="text-sm text-slate-500">veya seçmek için tıklayın (Maks 5)</p>
                       <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        onChange={handleFileSelect} 
                        className="hidden" 
                        id="fileInput"
                       />
                       <label htmlFor="fileInput" className="cursor-pointer text-blue-600 font-medium hover:underline">
                         Dosya Seç
                       </label>
                     </div>
                   </div>

                   {files.length > 0 && (
                     <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100">
                       {files.map((file, idx) => (
                         <div key={idx} className="p-4 flex items-center justify-between">
                           <span className="text-sm font-medium text-slate-700">{file.name}</span>
                           <button onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500">X</button>
                         </div>
                       ))}
                     </div>
                   )}

                   <div className="flex justify-end items-center space-x-4">
                     <button 
                       onClick={handleProcess}
                       disabled={files.length === 0 || isProcessing}
                       className={`px-8 py-3 rounded-lg font-medium ${files.length === 0 ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                     >
                       {isProcessing ? 'İşleniyor...' : `Eşyaları Kaldır (${files.length})`}
                     </button>
                   </div>
                </div>
              )}
            </div>

            {processedImages.length > 0 && (
              <div className="space-y-8 pt-8 border-t border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900">Sonuçlar</h2>
                <div className="grid grid-cols-1 gap-8">
                  {processedImages.map((img) => (
                    <div key={img.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                       {img.status === 'completed' && img.processedUrl && (
                         <ImageSlider beforeImage={img.originalUrl} afterImage={img.processedUrl} />
                       )}
                       {img.status === 'processing' && <p>İşleniyor...</p>}
                       {img.status === 'error' && <p className="text-red-500">Hata oluştu</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activePage === 'pricing' && (
          <div className="max-w-3xl mx-auto py-12">
            <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
              <div className="bg-blue-600 p-8 text-center">
                <h2 className="text-3xl font-bold text-white mb-2">Pro Abonelik</h2>
                <p className="text-blue-100">Sınırsız işlem</p>
              </div>
              <div className="p-8 text-center">
                <span className="text-5xl font-extrabold text-slate-900">₺100</span>
                <span className="text-slate-500 ml-2">/ ay</span>
                <button 
                  onClick={handleSubscribe}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl mt-8"
                >
                  Stripe ile Abone Ol
                </button>
              </div>
            </div>

            <div className="text-center mt-6">
              <button onClick={() => setActivePage('home')} className="text-slate-500 hover:text-slate-700">
                Anasayfaya dön
              </button>
            </div>
          </div>
        )}

      </main>

      <footer className="bg-white border-t border-slate-200 py-8 mt-12">
        <div className="text-center text-slate-500 text-sm">
          © {new Date().getFullYear()} EşyaSil AI. Tüm hakları saklıdır.
        </div>
      </footer>
    </div>
  );
}
