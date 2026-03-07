import { memo } from 'react';
import {
  FolderOpen,
  Upload,
  FileText,
  FileSpreadsheet,
  Image,
  File,
  HardDrive,
  Share2,
  Clock,
  Users,
  MoreVertical,
} from 'lucide-react';

interface FileEntry {
  id: string;
  name: string;
  type: 'PDF' | 'CSV' | 'DOC' | 'MD' | 'IMG';
  size: string;
  modified: string;
  sharedWith: number;
}

const FILES: FileEntry[] = [
  {
    id: 'f1',
    name: 'Q4 Revenue Report.pdf',
    type: 'PDF',
    size: '2.4 MB',
    modified: '2 hours ago',
    sharedWith: 5,
  },
  {
    id: 'f2',
    name: 'Customer Database Export.csv',
    type: 'CSV',
    size: '18.7 MB',
    modified: 'Yesterday',
    sharedWith: 3,
  },
  {
    id: 'f3',
    name: 'Brand Guidelines.pdf',
    type: 'PDF',
    size: '8.1 MB',
    modified: '3 days ago',
    sharedWith: 12,
  },
  {
    id: 'f4',
    name: 'API Documentation.md',
    type: 'MD',
    size: '156 KB',
    modified: '1 week ago',
    sharedWith: 8,
  },
  {
    id: 'f5',
    name: 'Team Photo.jpg',
    type: 'IMG',
    size: '4.2 MB',
    modified: '2 weeks ago',
    sharedWith: 24,
  },
];

const STATS = [
  {
    label: 'Total Files',
    value: '1,247',
    icon: FolderOpen,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    label: 'Storage Used',
    value: '12.4 GB',
    icon: HardDrive,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  {
    label: 'Shared Files',
    value: '89',
    icon: Share2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    label: 'Recent Uploads',
    value: '24',
    icon: Clock,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
  },
];

const FILE_ICONS: Record<FileEntry['type'], React.ReactNode> = {
  PDF: <FileText className="h-5 w-5 text-red-400" />,
  CSV: <FileSpreadsheet className="h-5 w-5 text-emerald-400" />,
  DOC: <FileText className="h-5 w-5 text-blue-400" />,
  MD: <File className="h-5 w-5 text-gray-400" />,
  IMG: <Image className="h-5 w-5 text-purple-400" />,
};

const TYPE_BADGE_COLORS: Record<FileEntry['type'], string> = {
  PDF: 'text-red-400 bg-red-400/10',
  CSV: 'text-emerald-400 bg-emerald-400/10',
  DOC: 'text-blue-400 bg-blue-400/10',
  MD: 'text-gray-400 bg-gray-400/10',
  IMG: 'text-purple-400 bg-purple-400/10',
};

export const FilesPage = memo(function FilesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
            <FolderOpen className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Files</h1>
            <p className="text-sm text-gray-400">
              Document management and file operations
            </p>
          </div>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-orange-500/20 px-4 py-2 text-sm font-medium text-orange-400 transition-colors hover:bg-orange-500/30">
          <Upload className="h-4 w-4" />
          Upload
        </button>
      </div>

      {/* Storage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}
              >
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* File Browser */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">File Browser</h2>

        {/* Table Header */}
        <div className="mb-2 grid grid-cols-12 gap-4 border-b border-white/[0.06] px-4 pb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
          <span className="col-span-5">File Name</span>
          <span className="col-span-1">Type</span>
          <span className="col-span-2">Size</span>
          <span className="col-span-2">Modified</span>
          <span className="col-span-1">Shared</span>
          <span className="col-span-1" />
        </div>

        {/* File Rows */}
        <div className="space-y-1">
          {FILES.map((file) => (
            <div
              key={file.id}
              className="grid grid-cols-12 items-center gap-4 rounded-xl px-4 py-3 transition-colors hover:bg-white/[0.04] cursor-pointer"
            >
              <div className="col-span-5 flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] shrink-0">
                  {FILE_ICONS[file.type]}
                </div>
                <span className="truncate text-sm font-medium text-white">
                  {file.name}
                </span>
              </div>
              <div className="col-span-1">
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${TYPE_BADGE_COLORS[file.type]}`}
                >
                  {file.type}
                </span>
              </div>
              <span className="col-span-2 text-sm text-gray-300">
                {file.size}
              </span>
              <span className="col-span-2 text-sm text-gray-400">
                {file.modified}
              </span>
              <div className="col-span-1 flex items-center gap-1 text-sm text-gray-400">
                <Users className="h-3.5 w-3.5" />
                <span>{file.sharedWith}</span>
              </div>
              <div className="col-span-1 flex justify-end">
                <button className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-gray-300">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default FilesPage;
