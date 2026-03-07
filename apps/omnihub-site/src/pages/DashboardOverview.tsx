export function DashboardOverview() {
  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="text-center space-y-4 animate-in fade-in zoom-in duration-500">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
          OmniDash
        </h1>
        <p className="text-gray-400 text-lg">Welcome to your command center.</p>
        <p className="text-sm text-gray-500">Select a module from the sidebar to begin.</p>
      </div>
    </div>
  );
}
