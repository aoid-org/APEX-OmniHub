import { memo } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Database,
  Mail,
  FileBarChart,
  Target,
  Receipt,
  Users,
  Store,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

interface Skill {
  name: string;
  icon: React.ReactNode;
  status: 'Active' | 'Inactive';
  lastRun: string;
  successRate: number;
}

const SKILLS: Skill[] = [
  { name: 'Data Extraction', icon: <Database size={22} />, status: 'Active', lastRun: '3 min ago', successRate: 99.2 },
  { name: 'Email Automation', icon: <Mail size={22} />, status: 'Active', lastRun: '12 min ago', successRate: 97.8 },
  { name: 'Report Generation', icon: <FileBarChart size={22} />, status: 'Active', lastRun: '1 hr ago', successRate: 98.5 },
  { name: 'Lead Scoring', icon: <Target size={22} />, status: 'Inactive', lastRun: '2 days ago', successRate: 94.1 },
  { name: 'Invoice Processing', icon: <Receipt size={22} />, status: 'Active', lastRun: '28 min ago', successRate: 99.7 },
  { name: 'Customer Segmentation', icon: <Users size={22} />, status: 'Active', lastRun: '4 hrs ago', successRate: 96.3 },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const OmniSkillsPage = memo(function OmniSkillsPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] p-2 text-gray-400 transition hover:text-white"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3">
          <Sparkles size={24} className="text-violet-400" />
          <h1 className="text-2xl font-semibold text-white">OmniSkills</h1>
        </div>
      </div>

      {/* Installed Skills Grid */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-gray-300">Installed Skills</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SKILLS.map(skill => (
            <div
              key={skill.name}
              className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 transition hover:border-white/[0.12]"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-violet-400">
                    {skill.icon}
                  </div>
                  <div>
                    <p className="font-medium text-white">{skill.name}</p>
                    <p className="text-xs text-gray-500">Last run: {skill.lastRun}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    skill.status === 'Active'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {skill.status}
                </span>
              </div>

              {/* Success rate bar */}
              <div className="mt-5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Success Rate</span>
                  <span className="text-gray-300">{skill.successRate}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-violet-500/80"
                    style={{ width: `${skill.successRate}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Skill Marketplace Teaser */}
      <section>
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-violet-500/[0.06] to-indigo-500/[0.04] backdrop-blur-xl p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-400">
                <Store size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Skill Marketplace</h3>
                <p className="text-sm text-gray-400">
                  Browse 240+ community-built skills to expand your automation capabilities.
                </p>
              </div>
            </div>
            <button className="flex items-center gap-1.5 rounded-xl bg-violet-500/20 px-5 py-2.5 text-sm font-medium text-violet-300 transition hover:bg-violet-500/30">
              Explore Marketplace <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
});

export default OmniSkillsPage;
