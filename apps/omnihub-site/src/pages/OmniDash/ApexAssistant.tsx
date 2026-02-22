import { Brain } from 'lucide-react';

export function ApexAssistantPage() {
  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
          <Brain className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Connect AI</h1>
          <p className="text-gray-400 text-sm">APEX AI assistant — coming soon</p>
        </div>
      </div>
      
      <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center max-w-md mx-auto mt-20">
        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
          <Brain className="w-6 h-6 text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">Coming Soon</h3>
        <p className="text-sm text-gray-400">Live data integration in progress</p>
      </div>
    </div>
  );
}
