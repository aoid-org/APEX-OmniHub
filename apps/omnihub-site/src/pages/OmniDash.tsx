import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

export function OmniDashPage() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="text-center space-y-4 animate-in fade-in zoom-in duration-500">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
          OmniDash
        </h1>
        <p className="text-gray-400 text-lg">Welcome to your command center.</p>

        <div className="pt-8">
            <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-400 transition-colors mx-auto"
            >
                <LogOut className="w-4 h-4" />
                Sign Out
            </button>
        </div>
      </div>
    </div>
  );
}
