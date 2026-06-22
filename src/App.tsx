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

export function SarathiLogo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sarathiGrad" x1="15%" y1="15%" x2="85%" y2="85%">
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="50%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
      
      {/* S shape upper loop + face contour profile */}
      <path
        d="M62,28 C62,28 62.5,23.5 54,21.5 C43.5,19 32,25.5 31,37 C30.5,43 32,48.5 35.5,51 C39,53.5 38.5,55 35,55 C34.5,52 35.5,50 36.5,48.5 C34.4,46.5 35.5,44.5 37.5,44.5 C36.5,42.5 37,40.5 39,40.5 C37,38.5 38.5,36.5 41.5,36.5 C43,36.5 45.5,37.5 48.5,39 C55,42 63.5,34.5 62,28 Z"
        fill="url(#sarathiGrad)"
      />
      
      {/* S shape bottom loop + arrow */}
      <path
        d="M31,64 C42,64 54,58 64,48 C66,46 67,43 68,41 C67,43 65,47 62,50 C51,59 38,64 29,64 Z"
        fill="url(#sarathiGrad)"
        opacity="0.85"
      />
      <path
        d="M29,64 C42,56 55,42 66,28 L58,26 L73,23 L71,37 L65,31 C55,44 41,57 29,64 Z"
        fill="url(#sarathiGrad)"
      />

      {/* Circuit lines */}
      <line x1="56" y1="34" x2="74" y2="34" stroke="#0284C7" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="58" y1="39" x2="70" y2="39" stroke="#0284C7" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="56" y1="44" x2="77" y2="44" stroke="#0369A1" strokeWidth="1.5" strokeLinecap="round" />

      {/* Circle terminals */}
      <circle cx="74" cy="34" r="1.5" fill="#38BDF8" stroke="#1E40AF" strokeWidth="0.5" />
      <circle cx="70" cy="39" r="1.5" fill="#38BDF8" stroke="#1E40AF" strokeWidth="0.5" />
      <circle cx="77" cy="44" r="1.5" fill="#38BDF8" stroke="#1E40AF" strokeWidth="0.5" />
    </svg>
  );
}

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

  // New Competency Dictionary and Assessment Engine states
  const [onboardingStep, setOnboardingStep] = useState<"profile" | "test">("profile");
  const [obRoles, setObRoles] = useState<any[]>([]);
  const [onboardQuestions, setOnboardQuestions] = useState<any[]>([]);
  const [obAnswers, setObAnswers] = useState<{ [qId: string]: number }>({});
  const [testScore, setTestScore] = useState<number | null>(null);
  const [testGrades, setTestGrades] = useState<any[]>([]);
  const [selectedObRoleId, setSelectedObRoleId] = useState("");

  useEffect(() => {
    if (currentUser && !currentUser.profileCompleted) {
      api.getRoles()
        .then(roles => {
          setObRoles(roles);
          if (roles.length > 0) {
            setSelectedObRoleId(roles[0].id);
            setObJob(roles[0].roleName);
          }
        })
        .catch(e => console.error("Failed to load roles", e));

      api.getOnboardingQuestions()
        .then(qs => {
          setOnboardQuestions(qs);
        })
        .catch(e => console.error("Failed to load onboarding questions", e));
    }
  }, [currentUser]);

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
        department: actualDept,
        role: currentUser.role // maintain same role
      });
      localStorage.setItem("sarathi_token", data.token);
      setCurrentUser(data.user);
      if (data.user.profileCompleted) {
        setOnboardingStep("profile");
      } else {
        setOnboardingStep("test");
      }
    } catch (err) {
      alert("Failed storing onboarding data.");
    }
  };

  const handleOnboardingTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const data = await api.submitOnboardingAnswers(obAnswers);
      localStorage.setItem("sarathi_token", data.token);
      setTestScore(data.score);
      setTestGrades(data.graded);
      // Wait a moment or let them proceed by updating currentUser
      setCurrentUser(data.user);
      // Set step back to profile for future registrations
      setOnboardingStep("profile");
    } catch (err: any) {
      alert(err.message || "Failed to grade dynamic registration-test assessments.");
    } finally {
      setAuthLoading(false);
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
              { role: "admin" as const, name: "Leadership (Siddharth)", style: "bg-slate-800/80 text-purple-400 hover:bg-purple-600 hover:text-white border border-slate-700" }
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
            <div className="w-10 h-10 bg-white flex items-center justify-center rounded-xl border border-slate-200/20 shadow-sky-500/10 shadow-lg shrink-0">
              <SarathiLogo className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-black text-[#50e4ff] tracking-tighter leading-none flex items-center gap-1">
                  <span>sarathi</span>
                  <span className="text-[#38BDF8]">ai</span>
                </h1>
              </div>
              <span className="text-[10px] font-mono text-slate-400 tracking-widest uppercase leading-none block mt-1.5">Workforce Intelligence</span>
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
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-sky-500/5 border border-slate-100">
                <SarathiLogo className="w-16 h-16" />
              </div>
              <h2 className="text-xl font-sans font-extrabold text-slate-900 tracking-tight">Welcome to Sarathi AI</h2>
              <p className="text-xs text-slate-500 font-sans px-3">Develop People. Preserve Knowledge. Measure Capability.</p>
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
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Leadership</option>
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
                    <span>{authView === "login" ? "Login" : "Register"}</span>
                  </>
                )}
              </button>

            </form>

            <div className="text-center pt-2">
              <button
                onClick={() => setAuthView(authView === "login" ? "register" : "login")}
                className="text-[#0284C7] hover:text-[#0369A1] font-mono text-[10px] uppercase tracking-wide cursor-pointer font-bold"
              >
                {authView === "login" ? "New user? Register Now." : "Return to Home Page"}
              </button>
            </div>
          </div>
        ) : !currentUser.profileCompleted ? (
          /* ONBOARDING FLOW PIPELINE SCREEN with STEP-1 Profile & STEP-2 Assessment */
          onboardingStep === "profile" ? (
            <div className="max-w-2xl mx-auto bg-white border border-slate-200 p-6 rounded-lg space-y-6 shadow-sm">
              <div className="border-b border-slate-150 pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-sans font-bold text-slate-900 flex items-center gap-2">
                    <UserCheck className="w-5.5 h-5.5 text-[#0284C7]" />
                    {currentUser?.role === "admin" ? "Leadership Onboarding Profile" : "Specialist Onboarding Profile (Step 1 of 2)"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Before entering work panels, register your industrial division and experienced specialties.
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[10px] text-slate-400 block uppercase">Language (भाषा)</span>
                  <button
                    onClick={() => setLang(lang === "en" ? "hi" : "en")}
                    className="mt-1 font-mono text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded font-bold border border-slate-200"
                  >
                    {lang === "en" ? "हिन्दी (Hindi)" : "English"}
                  </button>
                </div>
              </div>

              <form onSubmit={handleOnboardingSubmit} className="space-y-4 text-xs">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-[10px] text-slate-500 block uppercase">Industrial Role Designation (पद):</label>
                    <select
                      value={selectedObRoleId}
                      onChange={(e) => {
                        setSelectedObRoleId(e.target.value);
                        const found = obRoles.find(r => r.id === e.target.value);
                        if (found) {
                          setObJob(found.roleName);
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2.5 rounded mt-1.5 focus:outline-none focus:border-sky-500"
                    >
                      <option value="">-- Custom / Other role --</option>
                      {obRoles.map(r => (
                        <option key={r.id} value={r.id}>{r.roleName}</option>
                      ))}
                    </select>

                    <input
                      type="text"
                      required
                      value={obJob}
                      onChange={(e) => setObJob(e.target.value)}
                      placeholder="e.g. Continuous Casting Specialist"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded mt-2 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-slate-500 block uppercase">Department / Section (विभाग):</label>
                    <input
                      type="text"
                      required
                      value={obDept}
                      onChange={(e) => setObDept(e.target.value)}
                      placeholder="Steel Melting Shop 2"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2.5 rounded mt-1.5 focus:outline-none focus:border-sky-500"
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
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded space-y-2 max-h-36 overflow-y-auto w-full">
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
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded space-y-2 max-h-36 overflow-y-auto w-full">
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
                  className="w-full mt-4 bg-[#0284C7] hover:bg-[#0369A1] text-white font-sans font-bold py-2.5 text-xs rounded transition-colors uppercase tracking-wider cursor-pointer"
                >
                  {currentUser?.role === "admin" ? "Save Profile & Enter Dashboard ➔" : "Save Profile & Proceed to Onboarding Assessment ➔"}
                </button>
              </form>
            </div>
          ) : (
            /* DYNAMIC BILINGUAL ASSESSMENT SYSTEM (STEP 2) */
            <div className="max-w-2xl mx-auto bg-white border border-slate-200 p-6 rounded-lg space-y-6 shadow-sm">
              <div className="border-b border-slate-150 pb-3 flex justify-between items-center">
                <div>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                    Compliance Stage II
                  </span>
                  <h2 className="text-lg font-sans font-black text-slate-900 mt-2 flex items-center gap-2">
                    <Brain className="w-5.5 h-5.5 text-[#0284C7]" />
                    Skill & Safety Verification (कौशल एवं सुरक्षा मूल्यांकन)
                  </h2>
                </div>
                <div>
                  <button
                    onClick={() => setLang(lang === "en" ? "hi" : "en")}
                    className="font-mono text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded font-bold border border-slate-200"
                  >
                    {lang === "en" ? "हिन्दी (Hindi)" : "English"}
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded border border-slate-150 text-slate-600 text-xs leading-relaxed">
                <span className="font-bold block text-slate-800 mb-1">Onboarding Competency Evaluation:</span>
                This test assesses technical skills, soft competencies, digital aptitude, and plant-level security. 
                Answer below in simple Hindi or easy English as preferred. Passing seeds your verified skills!
              </div>

              <form onSubmit={handleOnboardingTestSubmit} className="space-y-6">
                {onboardQuestions.map((q, idx) => {
                  const hasHindi = !!q.questionTextHindi;
                  const displayHindi = lang === "hi" && hasHindi;
                  const qText = displayHindi ? q.questionTextHindi : q.questionText;
                  const opts = displayHindi ? (q.optionsHindi || q.options) : q.options;

                  return (
                    <div key={q.id} className="border border-slate-150 p-4 rounded-lg space-y-3 bg-white hover:border-slate-300 transition-colors">
                      <div className="flex items-start gap-2.5">
                        <span className="font-mono text-[10px] text-slate-500 font-bold bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded mt-0.5">
                          Q{idx + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-slate-800 leading-snug">{qText}</p>
                          {hasHindi && lang === "en" && (
                            <p className="text-[10px] text-slate-400 mt-0.5 mt-1 font-medium">{q.questionTextHindi}</p>
                          )}
                          {hasHindi && lang === "hi" && (
                            <p className="text-[10px] text-slate-400 mt-0.5 mt-1 font-medium">({q.questionText})</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 pl-9">
                        {opts.map((opt: string, optIdx: number) => {
                          const isSelected = obAnswers[q.id] === optIdx;
                          return (
                            <button
                              type="button"
                              key={optIdx}
                              onClick={() => setObAnswers(prev => ({ ...prev, [q.id]: optIdx }))}
                              className={`w-full text-left p-2.5 rounded text-[11px] border transition-all flex items-center justify-between cursor-pointer ${
                                isSelected 
                                  ? "bg-sky-50 border-sky-400 text-[#0284C7] font-semibold" 
                                  : "bg-white border-slate-180 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              <span>{opt}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#0284C7]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <div className="bg-sky-50 border border-sky-100 p-3.5 rounded text-slate-700 text-xs leading-relaxed flex gap-2">
                  <Info className="w-5 h-5 flex-shrink-0 text-sky-600 mt-0.5" />
                  <div>
                    <strong className="block font-bold mb-0.5">Assessment Grading Metric:</strong>
                    Correct answers grant **Level 4 (Advanced)** in corresponding Skill models. Incorrect options grant **Level 2 (Basic)** to trigger learning paths. We will improve on future assessments!
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setOnboardingStep("profile")}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded text-xs font-bold hover:bg-slate-50 uppercase tracking-wider cursor-pointer"
                  >
                    Back (पीछे जाएं)
                  </button>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="flex-grow bg-[#0284C7] hover:bg-[#0369A1] disabled:opacity-50 text-white font-sans font-bold py-2.5 text-xs rounded transition-colors uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    {authLoading ? (
                      <Clock className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <>
                        <Award className="w-4.5 h-4.5" />
                        <span>
                          {lang === "en" 
                            ? `Submit (${Object.keys(obAnswers).length}/${onboardQuestions.length} Answered)` 
                            : `सबमिट करें (${Object.keys(obAnswers).length}/${onboardQuestions.length} उत्तरित)`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )
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
