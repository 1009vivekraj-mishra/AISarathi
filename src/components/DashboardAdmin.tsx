import React, { useState, useEffect } from "react";
import { Plus, Award, AlertTriangle, FileText, Upload, Sparkles, PlusCircle } from "lucide-react";
import { api } from "../api.js";
import { translations } from "../translations.js";

export default function DashboardAdmin({ lang = "en", userProfile, onRefreshState }: { 
  lang?: "en" | "hi";
  userProfile: any; 
  onRefreshState: () => void; 
}) {
  const t = translations[lang];
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [activeSubPage, setActiveSubPage] = useState<"hawkeye" | "retirement" | "skills" | "assessments" | "library" | "mappings">("hawkeye");
  const [retirementModalOpen, setRetirementModalOpen] = useState(false);
  
  // HawkEye & Retirement Central States
  const [hawkeyeData, setHawkeyeData] = useState<any>(null);
  const [heLoading, setHeLoading] = useState(false);
  const [modulesList, setModulesList] = useState<any[]>([]);

  // Connect Feedback intervention states
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectTarget, setConnectTarget] = useState<{ type: string; id: string; name: string } | null>(null);
  const [connectMsg, setConnectMsg] = useState("");
  const [connectType, setConnectType] = useState<"talk" | "assign" | "ask">("talk");
  const [connectSelectedModule, setConnectSelectedModule] = useState("");
  const [connectSuccess, setConnectSuccess] = useState("");

  // Retirement Wisdom Questionnaire authoring states
  const [activeRetiree, setActiveRetiree] = useState<any>(null);
  const [wisdomAssessTitle, setWisdomAssessTitle] = useState("");
  const [wisdomQuestions, setWisdomQuestions] = useState<any[]>([
    {
      questionText: "What represents the most critical safety precaution you would mandate for this position?",
      options: [
        "Wear dual-layer insulated aluminized fire-retardant suits",
        "Verify dual-sensor nitrogen gas purge pressure gauges",
        "Confirm mechanical shear pins are secondary locked with cotter pins",
        "Engage standard lockout-tagout on the breaker floor"
      ],
      correctAnswerIdx: 0,
      points: 20
    },
    {
      questionText: "Which operating anomaly requires immediate emergency sequence shutdown?",
      options: [
        "Uncontrolled slag metal breakthrough alert below the mold",
        "Minor hydraulic pressure drop under 5%",
        "Regular periodic maintenance signal sound",
        "Air purger flow rate toggle fluctuation"
      ],
      correctAnswerIdx: 0,
      points: 20
    }
  ]);
  const [wisdomSuccess, setWisdomSuccess] = useState("");

  // Create Competency State
  const [compCode, setCompCode] = useState("");
  const [compName, setCompName] = useState("");
  const [compDesc, setCompDesc] = useState("");
  const [compCrit, setCompCrit] = useState("high");
  const [compCat, setCompCat] = useState("Safety");
  const [compReqLvl, setCompReqLvl] = useState(3);
  const [compSuccess, setCompSuccess] = useState("");

  // Create Assessment State
  const [assessTitle, setAssessTitle] = useState("");
  const [assessRole, setAssessRole] = useState("Continuous Casting Specialist");
  const [assessQuestions, setAssessQuestions] = useState<any[]>([
    { questionText: "", options: ["", "", "", ""], correctAnswerIdx: 0, points: 20, competencyId: "" }
  ]);
  const [assessSuccess, setAssessSuccess] = useState("");

  // Create SOP Document state
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState("sop");
  const [docContent, setDocContent] = useState("");
  const [docCompId, setDocCompId] = useState("");
  const [docTagsString, setDocTagsString] = useState("");
  const [docSuccess, setDocSuccess] = useState("");

  // Roles & Skill Maps Configuration states
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [selectedRoleForMapping, setSelectedRoleForMapping] = useState<any | null>(null);
  const [selectedCompsForRole, setSelectedCompsForRole] = useState<{ [compId: string]: number }>({});
  const [newRoleName, setNewRoleName] = useState("");

  const loadHawkEyeData = async () => {
    setHeLoading(true);
    try {
      const data = await api.getLDHawkEye();
      setHawkeyeData(data);
      const mods = await api.getLearningPaths();
      setModulesList(mods);
    } catch (e) {
      console.error("Failed to load HawkEye central data", e);
    } finally {
      setHeLoading(false);
    }
  };

  const loadRolesData = async () => {
    try {
      const list = await api.getRoles();
      setRolesList(list);
    } catch (e) {
      console.error("Failed to load roles in admin:", e);
    }
  };

  const loadAdminData = async () => {
    try {
      const list = await api.getCompetencies();
      setCompetencies(list);
      await loadRolesData();
    } catch (e) {
      console.error("Failed to load admin competencies:", e);
    }
  };

  useEffect(() => {
    loadAdminData();
    loadHawkEyeData();
  }, [userProfile]);

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectTarget || !connectMsg) return;
    try {
      await api.postLDConnect({
        targetType: connectTarget.type as any,
        targetId: connectTarget.id,
        message: connectMsg,
        type: connectType,
        assignedModuleId: connectType === "assign" ? connectSelectedModule : undefined
      });
      setConnectSuccess("✓ Intervention and feedback sent successfully to employees!");
      setConnectMsg("");
      setConnectSelectedModule("");
      setTimeout(() => {
        setConnectSuccess("");
        setConnectModalOpen(false);
      }, 3500);
    } catch (err: any) {
      alert(err.message || "Could not register connect action.");
    }
  };

  const handleWisdomAssessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRetiree || !wisdomAssessTitle) return;
    try {
      await api.postLDRetirementAssess({
        retireeId: activeRetiree.id,
        assessmentTitle: wisdomAssessTitle,
        questions: wisdomQuestions
      });
      setWisdomSuccess(`✓ Custom Legacy Capture assessment created and assigned to ${activeRetiree.fullName}!`);
      setTimeout(() => {
        setWisdomSuccess("");
        setRetirementModalOpen(false);
      }, 3500);
      loadHawkEyeData();
    } catch (err: any) {
      alert(err.message || "Failed to create legacy wisdom assessment.");
    }
  };

  const handleCreateCompetency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compCode || !compName || !compDesc) return;

    try {
      await api.createCompetency({
        code: compCode,
        name: compName,
        description: compDesc,
        criticality: compCrit,
        category: compCat,
        requiredLevel: Number(compReqLvl)
      });
      setCompSuccess("Core Competency declared. Automatically wired inside Graph topology!");
      setCompCode("");
      setCompName("");
      setCompDesc("");
      loadAdminData();
      onRefreshState();
      setTimeout(() => setCompSuccess(""), 4000);
    } catch (err) {
      alert("Registration failed");
    }
  };

  // Assessment dynamic questions handling
  const handleAddQuestionSlot = () => {
    setAssessQuestions(prev => [
      ...prev,
      { questionText: "", options: ["", "", "", ""], correctAnswerIdx: 0, points: 20, competencyId: "" }
    ]);
  };

  const handleModifyQuestion = (qIdx: number, field: string, val: any) => {
    setAssessQuestions(prev => {
      const updated = [...prev];
      updated[qIdx] = { ...updated[qIdx], [field]: val };
      return updated;
    });
  };

  const handleModifyOption = (qIdx: number, optIdx: number, val: string) => {
    setAssessQuestions(prev => {
      const updated = [...prev];
      const optCopy = [...updated[qIdx].options];
      optCopy[optIdx] = val;
      updated[qIdx] = { ...updated[qIdx], options: optCopy };
      return updated;
    });
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessTitle || assessQuestions.some(q => !q.questionText)) {
      alert("Enter title and populate all question prompts.");
      return;
    }

    try {
      await api.createAssessment({
        title: assessTitle,
        roleTarget: assessRole,
        questions: assessQuestions
      });
      setAssessSuccess("New examination modules created. Active for all trainees.");
      setAssessTitle("");
      setAssessQuestions([{ questionText: "", options: ["", "", "", ""], correctAnswerIdx: 0, points: 20, competencyId: "" }]);
      onRefreshState();
      setTimeout(() => setAssessSuccess(""), 4000);
    } catch (err) {
      alert("Error building assessment");
    }
  };

  const handleUploadSOP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle || !docContent) return;

    try {
      await api.uploadDoc({
        title: docTitle,
        type: docType,
        content: docContent,
        competencyId: docCompId || undefined,
        tags: docTagsString.split(",").map(t => t.trim()).filter(Boolean)
      });
      setDocSuccess("SOP uploaded. Gemini Model automatically vectorized content for active RAG searches!");
      setDocTitle("");
      setDocContent("");
      setDocCompId("");
      setDocTagsString("");
      onRefreshState();
      setTimeout(() => setDocSuccess(""), 5500);
    } catch (err) {
      alert("Failed loading document into vector db.");
    }
  };

  const [seedLoading, setSeedLoading] = useState(false);
  const [seedResult, setSeedResult] = useState("");

  const handleAutoSeedSOPs = async () => {
    setSeedLoading(true);
    setSeedResult("");
    try {
      const res = await api.seedDocuments();
      setSeedResult(res.message);
      onRefreshState();
      setTimeout(() => setSeedResult(""), 10000);
    } catch (err: any) {
      alert(err.message || "Failed auto-seeding core library");
    } finally {
      setSeedLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* VP & Director of L&D Portal Heading */}
      <div className="bg-[#0F172A] rounded-xl border border-slate-800 p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-[9px] font-mono font-extrabold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded">
              L&D Command Center
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-white mt-1.5 sm:text-2xl">
            Leadership Dashboard
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1">
            Configure dynamic baseline competency criteria, build multi-question certifications, index standard operating procedures with Gemini RAG, and define baseline role matrices.
          </p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-right">
          <span className="text-[10px] font-mono text-slate-400 block uppercase">PRIVILEGE MODE</span>
          <span className="text-xs font-bold font-sans text-purple-400 block mt-0.5">Enterprise Admin & Planner</span>
        </div>
      </div>

      {/* SUB-PAGES ATTACHED / NAVIGATION TABS */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-px">
        <button
          type="button"
          onClick={() => {
            setActiveSubPage("hawkeye");
            loadHawkEyeData();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold font-sans border-b-2 transition-all cursor-pointer ${
            activeSubPage === "hawkeye"
              ? "border-purple-600 text-purple-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          <Sparkles className={`w-4 h-4 ${activeSubPage === "hawkeye" ? "text-purple-600" : "text-slate-400"}`} />
          <span>{lang === "hi" ? "हॉकआई एनालिटिक्स" : "HawkEye Analytics Hub"}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveSubPage("retirement");
            loadHawkEyeData();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold font-sans border-b-2 transition-all cursor-pointer ${
            activeSubPage === "retirement"
              ? "border-purple-600 text-purple-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          <AlertTriangle className={`w-4 h-4 ${activeSubPage === "retirement" ? "text-purple-600" : "text-slate-400"}`} />
          <span>{lang === "hi" ? "सेवानिवृत्ति भंडार" : "Retirement Repository"}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubPage("skills")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold font-sans border-b-2 transition-all cursor-pointer ${
            activeSubPage === "skills"
              ? "border-purple-600 text-purple-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          <Award className={`w-4 h-4 ${activeSubPage === "skills" ? "text-purple-600" : "text-slate-400"}`} />
          <span>{lang === "hi" ? "कार्य कौशल निर्देशिका" : "Skills & Competencies Directory"}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubPage("assessments")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold font-sans border-b-2 transition-all cursor-pointer ${
            activeSubPage === "assessments"
              ? "border-purple-600 text-purple-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          <PlusCircle className={`w-4 h-4 ${activeSubPage === "assessments" ? "text-purple-600" : "text-slate-400"}`} />
          <span>{lang === "hi" ? "परीक्षा संकलक मॉड्यूल" : "Examinations Compiler"}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubPage("library")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold font-sans border-b-2 transition-all cursor-pointer ${
            activeSubPage === "library"
              ? "border-purple-600 text-purple-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          <FileText className={`w-4 h-4 ${activeSubPage === "library" ? "text-purple-600" : "text-slate-400"}`} />
          <span>{lang === "hi" ? "मानक संचलन प्रक्रिया" : "SOP & Knowledge Library"}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubPage("mappings")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold font-sans border-b-2 transition-all cursor-pointer ${
            activeSubPage === "mappings"
              ? "border-purple-600 text-purple-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          <Award className={`w-4 h-4 ${activeSubPage === "mappings" ? "text-purple-600" : "text-slate-400"}`} />
          <span>{lang === "hi" ? "भूमिका योग्यता मैट्रिक्स" : "Role Matrix Planner"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6">
        
        {/* Competencies Declarator form (Left column) */}
        <div className={`lg:col-span-5 space-y-6 ${activeSubPage === "skills" ? "" : "hidden"}`}>
        
        <form onSubmit={handleCreateCompetency} className="bg-white border border-slate-200 p-5 rounded-lg space-y-4 shadow-sm">
          <div className="border-b border-slate-200 pb-2">
            <h3 className="text-sm font-sans font-extrabold text-[#0284C7] uppercase tracking-widest flex items-center gap-1.5 ">
              <Award className="w-5 h-5 text-[#0284C7]" />
              {lang === "hi" ? "नया कौशल जोड़ें (Add Skill)" : "Add Safety & Work Skills"}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {lang === "hi" 
                ? "कारखाने में काम करने के लिए ज़रूरी नियम और नए कौशल यहाँ दर्ज करें।" 
                : "Add new skill requirements and topics that technicians must learn for safety."}
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-mono text-[10px] text-slate-500 block uppercase">Industrial Code (e.g. SAF-HZP):</label>
              <input
                type="text"
                required
                placeholder="SAF-ARC"
                value={compCode}
                onChange={(e) => setCompCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-1.5 rounded mt-1.5 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] text-slate-500 block uppercase">Competency Descriptor Title:</label>
              <input
                type="text"
                required
                placeholder="Arc Flash Electrical Isolation"
                value={compName}
                onChange={(e) => setCompName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-1.5 rounded mt-1.5 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] text-slate-500 block uppercase">Detailed Operational Description:</label>
              <textarea
                required
                placeholder="Required technical protocols for isolated breakers, degrid locking, arc shields, and high tension safeguards..."
                value={compDesc}
                onChange={(e) => setCompDesc(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-2 rounded mt-1.5 h-20 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-mono text-[10px] text-slate-500 block uppercase">Criticality Risk:</label>
                <select
                  value={compCrit}
                  onChange={(e) => setCompCrit(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-2 rounded mt-1.5"
                >
                  <option value="high">High Risk</option>
                  <option value="medium">Medium</option>
                  <option value="low">Standard</option>
                </select>
              </div>

              <div>
                <label className="font-mono text-[10px] text-slate-500 block uppercase">Syllabus Scope Group:</label>
                <select
                  value={compCat}
                  onChange={(e) => setCompCat(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-2 rounded mt-1.5"
                >
                  <option value="Safety">Safety</option>
                  <option value="Operation">Operations</option>
                  <option value="Metallurgy">Metallurgy</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Digital Systems">Automation</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] text-slate-500 block uppercase">Requisite Baseline Level Rating (1 to 5):</label>
              <input
                type="number"
                min="1"
                max="5"
                value={compReqLvl}
                onChange={(e) => setCompReqLvl(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1 mt-1.5 focus:outline-none focus:border-sky-500"
              />
            </div>

            {compSuccess && (
              <p className="text-[11px] text-emerald-600 font-sans font-semibold">{compSuccess}</p>
            )}

            <button
              type="submit"
              className="w-full bg-[#0284C7] hover:bg-[#0369A1] text-white font-sans font-bold py-2 rounded transition-colors uppercase tracking-wider text-xs cursor-pointer"
            >
              Declare Requirement
            </button>
          </div>
        </form>

      </div>

      {/* Active Competencies Inventory List (Right column) */}
      <div className={`lg:col-span-7 ${activeSubPage === "skills" ? "" : "hidden"}`}>
        <div className="bg-white border border-slate-200 p-5 rounded-lg space-y-4 shadow-sm h-full flex flex-col">
          <div className="border-b border-slate-200 pb-2">
            <span className="font-mono text-[9px] text-[#64748B] block uppercase font-bold tracking-wider">Active Inventory</span>
            <h4 className="text-xs font-sans font-bold text-[#1E293B] mt-0.5">Declared Competency Nodes in Graph</h4>
          </div>
          <div className="space-y-2.5 overflow-y-auto max-h-[480px] pr-1 flex-1">
            {competencies.map(comp => (
              <div key={comp.id} className="border border-slate-200 hover:border-slate-300 transition-all rounded-lg p-3.5 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs shadow-xs">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] bg-slate-200 text-slate-850 font-extrabold px-2 py-0.5 rounded border border-slate-300">
                      {comp.code}
                    </span>
                    <span className="font-sans font-bold text-slate-900 text-xs">{comp.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-sans">{comp.description}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[9px] font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-bold">
                      Baseline: Level {comp.requiredLevel}
                    </span>
                    <span className="text-[9px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-bold">
                      {comp.category}
                    </span>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold border ${
                      comp.criticality === "high" ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-amber-50 border-amber-200 text-amber-700"
                    }`}>
                      {comp.criticality.toUpperCase()} RISK
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Assessments Compiler & SOP Uploader (Right columns) */}
      <div className={`lg:col-span-12 space-y-6 ${activeSubPage === "assessments" || activeSubPage === "library" ? "" : "hidden"}`}>
        
        {/* ASSESSMENTS COMPILER */}
        <form onSubmit={handleCreateAssessment} className={`bg-white border border-slate-200 p-5 rounded-lg space-y-4 shadow-sm ${activeSubPage === "assessments" ? "" : "hidden"}`}>
          <div className="border-b border-slate-200 pb-2 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-sans font-extrabold text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                <PlusCircle className="w-5 h-5 text-[#0284C7]" />
                Dynamic Assessments Generator
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 font-sans">Compile comprehensive multi-question safety or mechanical operator certifications.</p>
            </div>
            <button
              type="button"
              onClick={handleAddQuestionSlot}
              className="bg-white hover:bg-slate-50 p-1.5 px-3 border border-slate-200 text-[11px] font-mono rounded text-slate-700 cursor-pointer shadow-xs"
            >
              + Add Question Node
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-mono text-[10px] text-slate-500 uppercase block">Certification Title:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arc Flash Safety Certification"
                  value={assessTitle}
                  onChange={(e) => setAssessTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-1.5 rounded mt-1 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] text-slate-500 uppercase block">Target Assignment role:</label>
                <select
                  value={assessRole}
                  onChange={(e) => setAssessRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-2.5 rounded mt-1"
                >
                  <option value="Continuous Casting Specialist">Continuous Casting Specialist</option>
                  <option value="Mechanical Technician">Mechanical Technician</option>
                  <option value="Iron Melting Operator">Iron Melting Operator</option>
                  <option value="Operations Director">Operations Director</option>
                </select>
              </div>
            </div>

            {/* Questions Pool */}
            <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
              {assessQuestions.map((q, qIdx) => (
                <div key={qIdx} className="bg-slate-50 border border-slate-200 p-3.5 rounded space-y-3 shadow-xs">
                  <div className="flex justify-between items-center bg-white border border-slate-200 p-1 px-2 rounded">
                    <span className="font-mono text-[10px] text-[#0284C7] font-bold">QUESTION #{qIdx + 1} CONFIG</span>
                    <select
                      required
                      value={q.competencyId}
                      onChange={(e) => handleModifyQuestion(qIdx, "competencyId", e.target.value)}
                      className="bg-white border border-slate-200 rounded font-mono text-[9px] text-slate-755 px-1 focus:outline-none"
                    >
                      <option value="">-- Maps Competency Node --</option>
                      {competencies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Which safety tool isolated arc flash hazard risk?"
                      value={q.questionText}
                      onChange={(e) => handleModifyQuestion(qIdx, "questionText", e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 px-2 py-1.5 text-[11px] rounded focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-2 gap-2">
                    {[0, 1, 2, 3].map((num) => (
                      <div key={num} className="flex gap-1">
                        <span className="font-mono text-[10px] self-center text-slate-400">{String.fromCharCode(65+num)}:</span>
                        <input
                          type="text"
                          required
                          placeholder={`Option ${num + 1}`}
                          value={q.options[num]}
                          onChange={(e) => handleModifyOption(qIdx, num, e.target.value)}
                          className="flex-1 bg-white border border-slate-200 text-[11px] px-2 py-1 rounded text-slate-750 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Correct Option select */}
                  <div className="flex justify-between text-[10px]" style={{ alignItems: 'center' }}>
                    <div className="flex gap-2">
                      <span className="font-mono text-slate-400 self-center">Correct Answer index:</span>
                      <select
                        value={q.correctAnswerIdx}
                        onChange={(e) => handleModifyQuestion(qIdx, "correctAnswerIdx", Number(e.target.value))}
                        className="bg-white border border-slate-200 rounded px-1 text-slate-700"
                      >
                        <option value="0">A</option>
                        <option value="1">B</option>
                        <option value="2">C</option>
                        <option value="3">D</option>
                      </select>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="font-mono text-slate-400 self-center">Points:</span>
                      <input
                        type="number"
                        className="bg-white border border-slate-200 rounded px-1 text-slate-700 w-12 text-center"
                        value={q.points}
                        onChange={(e) => handleModifyQuestion(qIdx, "points", Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {assessSuccess && (
              <p className="text-[11px] text-emerald-600 font-sans font-semibold">{assessSuccess}</p>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold tracking-wider py-2 rounded text-xs uppercase cursor-pointer"
            >
              Compile Assessment Blueprint
            </button>
          </div>
        </form>

        {/* SOP MANUAL UPLOADER */}
        <form onSubmit={handleUploadSOP} className={`bg-white border border-slate-200 p-5 rounded-lg space-y-4 shadow-sm ${activeSubPage === "library" ? "" : "hidden"}`}>
          <div className="border-b border-slate-200 pb-2">
            <h3 className="text-sm font-sans font-extrabold text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
              <Upload className="w-5 h-5 text-[#0284C7]" />
              Upload Safety SOP / Corporate Knowledge Manual
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Populate original plant guidelines. Gemini AI will semantic-vectorize and index content dynamically.</p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-mono text-[10px] text-slate-500 uppercase block">Manual Title:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electrical isolated degrid protocols"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-1.5 rounded mt-1 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] text-slate-500 uppercase block">Category Type:</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-2 rounded mt-1"
                >
                  <option value="sop">SOP Manual</option>
                  <option value="safety_manual">Safety Guideline</option>
                  <option value="logbook">Plant Operation Logbook</option>
                  <option value="expert_session">Expert Seminar paper</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-mono text-[10px] text-slate-500 uppercase block">Link Core competency:</label>
                <select
                  value={docCompId}
                  onChange={(e) => setDocCompId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-2 mt-1"
                >
                  <option value="">-- Optional Comp Node --</option>
                  {competencies.map((comp) => (
                    <option key={comp.id} value={comp.id}>{comp.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-mono text-[10px] text-slate-500 uppercase block">Comma separated Tags:</label>
                <input
                  type="text"
                  placeholder="e.g. Power, ArcFlash, 11KV"
                  value={docTagsString}
                  onChange={(e) => setDocTagsString(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-2 py-1.5 rounded mt-1 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] text-slate-500 block uppercase">Manual Document Content:</label>
              <textarea
                required
                placeholder="Paste the high-fidelity technical steps or logs here. The more technical and accurate, the more robust the AI Co-Pilot RAG training outcomes..."
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-2.5 rounded mt-1 h-32 focus:outline-none focus:border-sky-500"
              />
            </div>

            {docSuccess && (
              <p className="text-[11px] text-emerald-600 font-sans font-semibold">{docSuccess}</p>
            )}

            <button
              type="submit"
              className="w-full bg-[#0284C7] hover:bg-[#0369A1] text-white font-sans font-bold py-2 rounded text-xs uppercase cursor-pointer"
            >
              Upload & Vectorize Manual
            </button>

            <div className="pt-4 border-t border-slate-200 mt-2 space-y-3">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 font-bold">
                <span>OR AUTO-POPULATE DEMO ENVIRONMENT:</span>
                <span className="text-emerald-600">STANDARD LIBRARY</span>
              </div>
              <button
                type="button"
                disabled={seedLoading}
                onClick={handleAutoSeedSOPs}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-sans font-bold py-2.5 rounded text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors"
              >
                {seedLoading ? "Vectorizing Standard Seed Library..." : "🚀 Auto-Seed Core Enterprise SOP Library"}
              </button>
              {seedResult && (
                <div id="seed-success-msg" className="bg-emerald-50 border border-emerald-250 text-emerald-800 text-[11px] p-2.5 rounded leading-relaxed font-sans whitespace-pre-line shadow-xs">
                  {seedResult}
                </div>
              )}
            </div>
          </div>
        </form>

      </div>

      {/* ROLE COMPETENCY DICTIONARY MAPS (Fully Integrated UI) */}
      <div className={`col-span-12 space-y-6 ${activeSubPage === "mappings" ? "" : "hidden"}`}>
        <div className="bg-white border border-slate-200 p-5 rounded-lg space-y-4 shadow-sm">
          <div className="border-b border-slate-200 pb-2">
            <h3 className="text-sm font-sans font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
              <Award className="w-5 h-5 text-[#0284C7]" />
              {lang === "hi" ? "पद और कौशल मैपिंग प्रबंधन (Roles & Skill Maps)" : "Roles & Target Competency Mappings Dictionary"}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Define, edit and delete baseline competency mappings and target proficiency levels (Levels 1 to 5) for plant-level designations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left selector card list */}
            <div className="border border-slate-200 rounded-md p-3.5 space-y-2 max-h-96 overflow-y-auto bg-slate-50/50">
              <span className="font-mono text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Industrial Job Roles</span>
              {rolesList.map(role => (
                <button
                  type="button"
                  key={role.id}
                  onClick={() => {
                    setSelectedRoleForMapping(role);
                    const mapped: { [key: string]: number } = {};
                    role.requiredCompetencies.forEach((rc: any) => {
                      mapped[rc.competencyId] = rc.targetLevel;
                    });
                    setSelectedCompsForRole(mapped);
                  }}
                  className={`w-full text-left p-2 rounded text-xs font-sans font-semibold border transition-all flex justify-between items-center cursor-pointer ${
                    selectedRoleForMapping?.id === role.id 
                      ? "bg-sky-50 border-[#0284C7] text-[#0284C7] ring-1 ring-sky-300" 
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-350"
                  }`}
                >
                  <span>{role.roleName}</span>
                  <span className="font-mono text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                    {role.requiredCompetencies.length} skills
                  </span>
                </button>
              ))}

              <div className="pt-3 border-t border-slate-200 mt-3 space-y-2">
                <input
                  type="text"
                  placeholder="New Job role name..."
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!newRoleName) return;
                    try {
                      const res = await api.createRole({ roleName: newRoleName, requiredCompetencies: [] });
                      setNewRoleName("");
                      await loadRolesData();
                      setSelectedRoleForMapping(res);
                      setSelectedCompsForRole({});
                    } catch (e) {
                      alert("Failed to initialize role definition.");
                    }
                  }}
                  className="w-full bg-[#0284C7] hover:bg-[#0369A1] text-white text-[10px] font-bold py-1.5 uppercase rounded tracking-wider cursor-pointer font-mono"
                >
                  + Spawn New Designation
                </button>
              </div>
            </div>

            {/* Right configuration panel details */}
            <div className="md:col-span-2 border border-slate-200 rounded-md p-3.5 space-y-3 bg-white">
              {selectedRoleForMapping ? (
                <>
                  <div className="flex justify-between items-center border-b border-slate-150 pb-2">
                    <div>
                      <span className="text-[9px] font-mono text-slate-400 block uppercase font-bold tracking-wider">CONFIGURE REQUIRED PROFICIENCIES FOR:</span>
                      <h4 className="text-xs font-sans font-bold text-slate-800 mt-0.5">{selectedRoleForMapping.roleName}</h4>
                    </div>
                  </div>

                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {competencies.map(comp => {
                      const currentVal = selectedCompsForRole[comp.id] || 0;
                      return (
                        <div key={comp.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2 text-[11px]">
                          <div className="max-w-md">
                            <span className="font-mono text-[9px] bg-slate-150 text-slate-600 rounded px-1.5 py-0.5">{comp.code}</span>
                            <span className="text-xs font-sans font-semibold text-slate-800 ml-2">{comp.name}</span>
                            <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">{comp.description}</span>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-center">
                            <span className="text-[9px] font-mono text-slate-400">Target Level:</span>
                            <select
                              value={currentVal}
                              onChange={(e) => {
                                const level = Number(e.target.value);
                                setSelectedCompsForRole(prev => {
                                  const updated = { ...prev };
                                  if (level === 0) {
                                    delete updated[comp.id];
                                  } else {
                                    updated[comp.id] = level;
                                  }
                                  return updated;
                                });
                              }}
                              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded py-1 px-1.5 focus:outline-none"
                            >
                              <option value="0">Not Required</option>
                              <option value="1">Level 1 - Novice</option>
                              <option value="2">Level 2 - Beginner</option>
                              <option value="3">Level 3 - Competent</option>
                              <option value="4">Level 4 - Advanced</option>
                              <option value="5">Level 5 - Expert</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const reqComps = Object.keys(selectedCompsForRole).map(compId => ({
                            competencyId: compId,
                            targetLevel: selectedCompsForRole[compId]
                          }));
                          await api.updateRole(selectedRoleForMapping.id, {
                            requiredCompetencies: reqComps
                          });
                          await loadRolesData();
                          onRefreshState();
                          alert("Designation proficiency rules saved successfully!");
                        } catch (e) {
                          alert("Failed to save changes.");
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-sans font-bold py-1.5 px-4 rounded uppercase tracking-wider cursor-pointer shadow-sm transition-colors"
                    >
                      Save Mapping Layout
                    </button>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col justify-center items-center text-slate-400 py-16 text-center space-y-2">
                  <Award className="w-8 h-8 text-slate-300" />
                  <span className="text-xs font-sans font-semibold">Select a designated job role from list to calibrate target competencies.</span>
                  <p className="text-[10px] max-w-xs text-slate-500 leading-normal">Configured mappings dynamically set workforce requirements for WRI and individual training agendas.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ==================== HAWKEYE CENTRAL HUB ==================== */}
      <div className={`space-y-6 ${activeSubPage === "hawkeye" ? "" : "hidden"}`}>
        {heLoading && !hawkeyeData ? (
          <div className="bg-white p-12 text-center text-slate-500 rounded-xl border border-slate-200 shadow-xs">
            <div className="animate-spin w-8 h-8 border-4 border-purple-650 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="font-mono text-xs tracking-wider uppercase">Loading HawkEye Central Intelligence...</p>
          </div>
        ) : !hawkeyeData ? (
          <div className="bg-white p-8 text-center text-slate-500 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs">No L&D HawkEye analytics aggregated yet.</p>
          </div>
        ) : (
          <>
            {/* Executive Organized Summaries */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Operational Workforce</span>
                <span className="text-3xl font-black text-slate-900 block mt-1">{hawkeyeData.overall.totalEmployees}</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Active crew personnel</span>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Managers & Supervisors</span>
                <span className="text-3xl font-black text-emerald-600 block mt-1">{hawkeyeData.overall.totalManagers}</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Plant floor checkers</span>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Average System WRI</span>
                <span className="text-3xl font-black text-purple-600 block mt-1">{hawkeyeData.overall.overallWri}%</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Industry benchmark: 80%</span>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">SOPs Completed</span>
                <span className="text-3xl font-black text-blue-600 block mt-1">{hawkeyeData.overall.totalCompletedModules}</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Training lessons reviewed</span>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs col-span-2 lg:col-span-1">
                <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Exam Submissions</span>
                <span className="text-3xl font-black text-amber-500 block mt-1">{hawkeyeData.overall.totalAttemptsCount}</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Total safety assessments</span>
              </div>
            </div>

            {/* Overall Organization summaries */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Teamwise Details */}
              <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Teamwise Details (HawkEye View)</h3>
                    <p className="text-[11px] text-slate-500">Aggregated crew capability segments by designation.</p>
                  </div>
                  <span className="text-[10px] font-mono bg-[#0284C7]/10 text-[#0284C7] px-2 py-0.5 rounded border border-[#0284C7]/20 font-bold">Live Stats</span>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {hawkeyeData.teams.map((team: any) => (
                    <div key={team.roleName} className="border border-slate-150 p-3 rounded-lg bg-slate-50/55 flex justify-between items-center text-xs hover:border-slate-350 transition-colors">
                      <div className="space-y-1">
                        <span className="font-bold text-slate-900">{team.roleName}</span>
                        <div className="flex gap-3 text-[10px] text-slate-500 font-semibold font-mono">
                          <span>Headcount: <strong>{team.headcount}</strong></span>
                          <span>Completions: <strong>{team.totalCompletions}</strong></span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="font-mono text-[9px] text-slate-400 block uppercase leading-none">Team WRI</span>
                          <span className="font-sans font-black text-xs text-purple-600">{team.avgWri}%</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setConnectTarget({ type: "team", id: team.roleName, name: `${team.roleName} Team` });
                            setConnectModalOpen(true);
                          }}
                          className="bg-white hover:bg-slate-50 text-[10px] font-bold font-mono border border-slate-200 py-1.5 px-2.5 rounded text-[#0284C7] shadow-3xs cursor-pointer transition-colors"
                        >
                          Connect
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Departmentwise Details */}
              <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Department Details (HawkEye View)</h3>
                    <p className="text-[11px] text-slate-500">Live capability rating of full industrial departments.</p>
                  </div>
                  <span className="text-[10px] font-mono bg-[#0284C7]/10 text-[#0284C7] px-2 py-0.5 rounded border border-[#0284C7]/20 font-bold">Operations</span>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {hawkeyeData.departments.map((dept: any) => (
                    <div key={dept.department} className="border border-slate-150 p-3 rounded-lg bg-slate-50/55 flex justify-between items-center text-xs hover:border-slate-350 transition-colors">
                      <div className="space-y-1">
                        <span className="font-bold text-slate-900">{dept.department}</span>
                        <div className="flex gap-3 text-[10px] text-slate-500 font-semibold font-mono">
                          <span>Division Crew: <strong>{dept.headcount}</strong></span>
                          <span>SOP completions: <strong>{dept.totalCompletions}</strong></span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="font-mono text-[9px] text-slate-400 block uppercase leading-none">Dept WRI</span>
                          <span className={`font-sans font-black text-xs ${dept.avgWri >= 75 ? "text-emerald-600" : "text-amber-600"}`}>{dept.avgWri}%</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setConnectTarget({ type: "department", id: dept.department, name: `${dept.department} Dept` });
                            setConnectModalOpen(true);
                          }}
                          className="bg-white hover:bg-slate-50 text-[10px] font-bold font-mono border border-slate-200 py-1.5 px-2.5 rounded text-[#0284C7] shadow-3xs cursor-pointer transition-colors"
                        >
                          Connect
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Managers Details Row */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-sans">Managers & Supervisors Details</h3>
                <p className="text-[11px] text-slate-500 font-sans">Preside over division heads and review subordinate readiness under each supervisor's care.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {hawkeyeData.managers.map((m: any) => (
                  <div key={m.id} className="border border-slate-200 p-4 rounded-xl bg-slate-50/30 space-y-3 hover:border-slate-300 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-900 text-xs block leading-tight">{m.fullName}</span>
                        <span className="font-mono text-[9px] text-slate-400 font-medium block mt-0.5">@{m.username} • {m.jobTitle}</span>
                        <span className="text-[9px] font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded inline-block mt-2">{m.department}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setConnectTarget({ type: "manager", id: m.id, name: `Manager ${m.fullName}` });
                          setConnectModalOpen(true);
                        }}
                        className="bg-sky-50 text-[#0284C7] hover:bg-sky-100 text-[10px] font-bold font-mono py-1 px-2.5 rounded border border-sky-200 cursor-pointer transition-colors"
                      >
                        Connect
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center bg-white p-2.5 rounded border border-slate-150">
                      <div>
                        <span className="text-[9px] font-mono text-slate-400 block uppercase leading-none">Headcount</span>
                        <span className="text-xs font-bold text-slate-800 block mt-1 font-mono">{m.headcount} subordinates</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-slate-400 block uppercase leading-none">Team average WRI</span>
                        <span className={`text-xs font-black block mt-1 font-mono ${m.teamAverageWri >= 70 ? "text-emerald-600" : "text-amber-500"}`}>{m.teamAverageWri}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Individual Employee Performance Details */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-850">All Employees Performance Details</h3>
                <p className="text-[11px] text-slate-500 font-sans">Granular capability matrix of every technician. Preside and trace training gaps immediately.</p>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-xs font-sans text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase text-[9px] tracking-wider">
                      <th className="p-3">Operator Name</th>
                      <th className="p-3">Designation / Division</th>
                      <th className="p-3 font-medium text-center">Workforce Readiness Index (WRI)</th>
                      <th className="p-3 text-center">SOPs Completed</th>
                      <th className="p-3 text-center">Assessment Grades</th>
                      <th className="p-3">Verified Skills</th>
                      <th className="p-3 text-right">L&D Connect Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hawkeyeData.employees.map((emp: any) => (
                      <tr key={emp.id} className="border-b border-slate-150 hover:bg-slate-50/60 transition-colors">
                        <td className="p-3">
                          <span className="font-bold text-slate-900 block">{emp.fullName}</span>
                          <span className="font-mono text-[9px] text-slate-400">@{emp.username} • {emp.priorExperienceYrs} yrs exp</span>
                        </td>
                        <td className="p-3">
                          <span className="text-slate-850 font-semibold block text-xs">{emp.jobTitle}</span>
                          <span className="text-[9px] text-[#0284C7] font-bold uppercase tracking-wider">{emp.department}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-mono text-xs font-extrabold bg-purple-55 text-purple-700 border border-purple-200 rounded px-2.5 py-1">
                            {emp.wri}%
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-600">
                          {emp.completedCount} modules
                        </td>
                        <td className="p-3 text-center">
                          <span className="font-mono font-bold text-slate-800 block text-xs">{emp.averageScore}% avg</span>
                          <span className="text-[9px] text-slate-400 block leading-tight">{emp.totalAttempts} exams taken</span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {emp.skills.slice(0, 3).map((sk: any) => (
                              <span key={sk.competencyId} className="text-[9px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                {sk.name}: Lvl {sk.level}
                              </span>
                            ))}
                            {emp.skills.length === 0 && (
                              <span className="text-[10px] text-slate-400 italic">No verified ratings yet</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setConnectTarget({ type: "employee", id: emp.id, name: emp.fullName });
                              setConnectModalOpen(true);
                            }}
                            className="bg-[#0284C7] hover:bg-[#0369A1] font-mono text-[10px] font-bold text-white py-1.5 px-3 rounded shadow-3xs cursor-pointer transition-colors"
                          >
                            Connect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ==================== RETIREMENT REPOSITORY ==================== */}
      <div className={`space-y-6 ${activeSubPage === "retirement" ? "" : "hidden"}`}>
        
        {/* Retirement Jumbotron Banner */}
        <div className="bg-[#0284C7]/5 border border-[#0284C7]/20 p-5 rounded-xl space-y-4 shadow-3xs">
          <div className="flex items-start gap-3">
            <div className="bg-[#0284C7] text-white p-3 rounded-lg shrink-0">
              <Award className="w-6 h-6 shrink-0 text-white" />
            </div>
            <div>
              <span className="text-[9px] font-mono bg-[#0284C7]/15 text-[#0284C7] font-bold px-2 py-0.5 rounded border border-[#0284C7]/20 uppercase">Transition Wisdom Assurance</span>
              <h3 className="text-sm font-sans font-black text-slate-850 mt-1.5">Nearing Retirement Elder Wisdom Repository</h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-3xl mt-1">
                L&amp;D presides over the retirement transition pipeline. When senior staff reach their nearby of retirement (Experience &ge; 15 Years), you must conduct critical <strong>Knowledge Capture Assessments</strong>. 
                Veterans answer these custom prompts directly, documenting standard troubleshooting guidelines and operating rules. 
                These answers are automatically compiled and published as dynamic <strong>SOP manuals</strong> searchable by the whole plant!
              </p>
            </div>
          </div>
        </div>

        {heLoading && !hawkeyeData ? (
          <div className="bg-white p-12 text-center text-slate-500 rounded-xl border border-slate-200 shadow-xs">
            <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="font-mono text-xs tracking-wider uppercase">Loading Elder Transition Registries...</p>
          </div>
        ) : !hawkeyeData ? (
          <div className="bg-white p-8 text-center text-slate-500 rounded-xl border border-slate-200">
            <p className="text-xs">No retiree records cataloged.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-5">
            <div className="border-b border-slate-150 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-sans">Elderly Retiring Staff Transitions Registry</h4>
              <p className="text-[11px] text-slate-500 font-sans">Crew personnel nearing retirement threshold values (Experience &ge; 15 Years).</p>
            </div>

            <div className="space-y-4">
              {hawkeyeData.retirementRepository.map((ret: any) => (
                <div key={ret.id} className="border border-slate-200 hover:border-slate-350 transition-all rounded-lg p-4 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm leading-none">{ret.fullName}</span>
                      <span className="font-mono text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-250 font-bold uppercase">Nearing Retirement</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-[10px] text-slate-500 font-semibold font-mono">
                      <span>Designation: <strong className="text-slate-800">{ret.jobTitle}</strong></span>
                      <span>Department: <strong className="text-slate-850">{ret.department}</strong></span>
                      <span>Tenure Experience: <strong className="text-rose-600 font-bold text-[11px]">{ret.experienceYrs} Years Service</strong></span>
                    </div>

                    {ret.wisdomReports && ret.wisdomReports.length > 0 && (
                      <div className="space-y-1 bg-white border border-slate-150 p-2.5 rounded-md mt-2 max-w-lg shadow-3xs">
                        <span className="text-[9px] text-emerald-600 block font-bold uppercase font-mono tracking-wider">✓ Completed Wisdom Capture Capsule</span>
                        {ret.wisdomReports.map((rep: any) => (
                          <div key={rep.id} className="text-[10px] text-slate-600 font-sans flex justify-between">
                            <span>SOP Document: <strong>{rep.title}</strong></span>
                            <span className="font-mono font-bold text-emerald-600">{rep.score}% answers verified</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setConnectTarget({ type: "employee", id: ret.id, name: ret.fullName });
                        setConnectModalOpen(true);
                      }}
                      className="bg-white border border-slate-250 text-slate-700 hover:bg-slate-50 font-mono text-[10px] font-bold py-2 px-3 rounded shadow-3xs cursor-pointer transition-colors"
                    >
                      Connect
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveRetiree(ret);
                        const defaultTitle = `Veteran Wisdom Capture - ${ret.fullName} - ${ret.jobTitle}`;
                        setWisdomAssessTitle(defaultTitle);
                        
                        // Pre-fill clean wisdom questionnaire customizable targeting their role/department!
                        const prefilledQs = [
                          {
                            questionText: `What represents the most critical safety shutdown protocol you mandate for the SMS ${ret.department} section?`,
                            options: [
                              "Verify dual dual-sensor nitrogen gas purge pressure gauges are reading >50psi",
                              "Halt ladle transfer cranes immediately and secure safety interlocks manually",
                              "Engage double-gasket hydraulic isolating lever and notify floor marshals",
                              "Run auxiliary back-up coolant nozzles on steel molds"
                            ],
                            correctAnswerIdx: 0,
                            points: 50,
                            competencyId: competencies[0]?.id || ""
                          },
                          {
                            questionText: `In your ${ret.experienceYrs} years experience as ${ret.jobTitle}, what is the best corrective step for cold slag nozzle clogging?`,
                            options: [
                              "Execute high pressure manual slide gate throttling to shear solid slag",
                              "Increase induction heating temperature by 15% and flush argon gas",
                              "Halt smelting sequence and manually rod the nozzle shield",
                              "Initiate auxiliary oxygen oxygen lancing with thermal shields on"
                            ],
                            correctAnswerIdx: 1,
                            points: 50,
                            competencyId: competencies[0]?.id || ""
                          }
                        ];
                        setWisdomQuestions(prefilledQs);
                        setRetirementModalOpen(true);
                      }}
                      className="bg-purple-650 hover:bg-purple-500 text-white font-mono text-[10px] font-bold py-2 px-3 rounded shadow-xs cursor-pointer transition-colors"
                    >
                      Conduct Wisdom Assessment
                    </button>
                  </div>
                </div>
              ))}

              {hawkeyeData.retirementRepository.length === 0 && (
                <div className="text-center text-slate-400 py-6 italic text-xs">
                  No operational employees current exceed our senior 15-year tenure retirement threshold.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ==================== INTERACTIVE CONNECT INTERVENTION MODAL ==================== */}
      {connectModalOpen && connectTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4 transition-opacity">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="border-b border-slate-150 pb-2">
              <span className="text-[9px] font-mono text-slate-400 block uppercase font-bold tracking-wider font-bold">L&amp;D HAWKEYE FEEDBACK CONNECT</span>
              <h3 className="text-sm font-sans font-black text-slate-900 mt-0.5">Connect to {connectTarget.name}</h3>
              <p className="text-[11px] text-slate-500 font-medium">Intervention mode: {connectTarget.type === "employee" ? `Operator Direct` : `${connectTarget.type} Segment`}</p>
            </div>

            <form onSubmit={handleConnectSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="font-mono text-[10px] text-slate-500 block uppercase font-bold">Intervention Action:</label>
                <div className="grid grid-cols-3 gap-2 mt-1.5 font-sans">
                  {[
                    { value: "talk", label: "💬 Talk" },
                    { value: "assign", label: "📚 Assign Module" },
                    { value: "ask", label: "❓ Ask" }
                  ].map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => setConnectType(opt.value as any)}
                      className={`py-2 px-2.5 rounded border font-sans font-semibold text-center transition-all cursor-pointer ${
                        connectType === opt.value
                          ? "bg-purple-50 border-purple-400 text-purple-700 font-bold"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {connectType === "assign" && (
                <div>
                  <label className="font-mono text-[10px] text-slate-500 block uppercase font-bold">Choose Lesson / SOP Module to Mandate:</label>
                  <select
                    required
                    value={connectSelectedModule}
                    onChange={(e) => setConnectSelectedModule(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-880 text-xs py-2 px-2.5 rounded mt-1.5 focus:outline-none"
                  >
                    <option value="">-- Choose Module --</option>
                    {modulesList.map((m) => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-mono text-[10px] text-slate-500 block uppercase font-bold font-mono">Inquiry Directive / Message details:</label>
                <textarea
                  required
                  placeholder={
                    connectType === "assign" 
                      ? "Brief employee on why you are mandating this curriculum (e.g., 'Please clear safety compliance loop to cleared SMS Welding requirements')."
                      : connectType === "ask"
                        ? "Enter your question or specific status request (e.g., 'Confirm nitrogen purgers were balanced prior to shift handoff')."
                        : "Type your talk message/feedback here..."
                  }
                  value={connectMsg}
                  onChange={(e) => setConnectMsg(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-850 p-2.5 mt-1.5 h-24 rounded focus:outline-none focus:border-sky-500"
                />
              </div>

              {connectSuccess && (
                <p className="text-[11px] text-emerald-600 font-sans font-semibold text-center bg-emerald-50 border border-emerald-150 p-2 rounded">{connectSuccess}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConnectModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded hover:bg-slate-50 font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded font-bold uppercase tracking-wider cursor-pointer shadow-sm animate-pulse-slow"
                >
                  Send Connect Directive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== CONDUCT RETIREMENT WISDOM ASSESSMENT MODAL ==================== */}
      {retirementModalOpen && activeRetiree && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative my-8">
            <div className="border-b border-slate-150 pb-2">
              <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">👴 ELDER WISDOM TRANSITION ENGINE</span>
              <h3 className="text-sm font-sans font-bold text-slate-900 mt-0.5">Conduct Wisdom Assessment: {activeRetiree.fullName}</h3>
              <p className="text-[11px] text-slate-500 font-medium font-sans">Verify legacy troubleshooting knowledge for <strong>{activeRetiree.jobTitle}</strong> before retirement transition.</p>
            </div>

            <form onSubmit={handleWisdomAssessSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="font-mono text-[10px] text-slate-500 uppercase block font-bold">Wisdom Questionnaire Title:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Veteran Wisdom Capture - Cold Caster Troubleshooting"
                  value={wisdomAssessTitle}
                  onChange={(e) => setWisdomAssessTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 px-3 py-2 rounded mt-1.5 focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Wisdom Questions fields */}
              <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                <span className="font-mono text-[9px] text-slate-400 block uppercase font-bold tracking-wider">QUESTIONS BANK COMPILATION</span>
                {wisdomQuestions.map((q, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-150 p-3 rounded-lg space-y-2">
                    <span className="font-mono text-[10px] text-purple-600 font-bold block">WISDOM CRITICAL CONCERN #{idx + 1}</span>
                    <input
                      type="text"
                      required
                      placeholder="Input highly practical question to harvest custom wisdom..."
                      value={q.questionText}
                      onChange={(e) => {
                        const updated = [...wisdomQuestions];
                        updated[idx].questionText = e.target.value;
                        setWisdomQuestions(updated);
                      }}
                      className="w-full bg-white border border-slate-200 text-slate-850 text-[11px] p-2 rounded focus:outline-none focus:border-sky-500 font-sans"
                    />

                    <div className="grid grid-cols-2 gap-2 pt-1 font-sans">
                      {[0, 1, 2, 3].map((num) => (
                        <input
                          key={num}
                          type="text"
                          required
                          placeholder={`Option ${num + 1} (Wisdom Action)`}
                          value={q.options[num]}
                          onChange={(e) => {
                            const updated = [...wisdomQuestions];
                            updated[idx].options[num] = e.target.value;
                            setWisdomQuestions(updated);
                          }}
                          className="bg-white border border-slate-200 text-[10px] p-1.5 rounded focus:outline-none focus:border-sky-500 font-sans"
                        />
                      ))}
                    </div>

                    <div className="flex justify-between items-center text-[10px] pt-1">
                      <span className="font-mono text-slate-400 font-sans">Verifiably safest operating choice (Option 1 to 4):</span>
                      <select
                        value={q.correctAnswerIdx}
                        onChange={(e) => {
                          const updated = [...wisdomQuestions];
                          updated[idx].correctAnswerIdx = Number(e.target.value);
                          setWisdomQuestions(updated);
                        }}
                        className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-700"
                      >
                        <option value="0">Option 1</option>
                        <option value="1">Option 2</option>
                        <option value="2">Option 3</option>
                        <option value="3">Option 4</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {wisdomSuccess && (
                <p className="text-[11px] text-emerald-600 font-sans font-semibold text-center bg-emerald-50 border border-emerald-150 p-2 rounded">{wisdomSuccess}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRetirementModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded hover:bg-slate-50 font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-550 text-white rounded font-bold uppercase tracking-wider cursor-pointer shadow-sm"
                >
                  Publish Wisdom Capture Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Original action triggers */}
      <div className="hidden">
        <form onSubmit={handleCreateCompetency} />
      </div>

    </div>
    </div>
  );
}
