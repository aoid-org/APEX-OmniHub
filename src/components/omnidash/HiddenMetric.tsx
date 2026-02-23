import React from 'react';

export const HiddenMetric = ({ icon: Icon, label, value, valueClass }: { icon: any, label: string, value: string | React.ReactNode, valueClass?: string }) => {
  const isDesktopHidden = false; // Default: show full info on desktop

  return (
    <div className="group flex justify-between items-center text-xs px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors cursor-default relative overflow-hidden">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
        <span className="text-gray-400">{label}</span>
      </div>
      <div className="relative flex items-center justify-end min-w-[60px] h-5">
        <div className={`absolute right-0 flex items-center transition-all duration-300 opacity-100 group-hover:opacity-0 group-hover:scale-50 ${isDesktopHidden ? '' : 'lg:opacity-0 lg:scale-50'}`}>
          <Icon className="h-3.5 w-3.5 text-white/20" />
        </div>
        <span className={`font-mono transition-all duration-300 opacity-0 translate-x-2 group-hover:translate-x-0 group-hover:opacity-100 whitespace-nowrap ${isDesktopHidden ? '' : 'lg:opacity-100 lg:translate-x-0'} ${valueClass || 'text-gray-200 font-medium'}`}>
          {value}
        </span>
      </div>
    </div>
  );
};

export const HiddenValue = ({ icon: Icon, value, valueClass }: { icon?: any, value: string | React.ReactNode, valueClass?: string }) => {
  const isDesktopHidden = false; // Default: show full info on desktop
  const DefaultIcon = Icon || (() => <span className="h-3.5 w-3.5 inline-block opacity-50">•</span>);

  return (
    <div className="group relative inline-flex items-center justify-center min-w-[20px] h-5 cursor-default overflow-hidden">
      <div className={`absolute flex items-center transition-all duration-300 opacity-100 group-hover:opacity-0 group-hover:scale-50 ${isDesktopHidden ? '' : 'lg:opacity-0 lg:scale-50'}`}>
        <DefaultIcon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <span className={`transition-all duration-300 opacity-0 scale-95 group-hover:scale-100 group-hover:opacity-100 whitespace-nowrap ${isDesktopHidden ? '' : 'lg:opacity-100 lg:scale-100'} ${valueClass || ''}`}>
        {value}
      </span>
    </div>
  );
};
