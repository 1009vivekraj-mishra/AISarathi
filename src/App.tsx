import React, { useState, useEffect } from "react";
import { 
  Briefcase, ShieldAlert, Brain, BookOpen, Users, 
  Award, Network, LogIn, UserPlus, LogOut, Info, AlertOctagon,
  Sparkles, Check, ServerCrash, Clock, AlertTriangle, UserCheck
} from "lucide-react";
import { api } from "./api.js";
import DashboardEmployee from "./components/DashboardEmployee.tsx";
import DashboardManager from "./components/DashboardManager.tsx";
import DashboardAdmin from "./components/DashboardAdmin.tsx";
import { translations, Language } from "./translations.js";
import { db, testConnection } from "./firebase.js";

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [appInitialized, setAppInitialized] = useState(false);
  const [authView, setAuthView] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  
  // Custom global language toggle state (en / hi)
  const [lang, setLang] = useState<Language>("en");
  const t = translations[lang];

  // Sync state refresh
  const [stateNonce, setStateNonce] = useState(0);

  // Form Fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"employee" | "manager" | "admin">("employee");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");

  // Onboarding Form fields
  const [obExp, setObExp] = useState<number>(3);
  const [obSpecialties, setObSpecialties] = useState<string[]>([]);
  const [obCerts, setObCerts] = useState<string[]>([]);
  const [obJob, setObJob] = useState("");
  const [obDept, setObDept] = useState("");

  const verifyTokenAndSession = async () => {
    const token = localStorage.getItem("sarathi_token");
    if (!token) {
      setAppInitialized(true);
      return;
    }
    try {
      const data = await api.getMe();
      setCurrentUser(data.user);
    } catch (e) {
      // Clear compromised token
      localStorage.removeItem("sarathi_token");
    } finally {
      setAppInitialized(true);
    }
  };

  useEffect(() => {
    verifyTokenAndSession();
    testConnection().then(() => {
      setFirebaseConnected(true);
    }).catch(() => {
      setFirebaseConnected(false);
    });
  }, [stateNonce]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setAuthError("");
    setAuthLoading(true);

    try {
      const data = await api.login(username, password);
      localStorage.setItem("sarathi_token", data.token);
      setCurrentUser(data.user);
      setUsername("");
      setPassword("");
    } catch (err: any) {
      setAuthError(err.message || "Failed authentication checks.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !fullName || !role) return;
    setAuthError("");
    setAuthLoading(true);

    try {
      const data = await api.register({
        username,
        password,
        fullName,
        role,
        jobTitle: jobTitle || (role === "admin" ? "VP of Training" : role === "manager" ? "Plant Manager" : "Continuous Casting Specialist"),
        department: department || (role === "admin" ? "L&D Head" : role === "manager" ? "Blast Furnace Division" : "SMS Shop 2")
      });
      localStorage.setItem("sarathi_token", data.token);
      setCurrentUser(data.user);
      setUsername("");
      setPassword("");
      setFullName("");
      setJobTitle("");
      setDepartment("");
    } catch (err: any) {
      setAuthError(err.message || "Conflict registering credentials.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const actualJob = obJob || (currentUser.role === "admin" ? "VP of Quality Control" : currentUser.role === "manager" ? "Furnace Manager" : "Continuous Casting Specialist");
      const actualDept = obDept || (currentUser.role === "admin" ? "Management SMS" : currentUser.role === "manager" ? "Iron Making" : "Steel Melting Shop 2");

      const data = await api.onboard({
        priorExperienceYrs: obExp,
        specialties: obSpecialties,
        certificationCompleted: obCerts,
        jobTitle: actualJob,
        department: actualDept
      });
      localStorage.setItem("sarathi_token", data.token);
      setCurrentUser(data.user);
    } catch (err) {
      alert("Failed storing onboarding data.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("sarathi_token");
    setCurrentUser(null);
  };

  // Instant presentation switch using real pre-seeded REST authentication!
  const switchSessionToMock = async (targetRole: "admin" | "manager" | "employee") => {
    setAuthLoading(true);
    try {
      const username = targetRole;
      const pw = `${targetRole}123`;
      const data = await api.login(username, pw);
      localStorage.setItem("sarathi_token", data.token);
      setCurrentUser(data.user);
      // Increment state trigger to reload dashboards
      setStateNonce(prev => prev + 1);
    } catch (e) {
      alert(`Could not authenticate pre-seeded account: ${targetRole}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const toggleSpecialtySelection = (spec: string) => {
    setObSpecialties(prev => 
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    );
  };

  const toggleCertSelection = (cert: string) => {
    setObCerts(prev => 
      prev.includes(cert) ? prev.filter(c => c !== cert) : [...prev, cert]
    );
  };

  if (!appInitialized) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex flex-col justify-center items-center text-slate-600 space-y-4">
        <Clock className="w-10 h-10 animate-spin text-[#0284C7]" />
        <span className="font-mono text-xs tracking-widest font-bold text-slate-500">LAUNCHING SARATHI AI METRICS GATEWAY...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] font-sans text-slate-950 selection:bg-[#38BDF8] selection:text-slate-900">
      
      {/* HEADER COCKPIT AREA */}
      <header className="bg-[#0F172A] border-b border-slate-800 sticky top-0 z-40">
        
        {/* PRESENTATION REVIEW ACCELERATOR STRIP */}
        <div className="bg-slate-900/80 border-b border-slate-800 text-slate-300 py-2 px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[#38BDF8]">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span className="font-bold tracking-tight">Enterprise Reviewer Deck:</span>
            <span className="opacity-90 text-[11px] text-slate-400">Switch mock accounts to sync and test role dashboards seamlessly.</span>
          </div>
          <div className="flex gap-2">
            {[
              { role: "employee" as const, name: "Crew (Rajesh)", style: "bg-slate-800/80 text-sky-400 hover:bg-[#0284C7] hover:text-white border border-slate-700" },
              { role: "manager" as const, name: "Manager (Amitabh)", style: "bg-slate-800/80 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-slate-700" },
              { role: "admin" as const, name: "L&D Admin (Siddharth)", style: "bg-slate-800/80 text-purple-400 hover:bg-purple-605 hover:text-white border border-slate-700" }
            ].map((switcher) => (
              <button
                key={switcher.role}
                disabled={authLoading}
                onClick={() => switchSessionToMock(switcher.role)}
                className={`font-mono font-bold text-[10px] tracking-wide rounded px-3 py-1.5 transition-all cursor-pointer ${switcher.style} ${
                  currentUser && currentUser.username === switcher.role ? "ring-2 ring-[#38BDF8] font-extrabold bg-[#0284C7]! text-white!" : "opacity-90"
                }`}
              >
                {switcher.name}
              </button>
            ))}
          </div>
        </div>

        {/* FACTORY COCKPIT MAIN RAIL */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 danger-glow bg-[#38BDF8] flex items-center justify-center rounded-lg border border-[#38BDF8]/60 shadow-[#38BDF8]/20 shadow-md">
              <Network className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-black text-[#38BDF8] tracking-tighter leading-none">SARATHI AI</h1>
                <span className="text-[9px] font-mono font-medium tracking-widest text-[#38BDF8] border border-sky-400/25 bg-[#38BDF8]/10 px-2 py-0.5 rounded leading-none">V2.4</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 tracking-widest uppercase leading-none block mt-1">Workforce Intelligence</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <span className="text-xs font-sans font-semibold text-white block leading-tight">{currentUser.fullName}</span>
                  <span className="text-[10px] font-mono font-medium text-emerald-400 block uppercase tracking-wider">{currentUser.role} dashboard</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-455 rounded-md border border-slate-800 transition-colors"
                  title="Disconnect session"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                </button>
              </div>
            ) : (
              <div className="text-xs font-mono text-slate-500 uppercase tracking-widest hidden sm:block">
                SYSTEM STANDBY • OFF-GRID
              </div>
            )}
          </div>
        </div>
      </header>

      {/* WORKSPACE OPERATIONS MAIN FRAME CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {!currentUser ? (
          /* AUTH LOGIN SCREEN */
          <div className="max-w-md mx-auto bg-white border border-slate-200 p-6 rounded-lg space-y-6 mt-8 shadow-sm">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 bg-sky-50 text-sky-650 border border-sky-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Brain className="w-6 h-6 text-[#0284C7]" />
              </div>
              <h2 className="text-xl font-sans font-extrabold text-slate-900 tracking-tight">Security Gateway Terminal</h2>
              <p className="text-xs text-slate-500 font-sans px-3">Access Sarathi AI analytics nodes, safety training decks, and plant relationship graphs.</p>
            </div>

            {authError && (
              <div className="bg-rose-50 border-l-2 border-rose-500 text-rose-800 p-3 rounded text-xs flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={authView === "login" ? handleLogin : handleRegister} className="space-y-4">
              {authView === "register" && (
                <>
                  <div>
                    <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mt-1 block">Plant Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajesh Kumar"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs px-3 py-2.5 rounded focus:outline-none focus:border-sky-500 mt-1.5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-mono text-slate-500 block mt-1">Job Designation</label>
                      <input
                        type="text"
                        placeholder="Caster Operator"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs px-3 py-2.5 rounded focus:outline-none mt-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-mono text-slate-500 block mt-1">Department</label>
                      <input
                        type="text"
                        placeholder="SMS Shop 2"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs px-3 py-2.5 rounded focus:outline-none mt-1.5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mt-1 block">Account Privilege</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs py-2.5 px-3 rounded mt-1.5 focus:outline-none"
                    >
                      <option value="employee">Field Crew Specialist (Employee)</option>
                      <option value="manager">Furnace Supervisor (Manager)</option>
                      <option value="admin">Talent & L&D Admin (VP/Director)</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mt-1 block">Operator Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. employee"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs px-3 py-2.5 rounded focus:outline-none focus:border-sky-500 mt-1.5"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mt-1 block">Terminal Password</label>
                <input
                  type="password"
                  required
                  placeholder="Terminal credentials"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs px-3 py-2.5 rounded focus:outline-none focus:border-sky-500 mt-1.5"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-[#0284C7] hover:bg-[#0369A1] disabled:opacity-50 text-white font-sans font-bold py-2.5 text-xs rounded transition-colors uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                {authLoading ? (
                  <Clock className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Compile Session Access</span>
                  </>
                )}
              </button>

            </form>

            <div className="text-center pt-2">
              <button
                onClick={() => setAuthView(authView === "login" ? "register" : "login")}
                className="text-[#0284C7] hover:text-[#0369A1] font-mono text-[10px] uppercase tracking-wide cursor-pointer font-bold"
              >
                {authView === "login" ? "Create new plant specialist profile" : "Return to security terminal signature"}
              </button>
            </div>
          </div>
        ) : !currentUser.profileCompleted ? (
          /* ONBOARDING FLOW PIPELINE SCREEN */
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 p-6 rounded-lg space-y-6 shadow-sm">
            <div className="border-b border-slate-150 pb-3">
              <h2 className="text-lg font-sans font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5.5 h-5.5 text-[#0284C7]" />
                Specialist Onboarding Profile completion
              </h2>
              <p className="text-xs text-slate-500 mt-1">Before entering work panels, the plant compliance standard requires registering your experience level and pre-existing core skills to seed initial ratings.</p>
            </div>

            <form onSubmit={handleOnboardingSubmit} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-[10px] text-slate-500 block uppercase">Industrial Title Designation:</label>
                  <input
                    type="text"
                    required
                    value={obJob}
                    onChange={(e) => setObJob(e.target.value)}
                    placeholder="Continuous Casting Specialist"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded mt-1.5 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] text-slate-500 block uppercase">Department / Section:</label>
                  <input
                    type="text"
                    required
                    value={obDept}
                    onChange={(e) => setObDept(e.target.value)}
                    placeholder="Steel Melting Shop 2"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded mt-1.5 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-mono text-[10px] text-slate-500 block uppercase">Prior Plant Experience (Years):</label>
                <div className="flex items-center gap-3 mt-1.5">
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={obExp}
                    onChange={(e) => setObExp(Number(e.target.value))}
                    className="flex-1 accent-[#0284C7] bg-slate-200 h-2 rounded"
                  />
                  <span className="font-mono text-slate-800 bg-slate-50 border border-slate-200 px-3 py-1 font-bold text-xs rounded">{obExp} Years</span>
                </div>
              </div>

              {/* Checkboxes parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-slate-500 block uppercase">Select active specialties:</label>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded space-y-2 max-h-36 overflow-y-auto">
                    {[
                      "Ladle Metallurgy",
                      "Gas Purging Diagnostics",
                      "Tundish Flow Controls",
                      "SCADA Interlocking",
                      "Secondary Cooling",
                      "Mechanical Alignment"
                    ].map((spec) => (
                      <button
                        type="button"
                        key={spec}
                        onClick={() => toggleSpecialtySelection(spec)}
                        className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between border ${
                          obSpecialties.includes(spec) 
                            ? "bg-sky-50 border-sky-400 text-[#0284C7] font-semibold" 
                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <span>{spec}</span>
                        {obSpecialties.includes(spec) && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-slate-500 block uppercase">Previously completed certifications:</label>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded space-y-2 max-h-36 overflow-y-auto">
                    {[
                      "Plant Safety Level I",
                      "HAZOP Operations basic",
                      "Mechanical calibration basics",
                      "Level-2 automation certification"
                    ].map((cert) => (
                      <button
                        type="button"
                        key={cert}
                        onClick={() => toggleCertSelection(cert)}
                        className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between border ${
                          obCerts.includes(cert) 
                            ? "bg-sky-50 border-sky-400 text-[#0284C7] font-semibold" 
                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <span>{cert}</span>
                        {obCerts.includes(cert) && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              <button
                type="submit"
                className="w-full mt-4 bg-[#0284C7] hover:bg-[#0369A1] text-white font-sans font-bold py-2.5 text-xs rounded transition-colors uppercase tracking-wider"
              >
                Sign & Finalize Compliance Record
              </button>
            </form>
          </div>
        ) : (
          /* WORKSPACE ACTIVE STATUS AND MAIN VIEWS SWITCHER BOARD */
          <div className="space-y-6">
            
            {/* Quick alert indicator block (Plant state telemetry indicator) */}
            <div className="bg-white border border-slate-200 p-3 rounded flex items-center justify-between text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping font-mono"></span>
                <span className="font-mono text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Plant Telemetry: Active</span>
                <span className="text-slate-600 font-sans hidden md:inline">SMS-2 control network operational. Carbon Monoxide levels 5ppm (Secure).</span>
              </div>
              <span className="font-mono text-[9px] text-slate-400 select-none">UTC SYNC CALIBRATION GREEN</span>
            </div>

            {/* DASHBOARD ROUTER BASE ON PRIVILEGES */}
            {currentUser.role === "admin" ? (
              <DashboardAdmin lang={lang} userProfile={currentUser} onRefreshState={() => setStateNonce(prev => prev + 1)} />
            ) : currentUser.role === "manager" ? (
              <DashboardManager lang={lang} userProfile={currentUser} />
            ) : (
              <DashboardEmployee lang={lang} userProfile={currentUser} onRefreshState={() => setStateNonce(prev => prev + 1)} />
            )}

          </div>
        )}

        {/* BILINGUAL LANGUAGE SWITCHER TOGGLE AT THE BOTTOM OF DASHBOARD */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h4 id="language-switcher-label" className="text-xs font-bold text-slate-700 tracking-tight">
                {lang === "hi" ? "भाषा बदलें / Change Language" : "Change System Language / भाषा बदलें"}
              </h4>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {t.currentLangPrefix} <span className="font-bold text-sky-600 uppercase font-mono">{lang === "hi" ? "हिन्दी (सरल)" : "English (Simple)"}</span>
              </p>
              <div className="flex items-center gap-1.5 mt-2 justify-center sm:justify-start">
                <span className={`w-2 h-2 rounded-full ${firebaseConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></span>
                <span className="text-[9px] font-sans font-bold tracking-wider text-slate-400 uppercase">
                  {firebaseConnected ? (lang === "hi" ? "फ़ायरबेस क्लाउड: जुड़ा हुआ है" : "Firebase Cloud: Synchronized") : "Offline Backup Profile"}
                </span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                id="toggle-lang-en"
                type="button"
                onClick={() => setLang("en")}
                className={`px-3 py-2 rounded text-xs font-bold font-sans transition-all cursor-pointer ${
                  lang === "en"
                    ? "bg-[#0284C7] text-white shadow-sm font-extrabold"
                    : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t.englishBtn}
              </button>
              <button
                id="toggle-lang-hi"
                type="button"
                onClick={() => setLang("hi")}
                className={`px-3 py-2 rounded text-xs font-bold font-sans transition-all cursor-pointer ${
                  lang === "hi"
                    ? "bg-emerald-600 text-white shadow-sm font-extrabold"
                    : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t.hindiBtn}
              </button>
            </div>
          </div>
        </div>

      </main>

    </div>
  );
}

// User checking utility
interface UserCheckType {
  id: string;
}
