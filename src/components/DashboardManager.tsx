import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, Users, Award, CheckCircle2, AlertTriangle, 
  Search, ShieldCheck, FileText, ArrowRight, TrendingUp, Sparkles, HelpCircle 
} from "lucide-react";
import { api } from "../api.js";
import { translations } from "../translations.js";

export default function DashboardManager({ lang = "en", userProfile }: { 
  lang?: "en" | "hi";
  userProfile: any; 
}) {
  const t = translations[lang];
  const [team, setTeam] = useState<any[]>([]);
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [kriData, setKriData] = useState<any>(null);
  const [nominations, setNominations] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedEmployeeProfile, setSelectedEmployeeProfile] = useState<any>(null);

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
    } catch (e) {
      console.error("Failed to load manager metrics:", e);
    }
  };

  useEffect(() => {
    loadManagerData();
  }, [userProfile]);

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

  return (
    <div className="space-y-6">
      
      {/* Executive Quick Stats Cards */}
      {kriData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          <div className="bg-white border border-slate-200 p-5 rounded-lg flex justify-between items-center relative overflow-hidden shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Knowledge Risk (KRI)</span>
              <p className={`text-3xl font-mono font-bold ${kriData.kri > 40 ? "text-rose-600" : "text-emerald-600"}`}>{kriData.kri}%</p>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-2">
                <ChevronIndicator trend="up" />
                <span>Risk rating metrics active</span>
              </div>
            </div>
            <div className={`p-3 rounded-full border ${kriData.kri > 40 ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-emerald-50 border-emerald-100 text-emerald-600"}`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-lg flex justify-between items-center shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Skill Gap Risk</span>
              <p className="text-3xl font-mono font-bold text-amber-600">{kriData.factors.teamGapRisk}%</p>
              <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3 border border-slate-150">
                <div className="bg-amber-500 h-full" style={{ width: `${kriData.factors.teamGapRisk}%` }}></div>
              </div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-150 text-amber-600 rounded-full">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-lg flex justify-between items-center shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Expert Bottlenecks</span>
              <p className="text-3xl font-mono font-bold text-rose-600">{kriData.factors.bottleneckRisk}%</p>
              <span className="text-[10px] text-slate-400 block mt-2">Critical skills concentration</span>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-full">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-5 rounded-lg flex justify-between items-center shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Doc Deficit Gap</span>
              <p className="text-3xl font-mono font-bold text-sky-600">{kriData.factors.documentationDeficit}%</p>
              <span className="text-[10px] text-slate-400 block mt-2">Core manual saturation</span>
            </div>
            <div className="p-3 bg-sky-50 border border-sky-100 text-sky-600 rounded-full">
              <FileText className="w-6 h-6" />
            </div>
          </div>

        </div>
      )}

      {/* Primary Row Section: Plant warnings */}
      {kriData && kriData.riskWarnings.length > 0 && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-md space-y-2">
          <div className="flex items-center gap-2 text-rose-600 font-sans font-extrabold text-sm">
            <ShieldAlert className="w-4 h-4 animate-bounce" />
            <span>High Risk Corporate Alerts Active</span>
          </div>
          <ul className="list-disc pl-5 text-xs text-slate-700 space-y-1">
            {kriData.riskWarnings.map((warn: string, i: number) => (
              <li key={i} className="font-sans leading-relaxed">{warn}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Grid: Team Gap metrics & nominating lists */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* TEAM MATRICES LEDGER */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-center text-slate-900">
            <div>
              <h3 className="text-base font-sans font-extrabold text-slate-904">
                {lang === "hi" ? "दैनिक फ़ील्ड स्टाफ़ कौशल सूची (Crew Matrix)" : "My Shift Team Skills"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {lang === "hi" 
                  ? "अपने टीम के कर्मचारियों के काम की जाँच करें और सुरक्षा समीक्षा आसानी से शुरू करें।" 
                  : "Check on your shift workers, and start skill or safety reviews easily."}
              </p>
            </div>
            <span className="text-[10px] font-mono text-[#0284C7] bg-sky-50 px-2.5 py-1 border border-sky-100 rounded uppercase font-bold">SMS-2 melting shift</span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded">
            <table className="w-full text-xs font-sans text-slate-700">
              <thead className="bg-slate-50 text-[10px] uppercase font-mono tracking-wider text-slate-500 text-left">
                <tr>
                  <th className="p-3 border-b border-slate-200">Full Name</th>
                  <th className="p-3 border-b border-slate-200">Job Role</th>
                  <th className="p-3 border-b border-slate-200">Prior Experience</th>
                  <th className="p-3 border-b border-slate-200 text-right">Operational Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {team.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-semibold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 bg-[#0284C7] font-mono font-bold text-white text-[10px] rounded-full flex items-center justify-center">
                        {emp.fullName.split(" ").map((n: string) => n[0]).join("")}
                      </div>
                      <span>{emp.fullName}</span>
                    </td>
                    <td className="p-3 font-mono text-slate-500">{emp.jobTitle}</td>
                    <td className="p-3 font-mono text-slate-600">
                      {emp.onboardingData ? `${emp.onboardingData.priorExperienceYrs} Years` : "Not finished onboarding"}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => inspectSkillProfile(emp.id)}
                        className="bg-white border border-slate-200 hover:bg-slate-50 text-[11px] text-slate-750 font-sans p-1 px-3.5 rounded transition-colors shadow-xs cursor-pointer"
                      >
                        Launch Gap Audit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Inline Profile gap visual block */}
          {selectedEmployeeProfile && (
            <div className="bg-slate-50 p-4 border border-slate-200 rounded-md mt-4 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <h4 className="text-xs font-sans font-bold text-slate-900">Detailed gap metrics: <span className="text-amber-600">{selectedEmployeeProfile.fullName}</span></h4>
                <button
                  onClick={() => setSelectedEmployeeProfile(null)}
                  className="text-[10px] font-mono text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {selectedEmployeeProfile.profile.map((item: any) => (
                  <div key={item.competency.id} className="flex justify-between items-center text-[11px] bg-white border border-slate-200 p-2 rounded">
                    <div>
                      <p className="font-bold text-slate-800">{item.competency.name}</p>
                      <span className="text-[10px] font-mono text-slate-400 uppercase">Target rating: {item.requiredLevel}/5 • Current: {item.currentLevel}/5</span>
                    </div>
                    {item.gap > 0 ? (
                      <span className="px-2 py-0.5 font-mono text-[9px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200 rounded">GAP: -{item.gap}</span>
                    ) : (
                      <span className="px-2 py-0.5 font-mono text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-200 rounded uppercase font-semibold">CERTIFIED</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MODERATOR NOMINATIONS CENTER */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-sans font-extrabold text-slate-800 uppercase tracking-wider">Expert Mentors Queue</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">Accept self-nominations filed by experienced technicians on critical cast topics to update relationship flows in graph.</p>

            <div className="space-y-3">
              {nominations.filter(n => n.nomination.status === "pending").map((nom) => (
                <div key={nom.nomination.id} className="bg-slate-50 border border-slate-200 p-3.5 rounded-md space-y-3">
                  <div>
                    <h4 className="text-xs font-sans font-extrabold text-slate-900">{nom.user?.fullName}</h4>
                    <p className="text-[10px] font-mono text-slate-400">{nom.user?.jobTitle} ({nom.nomination.yearsExp} Yrs in Field)</p>
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 font-mono block uppercase">Claimed Specialties:</span>
                    {nom.competenciesDetail.map((c: any) => (
                      <span key={c.id} className="inline-block px-1.5 py-0.5 text-[9px] font-mono bg-sky-50 border border-sky-100 text-[#0284C7] rounded mr-1">
                        #{c.code}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-1 border-t border-slate-200">
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
                <p className="text-[11px] text-center text-slate-400 font-mono py-6">Pending authorizations list is completely cleared.</p>
              )}
            </div>
          </div>

          {/* Plant Knowledge Session Activity indicators log */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 shadow-sm">
            <h4 className="text-sm font-sans font-extrabold text-slate-800">Live Mentoring Logs</h4>
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {sessions.map((sess) => (
                <div key={sess.session.id} className="bg-slate-50 p-3 rounded-md border border-slate-200 space-y-1 text-[11px]">
                  <div className="flex justify-between items-center text-slate-500 font-mono text-[10px]">
                    <span className="font-semibold text-[#0284C7]">Adept: {sess.mentorName}</span>
                    <span>{new Date(sess.session.scheduledAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-800 font-sans leading-relaxed">Trainee operator: {sess.employeeName}</p>
                  <p className="text-slate-500 font-serif whitespace-pre-wrap italic">Notes: {sess.session.sessionNotes}</p>
                  {sess.session.capturedKnowledge && (
                    <div className="mt-1.5 p-1 bg-white text-[10px] rounded border border-slate-200 text-emerald-600 font-mono font-semibold">
                      Published SOP Manual successfully mapped.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

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
