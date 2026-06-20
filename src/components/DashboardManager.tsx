import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, Users, Award, CheckCircle2, AlertTriangle, 
  Search, ShieldCheck, FileText, ArrowRight, TrendingUp, Sparkles, HelpCircle,
  Video, ExternalLink, ChevronRight, User, GraduationCap, Briefcase, Plus, Send,
  Activity, Lock, Target, PlusCircle, Check, PlayCircle, BookOpen
} from "lucide-react";
import { api } from "../api.js";
import { translations } from "../translations.js";

export default function DashboardManager({ lang = "en", userProfile }: { 
  lang?: "en" | "hi";
  userProfile: any; 
}) {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<"myself" | "team">("team");
  const [team, setTeam] = useState<any[]>([]);
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [kriData, setKriData] = useState<any>(null);
  const [nominations, setNominations] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedEmployeeProfile, setSelectedEmployeeProfile] = useState<any>(null);

  // Manager's own personal stats
  const [myWri, setMyWri] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [myLearning, setMyLearning] = useState<any[]>([]);
  const [assignmentLogs, setAssignmentLogs] = useState<any[]>([]);
  const [assignmentSuccess, setAssignmentSuccess] = useState<string | null>(null);

  const loadManagerData = async () => {
    try {
      const tUsers = await api.getTeam();
      setTeam(tUsers);

      const comps = await api.getCompetencies();
      setCompetencies(comps);

      const kData = await api.getKRI();
      setKriData(kData);

      const noms = await api.getMentorNominations();
      setNominations(noms);

      const sLogs = await api.getMentorSessions();
      setSessions(sLogs);

      // Load manager's own report safely
      try {
        const mw = await api.getWRI();
        setMyWri(mw);
        const mp = await api.getUserCompetencyProfile();
        setMyProfile(mp);
        const ml = await api.getLearningPaths();
        setMyLearning(ml);
      } catch (err) {
        console.warn("Could not load personal report stats for manager:", err);
      }
    } catch (e) {
      console.error("Failed to load manager metrics:", e);
    }
  };

  useEffect(() => {
    loadManagerData();
  }, [userProfile]);

  const handleAssignModule = (employeeName: string, moduleTitle: string) => {
    const newLog = {
      id: `asg_${Date.now()}`,
      employeeName,
      moduleTitle,
      assignedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setAssignmentLogs(prev => [newLog, ...prev]);
    setAssignmentSuccess(`Successfully dispatched priority assignment '${moduleTitle}' to ${employeeName}!`);
    setTimeout(() => {
      setAssignmentSuccess(null);
    }, 4000);
  };

  // Action callback for Approvals
  const handleApproveNomination = async (nomId: string, action: "approved" | "rejected") => {
    try {
      await api.actOnNomination(nomId, action);
      loadManagerData();
    } catch (e) {
      alert("Failed actioning nomination.");
    }
  };

  const inspectSkillProfile = async (empId: string) => {
    try {
      const prof = await api.getUserCompetencyProfile(empId);
      setSelectedEmployeeProfile(prof);
    } catch (e) {
      alert("Failed to load user gap profiles.");
    }
  };

  const getCriticalTag = (crit: string) => {
    if (crit === "high") return <span className="text-[9px] font-mono font-bold bg-rose-950 text-rose-400 border border-rose-900 rounded px-1.5 py-0.5">CRITICAL SPECIALTY</span>;
    return <span className="text-[9px] font-mono text-zinc-500 rounded px-1 px-1 py-0.5">STANDARD</span>;
  };

  const [searchTerm, setSearchTerm] = useState<string>("");

  const filteredTeam = team.filter(emp => {
    const val = searchTerm.toLowerCase();
    return emp.fullName?.toLowerCase().includes(val) || 
           emp.jobTitle?.toLowerCase().includes(val);
  });

  return (
    <div className="space-y-6">
      
      {/* 🚀 Portal Tab Switcher & Manager Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-8 -translate-y-8">
          <Activity className="w-64 h-64 text-sky-400" />
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse"></span>
              <span className="text-[10px] uppercase tracking-widest font-mono text-sky-400 font-bold">
                Manager Portal ({userProfile.department?.toUpperCase() || "Operations"} Department)
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight font-sans text-slate-100">
              {lang === "hi" ? `प्रबंधक डैशबोर्ड: ${userProfile.fullName}` : `Manager Control Hub: ${userProfile.fullName}`}
            </h2>
            <p className="text-xs text-sky-200/70 font-mono font-medium max-w-xl leading-relaxed">
              {lang === "hi" 
                ? "अपनी स्वयं की योग्यता प्रगति की निगरानी करें और अपने शिफ़्ट स्टाफ़ की तत्परता सूचकांक (Ready Indices) तथा कौशल अंतरालों का प्रबंधन करें।"
                : "Monitor your own capability progress alongside your shifts readiness indices, compliance scores, and targeted task training profiles."}
            </p>
          </div>

          <div className="flex bg-slate-800/80 p-1.5 rounded-lg border border-slate-700 shrink-0 self-start md:self-center">
            <button
              onClick={() => {
                setActiveTab("myself");
                setSelectedEmployeeProfile(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-sans font-extrabold transition-all duration-200 cursor-pointer ${
                activeTab === "myself"
                  ? "bg-sky-600 text-white shadow-md font-black"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <User className="w-4 h-4" />
              <span>{lang === "hi" ? "स्वयं की रिपोर्ट" : "My Personal Report"}</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("team");
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-sans font-extrabold transition-all duration-200 cursor-pointer ${
                activeTab === "team"
                  ? "bg-sky-600 text-white shadow-md font-black"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{lang === "hi" ? "टीम / विभाग रिपोर्ट" : "My Team/Dept Report"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🔮 Case 1: Myself Personal Report */}
      {activeTab === "myself" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Personal WRI Indicator Meter & Info Cards */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Leader Bio Profile Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs text-slate-800 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <div className="w-12 h-12 bg-sky-600 rounded-full flex items-center justify-center font-mono font-bold text-white text-sm">
                    {userProfile.fullName ? userProfile.fullName.split(" ").map((n: string) => n[0]).join("") : "M"}
                  </div>
                  <div>
                    <h3 className="font-sans font-black text-slate-900 text-sm leading-tight">{userProfile.fullName}</h3>
                    <p className="text-xs font-mono text-slate-500">{userProfile.jobTitle || "Department Manager"}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-mono font-extrabold bg-sky-50 border border-sky-200 text-sky-600 rounded uppercase">
                      Admin Authorized Lead
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="font-medium">Duty Shift Location:</span>
                    <span className="font-mono text-slate-900 font-semibold bg-slate-50 px-2 py-0.5 rounded border border-slate-100">SMS-2 Casting Floor</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="font-medium">Direct Report Span:</span>
                    <span className="font-mono text-slate-900 font-semibold bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{team.length} Operators</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="font-medium">Primary Competency:</span>
                    <span className="font-mono text-slate-900 font-semibold text-[10px] bg-indigo-50 border border-indigo-150 text-indigo-700 px-2 py-0.5 rounded">
                      Process Controls
                    </span>
                  </div>
                </div>
              </div>

              {/* Personal Workforce Readiness Index Dial */}
              {myWri ? (
                <div className="bg-gradient-to-br from-indigo-950 to-slate-900 text-white rounded-xl p-5 shadow-md border border-indigo-900/60 text-center space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest font-black block">
                      My Workforce Readiness Score
                    </span>
                    <p className="text-[10px] text-slate-400 font-mono">My personal WRI compliance level</p>
                  </div>

                  <div className="inline-flex justify-center items-center relative py-2">
                    <div className="w-28 h-28 rounded-full border-4 border-slate-800 flex flex-col justify-center items-center bg-slate-950/50">
                      <span className="text-3xl font-mono font-black text-indigo-400">{myWri.wri}%</span>
                      <span className="text-[9px] font-mono tracking-wider uppercase text-emerald-400 font-bold mt-1">Ready</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800 text-[10px]">
                    <div className="space-y-0.5 bg-slate-950/40 p-2 rounded">
                      <span className="text-slate-400 block font-mono">Skills Met</span>
                      <span className="font-mono font-bold text-sky-400">{myWri.factors.competencyCoverage}%</span>
                    </div>
                    <div className="space-y-0.5 bg-slate-950/40 p-2 rounded">
                      <span className="text-slate-400 block font-mono">Tests Pass</span>
                      <span className="font-mono font-bold text-amber-400">{myWri.factors.assessmentSuccess}%</span>
                    </div>
                    <div className="space-y-0.5 bg-slate-950/40 p-2 rounded">
                      <span className="text-slate-400 block font-mono">Learning</span>
                      <span className="font-mono font-bold text-rose-400">{myWri.factors.learningProgress}%</span>
                    </div>
                  </div>
                  
                  <p className="text-[10px] text-slate-300 leading-relaxed text-left italic bg-white/5 p-2.5 rounded border border-white/5">
                    💡 <strong>Calculation Guide:</strong> Your management WRI score is a composite metric weighted at 50% core leadership competency fulfillment, 30% safety clearance assessments, and 20% active instructional progress.
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-400 font-mono text-xs">
                  Calculating personal metrics...
                </div>
              )}

            </div>

            {/* Right Column: Manager Skill matrices & Learning Progress */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Personal Manager Skill Requirements vs Target */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm font-sans font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-150">
                    <Target className="w-4 h-4 text-sky-600" />
                    <span>My Assigned Core Competencies & Gap Score</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Check your personal rating relative to corporate specifications assigned for your management category.
                  </p>
                </div>

                {myProfile ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2 max-h-96 overflow-y-auto pr-1">
                    {myProfile.profile.map((item: any) => {
                      const isGaped = item.gap > 0;
                      return (
                        <div key={item.competency.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between space-y-3 hover:border-slate-300 transition-colors">
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <span className="text-[9px] font-mono font-bold text-[#0284C7] bg-sky-50 border border-sky-100 rounded px-1.5 py-0.5">
                                {item.competency.code}
                              </span>
                              <h4 className="font-sans font-black text-slate-900 text-xs mt-1.5">{item.competency.name}</h4>
                            </div>
                            {isGaped ? (
                              <span className="shrink-0 px-2.5 py-0.5 font-mono text-[9px] font-black bg-rose-50 border border-rose-250 text-rose-600 rounded">
                                GAP: -{item.gap}
                              </span>
                            ) : (
                              <span className="shrink-0 px-2.5 py-0.5 font-mono text-[9px] font-black bg-emerald-50 border border-emerald-200 text-emerald-600 rounded uppercase tracking-wider">
                                Compliant
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5 text-[11px]">
                            <div className="flex justify-between text-slate-500 font-mono text-[10px]">
                              <span>My Rating: {item.currentLevel} / 5</span>
                              <span>Target Level: {item.requiredLevel} / 5</span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden border border-slate-250">
                              <div 
                                className={`h-full ${isGaped ? "bg-amber-500" : "bg-emerald-500"}`} 
                                style={{ width: `${Math.min(100, (item.currentLevel / item.requiredLevel) * 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-400 font-mono text-center text-xs py-6">Loading capability matrices...</p>
                )}
              </div>

              {/* Manager's Self-directed Learning Modules */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm font-sans font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-150">
                    <BookOpen className="w-4 h-4 text-sky-600" />
                    <span>My Self-Directed Standard Compliance Learning Tracks</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Access courses mapped to standard operational plant modules. Complete these modules to raise your core compliance factors.
                  </p>
                </div>

                {myLearning && myLearning.length > 0 ? (
                  <div className="space-y-4">
                    {myLearning.map((path: any) => {
                      const isDone = path.progress?.status === "completed";
                      return (
                        <div key={path.module.id} className="border border-slate-200 rounded-lg p-5 bg-slate-50/50 space-y-4 hover:border-sky-500 transition-all">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-indigo-650 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 uppercase">
                                  {path.module.difficulty}
                                </span>
                                <span className="font-mono text-[10px] text-slate-500">{path.module.estimatedMinutes} Mins</span>
                              </div>
                              <h4 className="font-sans font-black text-slate-900 text-xs">{path.module.title}</h4>
                              <p className="text-[11px] text-slate-650 font-sans leading-relaxed">
                                {path.module.content}
                              </p>
                            </div>

                            <div className="shrink-0 flex items-center">
                              {isDone ? (
                                <span className="flex items-center gap-1 text-[10px] font-mono font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>DONE</span>
                                </span>
                              ) : (
                                <button
                                  onClick={async () => {
                                    try {
                                      await api.completeLearningModule(path.module.id);
                                      loadManagerData();
                                    } catch (e) {
                                      alert("Could not update completion status");
                                    }
                                  }}
                                  className="flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:border-sky-500 hover:bg-sky-50 px-3.5 py-1.5 text-[11px] text-slate-705 rounded-md font-sans font-bold shadow-3xs cursor-pointer hover:text-sky-700 transition-all"
                                >
                                  <PlayCircle className="w-3.5 h-3.5 text-sky-500" />
                                  <span>Complete Study</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* 💡 Concept guide: Easy Words */}
                          <div className="p-4 rounded-lg bg-indigo-50/40 border border-indigo-100/60 space-y-3 shadow-3xs">
                            <div className="flex items-center gap-1.5 text-indigo-700 font-sans font-extrabold text-xs">
                              <Sparkles className="w-4 h-4 text-indigo-500" />
                              <span>CONCEPT GUIDE: Explained in Easy Words (सरल सामान्य भाषा गाइड)</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans leading-relaxed text-slate-750">
                              <div className="space-y-1 bg-white/70 p-3 rounded border border-slate-100">
                                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold block">English Simple Terms:</span>
                                <p className="text-slate-705 leading-relaxed font-sans mt-0.5">
                                  {path.module.easyExplanation || "In simple terms, this course helps you understand practical hazard protection, how process limits operate, and what immediate troubleshooting actions are needed on-site."}
                                </p>
                              </div>
                              <div className="space-y-1 bg-white/70 p-3 rounded border border-indigo-100/30">
                                <span className="text-[10px] uppercase tracking-wider text-indigo-500 font-mono font-bold block">सरल हिंदी स्पष्टीकरण:</span>
                                <p className="text-slate-800 leading-relaxed font-sans mt-0.5">
                                  {path.module.easyExplanationHindi || "आसान शब्दों में कहें तो, यह कोर्स आपको प्रैक्टिकल सुरक्षा नियमों, मशीनों और उपकरणों की सीमा और आपातकालीन स्थिति में तुरंत की जाने वाली जरूरी कार्रवाई समझाता है।"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* 📚 Real reference study links */}
                          {path.module.resources && path.module.resources.length > 0 && (
                            <div className="pt-3 border-t border-slate-200">
                              <span className="text-[10px] text-slate-500 font-mono block uppercase tracking-wider font-bold mb-2.5">
                                Real Study Resources & Reference Links:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {path.module.resources.map((res: any, idx: number) => {
                                  const isVideo = res.url.includes("youtube.com") || res.url.includes("youtu.be") || res.name.toLowerCase().includes("video");
                                  const isPdf = res.url.includes(".pdf") || res.name.toLowerCase().includes("pdf") || res.name.toLowerCase().includes("manual") || res.name.toLowerCase().includes("handbook");
                                  return (
                                    <a 
                                      key={idx} 
                                      href={res.url} 
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-start gap-3 p-3 rounded-lg bg-white border border-slate-200 hover:border-indigo-500 hover:text-indigo-650 hover:shadow-xs transition-all text-xs group"
                                    >
                                      <div className={`p-2 rounded shrink-0 ${isVideo ? "bg-rose-50 text-rose-600" : isPdf ? "bg-[#0284C7]/10 text-[#0284C7]" : "bg-teal-50 text-teal-600"}`}>
                                        {isVideo ? (
                                          <Video className="w-4 h-4" />
                                        ) : isPdf ? (
                                          <FileText className="w-4 h-4" />
                                        ) : (
                                          <ExternalLink className="w-4 h-4" />
                                        )}
                                      </div>
                                      <div className="space-y-0.5 flex-1 min-w-0">
                                        <span className="font-sans font-bold text-slate-800 block truncate group-hover:text-indigo-650">{res.name}</span>
                                        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block font-bold">
                                          {isVideo ? "Video Lesson (टीचिंग वीडियो)" : isPdf ? "Official Manual (पीडीएफ गाइड)" : "Standard Portal (अकादमिक लिंक)"}
                                        </span>
                                      </div>
                                    </a>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-400 font-mono text-center text-xs py-6">No self-directed study tracks assigned.</p>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 🔮 Case 2: Team/Dept Report Tab */}
      {activeTab === "team" && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Executive Quick Stats Cards */}
          {kriData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 p-5 rounded-xl flex justify-between items-center relative overflow-hidden shadow-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">Knowledge Risk Index (KRI)</span>
                  <p className={`text-4xl font-mono font-bold tracking-tight ${kriData.kri > 40 ? "text-rose-600" : "text-emerald-600"}`}>{kriData.kri}%</p>
                  <p className="text-[10px] text-slate-400 font-mono">Shift standard: max 35%</p>
                </div>
                <div className={`p-3 rounded-full border shrink-0 ${kriData.kri > 40 ? "bg-rose-50 border-rose-100 text-rose-500" : "bg-emerald-50 border-emerald-100 text-emerald-500"}`}>
                  <ShieldAlert className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-xl flex justify-between items-center relative overflow-hidden shadow-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">Competency Gap Risk</span>
                  <p className="text-4xl font-mono font-bold text-amber-600 tracking-tight">{kriData.factors.teamGapRisk}%</p>
                  <div className="w-24 bg-slate-100 h-1 rounded-full overflow-hidden mt-2 border border-slate-200">
                    <div className="bg-amber-500 h-full" style={{ width: `${kriData.factors.teamGapRisk}%` }}></div>
                  </div>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 text-amber-500 rounded-full shrink-0">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-xl flex justify-between items-center relative overflow-hidden shadow-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">Bottleneck Experts</span>
                  <p className="text-4xl font-mono font-bold text-rose-600 tracking-tight">{kriData.factors.bottleneckRisk}%</p>
                  <p className="text-[10px] text-slate-400 font-mono">Knowledge single points</p>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-500 rounded-full shrink-0">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-xl flex justify-between items-center relative overflow-hidden shadow-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">SOP Manual Deficit</span>
                  <p className="text-4xl font-mono font-bold text-sky-600 tracking-tight">{kriData.factors.documentationDeficit}%</p>
                  <p className="text-[10px] text-slate-400 font-mono">Unstructured knowledge</p>
                </div>
                <div className="p-3 bg-sky-50 border border-sky-100 text-sky-500 rounded-full shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
            </div>
          )}

          {/* Plant Warnings Panel */}
          {kriData && kriData.riskWarnings?.length > 0 && (
            <div className="bg-rose-50/50 border-l-4 border-rose-500 p-4.5 rounded-r-lg space-y-2 border border-rose-200/50">
              <div className="flex items-center gap-2 text-rose-700 font-sans font-extrabold text-xs uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-rose-500 animate-bounce" />
                <span>Active Safety & Competency Risk Warnings</span>
              </div>
              <ul className="list-disc pl-5 text-[11px] text-slate-750 space-y-1.5 font-sans leading-relaxed">
                {kriData.riskWarnings.map((warn: string, i: number) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Interactive Assignment Success Toast Alert */}
          {assignmentSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-lg shadow-sm text-xs text-emerald-800 font-sans flex items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                  <Check className="w-3.5 h-3.5 font-black" />
                </div>
                <span className="font-bold">{assignmentSuccess}</span>
              </div>
              <button 
                onClick={() => setAssignmentSuccess(null)}
                className="text-[10px] font-mono text-slate-400 hover:text-slate-650 font-bold"
              >
                Close
              </button>
            </div>
          )}

          {/* Roster & Search Matrix Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Portion: Enhanced Operator Team Table (Roster Matrices) */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 space-y-5 shadow-xs">
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
                <div>
                  <h3 className="text-base font-sans font-black text-slate-900">
                    {lang === "hi" ? "दैनिक फ़ील्ड स्टाफ़ कौशल सूची (Crew Matrix)" : "Operational Staff Capability Roster"}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Analyze the readiness dials (WRI) and specific skill gaps of shift personnel to execute targeted training.
                  </p>
                </div>
                
                <div className="relative w-full sm:w-64 max-w-sm shrink-0">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={lang === "hi" ? "कर्मचारी या पद खोजें..." : "Filter by operator or job role..."}
                    className="w-full pl-9 pr-4 py-1.5 text-xs text-slate-800 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:ring-2 focus:ring-sky-500 rounded-lg outline-hidden font-sans transition-all"
                  />
                </div>
              </div>

              {/* Roster Table */}
              <div className="overflow-x-auto border border-slate-250 rounded-lg">
                <table className="w-full text-xs font-sans text-slate-700">
                  <thead className="bg-[#1E293B] text-[9px] uppercase font-mono tracking-widest text-slate-300 text-left border-b border-slate-300">
                    <tr>
                      <th className="p-3.5 font-extrabold">Employee & Job Title</th>
                      <th className="p-3.5 font-extrabold text-center">WRI Score</th>
                      <th className="p-3.5 font-extrabold text-center">Skill Gaps</th>
                      <th className="p-3.5 font-extrabold">Next Recommended Assignment</th>
                      <th className="p-3.5 font-extrabold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {filteredTeam.map((emp) => {
                      const wriColor = emp.wri >= 75 ? "text-emerald-500 bg-emerald-50 border border-emerald-150" : emp.wri >= 45 ? "text-amber-600 bg-amber-50 border border-amber-150" : "text-rose-500 bg-rose-50 border border-rose-150";
                      const gapCount = emp.gaps ? emp.gaps.length : 0;
                      const nextAsg = emp.nextAssignments && emp.nextAssignments.length > 0 ? emp.nextAssignments[0] : null;

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                          
                          {/* Profile */}
                          <td className="p-3.5 font-sans">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-sky-600 text-white font-mono font-black text-[10px] flex items-center justify-center shadow-3xs uppercase shrink-0">
                                {emp.fullName?.split(" ").map((n: string) => n[0]).join("")}
                              </div>
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-800 block leading-tight">{emp.fullName}</span>
                                <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">{emp.jobTitle}</span>
                              </div>
                            </div>
                          </td>

                          {/* WRI Score Badge */}
                          <td className="p-3.5 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className={`px-2 py-1.5 rounded-md font-mono font-black text-xs min-w-[50px] block ${wriColor}`}>
                                {emp.wri || 0}%
                              </span>
                              <div className="w-12 bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden border border-slate-205">
                                <div className={`h-full ${emp.wri >= 75 ? "bg-emerald-500" : emp.wri >= 45 ? "bg-amber-400" : "bg-rose-500"}`} style={{ width: `${emp.wri || 0}%` }}></div>
                              </div>
                            </div>
                          </td>

                          {/* Skill Gaps Count */}
                          <td className="p-3.5 text-center">
                            {gapCount > 0 ? (
                              <span className="px-2 py-0.5 rounded-lg border border-rose-200 bg-rose-50/50 text-rose-600 text-[10px] font-mono font-black">
                                {gapCount} GAPS
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 text-[10px] font-mono font-extrabold uppercase">
                                CLEAR
                              </span>
                            )}
                          </td>

                          {/* Next Recommended Assignment */}
                          <td className="p-3.5 max-w-[200px]">
                            {nextAsg ? (
                              <div className="space-y-0.5">
                                <span className="text-slate-800 font-bold font-sans block truncate text-xs">
                                  {nextAsg.title}
                                </span>
                                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block truncate">
                                  💡 {nextAsg.reason}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono text-[10px] italic">Fully Qualified!</span>
                            )}
                          </td>

                          {/* Action Column */}
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {nextAsg && (
                                <button
                                  onClick={() => handleAssignModule(emp.fullName, nextAsg.title)}
                                  className="bg-sky-50 border border-sky-200 hover:bg-sky-100 text-sky-700 text-[10.5px] font-sans font-bold p-1 px-2.5 rounded transition-colors shadow-3xs cursor-pointer flex items-center gap-1 shrink-0"
                                  title="Dispatch learning task immediately"
                                >
                                  <PlusCircle className="w-3.5 h-3.5" />
                                  <span>Assign</span>
                                </button>
                              )}
                              
                              <button
                                onClick={() => inspectSkillProfile(emp.id)}
                                className="bg-white border border-slate-205 hover:bg-slate-50 text-slate-750 text-[10.5px] font-sans font-semibold p-1 px-2 rounded transition-colors shadow-3xs cursor-pointer"
                              >
                                Audit
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })}

                    {filteredTeam.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400 font-mono text-xs">
                          No personnel matched search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Live Audit Expanding Window */}
              {selectedEmployeeProfile && (
                <div className="bg-slate-50/50 p-5 border border-slate-250 rounded-lg space-y-4 animate-scaleUp">
                  
                  <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                        <h4 className="text-xs font-sans font-black text-slate-900 uppercase tracking-wider">
                          Capability Gap Profile Analysis
                        </h4>
                      </div>
                      <p className="text-xs font-sans text-slate-600">
                        Detailed review of <strong className="text-sky-750 font-black">{selectedEmployeeProfile.fullName}</strong> ({selectedEmployeeProfile.jobTitle})
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedEmployeeProfile(null)}
                      className="text-[10px] font-mono text-slate-400 hover:text-slate-600 font-bold border border-slate-200 bg-white shadow-3xs px-2 py-1 rounded cursor-pointer"
                    >
                      Close Analysis
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-72 overflow-y-auto pr-1">
                    {selectedEmployeeProfile.profile?.map((item: any) => {
                      const hasGap = item.gap > 0;
                      return (
                        <div key={item.competency.id} className="bg-white border border-slate-200 p-3 rounded-lg flex flex-col justify-between hover:shadow-3xs transition-all">
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-0.5">
                              <span className="text-[9px] font-mono font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">
                                #{item.competency.code}
                              </span>
                              <h5 className="font-sans font-bold text-slate-900 text-xs mt-1.5">{item.competency.name}</h5>
                              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider brand-font mt-0.5">
                                category: {item.competency.category}
                              </p>
                            </div>

                            {hasGap ? (
                              <span className="shrink-0 px-2 py-0.5 font-mono text-[9px] font-black bg-rose-50 border border-rose-200 text-rose-600 rounded">
                                GAP: -{item.gap}
                              </span>
                            ) : (
                              <span className="shrink-0 px-2 py-0.5 font-mono text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-600 rounded uppercase font-bold tracking-wider">
                                Certify
                              </span>
                            )}
                          </div>

                          <div className="space-y-1 mt-3">
                            <div className="flex justify-between text-[10px] font-mono text-slate-400">
                              <span>Rating: {item.currentLevel}/5</span>
                              <span>Required: {item.requiredLevel}/5</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-205">
                              <div 
                                className={`h-full ${hasGap ? "bg-amber-400" : "bg-emerald-500"}`} 
                                style={{ width: `${Math.min(100, (item.currentLevel / item.requiredLevel) * 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              )}

              {/* Directives Dispatch Session Logs */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex justify-between items-center text-slate-900">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-black block">Recent Dispatch Logs (This Session)</span>
                  <span className="text-[9px] font-mono font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">{assignmentLogs.length} Actions</span>
                </div>
                
                {assignmentLogs.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {assignmentLogs.map((log) => (
                      <div key={log.id} className="flex justify-between items-center text-[10.5px] bg-slate-50 border border-slate-150 p-2 rounded text-slate-705 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                          <span>Dispatched directive <strong>{log.moduleTitle}</strong> to <strong>{log.employeeName}</strong></span>
                        </div>
                        <span className="text-slate-400 shrink-0">{log.assignedAt}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10.5px] text-slate-400 font-mono italic">No learning directives sent yet in current session. Click 'Assign' to dispatch.</p>
                )}
              </div>

            </div>

            {/* Right Portion: Expert Nominations & Live Session Logs */}
            <div className="lg:col-span-4 space-y-6 animate-fadeIn">
              
              {/* Expert Mentors Queue */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                <h3 className="text-xs font-sans font-extrabold text-slate-800 uppercase tracking-widest pb-2 border-b border-slate-100 flex items-center gap-11.5">
                  🛡️ Expert Mentors Queue
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Accept self-nominations filed by seniors to establish peer-to-peer relationships in the corporate skill graph.
                </p>

                <div className="space-y-3 scrollbar-none">
                  {nominations.filter(n => n.nomination.status === "pending").map((nom) => (
                    <div key={nom.nomination.id} className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg space-y-3 shadow-3xs">
                      <div>
                        <h4 className="text-xs font-sans font-black text-slate-900">{nom.user?.fullName}</h4>
                        <p className="text-[10px] font-mono text-slate-400">{nom.user?.jobTitle} ({nom.nomination.yearsExp} Yrs Experience)</p>
                      </div>
                      
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 font-mono block uppercase">Claimed Specialties:</span>
                        <div className="flex flex-wrap gap-1">
                          {nom.competenciesDetail.map((c: any) => (
                            <span key={c.id} className="inline-block px-1.5 py-0.5 text-[9px] font-mono bg-sky-50 border border-sky-100 text-[#0284C7] rounded">
                              #{c.code}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-200">
                        <button
                          onClick={() => handleApproveNomination(nom.nomination.id, "approved")}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold text-[10px] py-1.5 rounded transition-colors uppercase cursor-pointer"
                        >
                          Authorize
                        </button>
                        <button
                          onClick={() => handleApproveNomination(nom.nomination.id, "rejected")}
                          className="flex-1 bg-white hover:bg-slate-100 text-slate-600 font-sans text-[10px] py-1.5 rounded transition-colors uppercase border border-slate-200 cursor-pointer"
                        >
                          Refuse
                        </button>
                      </div>
                    </div>
                  ))}

                  {nominations.filter(n => n.nomination.status === "pending").length === 0 && (
                    <div className="text-center py-6">
                      <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-[11px] text-slate-400 font-mono">Pending authorizations list is completely cleared.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Plant Session Activity Indicators Logs */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                <h4 className="text-xs font-sans font-extrabold text-slate-800 uppercase tracking-widest pb-2 border-b border-slate-100">
                  📋 Live Mentoring Logs
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Real-time status of shift tutorials and knowledge captures mapped on-site.
                </p>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {sessions.map((sess) => (
                    <div key={sess.session.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-[11px]">
                      <div className="flex justify-between items-center text-slate-500 font-mono text-[10px]">
                        <span className="font-bold text-[#0284C7]">Adept: {sess.mentorName}</span>
                        <span>{new Date(sess.session.scheduledAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-800 font-sans font-semibold">Trainee operator: {sess.employeeName}</p>
                      <p className="text-slate-600 font-serif whitespace-pre-wrap italic leading-relaxed text-[10.5px]">Notes: "{sess.session.sessionNotes}"</p>
                      {sess.session.capturedKnowledge && (
                        <div className="mt-2 p-1.5 bg-emerald-50 text-[9.5px] rounded border border-emerald-150 text-emerald-700 font-mono font-bold flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                          <span>Published SOP Manual mapped.</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {sessions.length === 0 && (
                    <p className="text-[11px] text-center text-slate-400 font-mono py-10">No mentoring logs captured yet in history.</p>
                  )}
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

function ChevronIndicator({ trend }: { trend: "up" | "down" }) {
  return (
    <span className="font-mono text-[9px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1 py-0.5 rounded uppercase">
      ▲ REGULAR
    </span>
  );
}
