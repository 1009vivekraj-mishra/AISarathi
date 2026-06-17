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

  const loadAdminData = async () => {
    try {
      const list = await api.getCompetencies();
      setCompetencies(list);
    } catch (e) {
      console.error("Failed to load admin competencies:", e);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [userProfile]);

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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Competencies Declarator form (Left column) */}
      <div className="lg:col-span-4 space-y-6">
        
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

      {/* Dynamic Assessments Compiler & SOP Uploader (Right columns) */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* ASSESSMENTS COMPILER */}
        <form onSubmit={handleCreateAssessment} className="bg-white border border-slate-200 p-5 rounded-lg space-y-4 shadow-sm">
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
        <form onSubmit={handleUploadSOP} className="bg-white border border-slate-200 p-5 rounded-lg space-y-4 shadow-sm">
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

    </div>
  );
}
