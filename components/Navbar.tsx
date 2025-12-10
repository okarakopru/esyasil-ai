import React from 'react';
import { UserProfile } from '../types';

interface NavbarProps {
  user: UserProfile | null;
  onLogin: () => void;
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogin, onLogout, onNavigate }) => {
  return (
    <nav className="w-full bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center cursor-pointer" onClick={() => onNavigate('home')}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">EşyaSil AI</span>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="hidden md:flex flex-col items-end mr-2">
                  <span className="text-sm font-medium text-slate-800">{user.displayName || 'Kullanıcı'}</span>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${user.subscriptionStatus === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {user.subscriptionStatus === 'active' ? 'Pro Üye' : 'Ücretsiz'}
                    </span>
                    <span className="text-xs text-slate-500">{user.credits} kredi</span>
                  </div>
                </div>
                <button 
                  onClick={onLogout}
                  className="text-sm text-slate-600 hover:text-red-600 font-medium transition-colors"
                >
                  Çıkış Yap
                </button>
              </>
            ) : (
              <button 
                onClick={onLogin}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Giriş Yap
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;