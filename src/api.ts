const API_BASE = "/api";

function getHeaders() {
  const token = localStorage.getItem("sarathi_token");
  const headers: { [key: string]: string } = {
    "Content-Type": "application/json"
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Authentication
  async login(username: string, passwordString: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ username, password: passwordString })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    return data;
  },

  async register(payload: any) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    return data;
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch profile");
    return data;
  },

  async onboard(payload: any) {
    const res = await fetch(`${API_BASE}/auth/onboard`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Onboarding failed");
    return data;
  },

  async getOnboardingQuestions() {
    const res = await fetch(`${API_BASE}/onboarding/questions`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load onboarding questions");
    return data;
  },

  async submitOnboardingAnswers(answers: { [key: string]: number }) {
    const res = await fetch(`${API_BASE}/auth/onboard-test`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ answers })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to grade onboarding assessment");
    return data;
  },

  async getRoles() {
    const res = await fetch(`${API_BASE}/roles`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load roles");
    return data;
  },

  async createRole(payload: any) {
    const res = await fetch(`${API_BASE}/roles`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create role definition");
    return data;
  },

  async updateRole(id: string, payload: any) {
    const res = await fetch(`${API_BASE}/roles/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update role mapping");
    return data;
  },

  async getQuestions() {
    const res = await fetch(`${API_BASE}/questions`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load question bank");
    return data;
  },

  async createQuestion(payload: any) {
    const res = await fetch(`${API_BASE}/questions`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create question");
    return data;
  },

  async updateQuestion(id: string, payload: any) {
    const res = await fetch(`${API_BASE}/questions/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to edit question");
    return data;
  },

  async deleteQuestion(id: string) {
    const res = await fetch(`${API_BASE}/questions/${id}`, {
      method: "DELETE",
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to delete question");
    return data;
  },

  // Users
  async getTeam() {
    const res = await fetch(`${API_BASE}/users/team`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch team");
    return data;
  },

  // Competencies
  async getCompetencies() {
    const res = await fetch(`${API_BASE}/competencies`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load competencies");
    return data;
  },

  async createCompetency(payload: any) {
    const res = await fetch(`${API_BASE}/competencies`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create competency");
    return data;
  },

  async getUserCompetencyProfile(userId?: string) {
    const url = userId 
      ? `${API_BASE}/competencies/profile/${userId}`
      : `${API_BASE}/competencies/profile`;
    const res = await fetch(url, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch competency profile");
    return data;
  },

  async rateCompetency(payload: { competencyId: string; rating: number; userId?: string }) {
    const res = await fetch(`${API_BASE}/competencies/rate`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to apply rating");
    return data;
  },

  // Assessments
  async getAssessments() {
    const res = await fetch(`${API_BASE}/assessments`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load assessments");
    return data;
  },

  async createAssessment(payload: any) {
    const res = await fetch(`${API_BASE}/assessments`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create assessment");
    return data;
  },

  async submitAssessment(payload: { assessmentId: string; answers: { [key: string]: number } }) {
    const res = await fetch(`${API_BASE}/assessments/submit`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to submit assessment answers");
    return data;
  },

  // WRI
  async getWRI(userId?: string) {
    const url = userId ? `${API_BASE}/wri/${userId}` : `${API_BASE}/wri`;
    const res = await fetch(url, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch WRI indicators");
    return data;
  },

  // KRI
  async getKRI() {
    const res = await fetch(`${API_BASE}/kri`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to calc plant risk indexing");
    return data;
  },

  // Learning Paths
  async getLearningPaths() {
    const res = await fetch(`${API_BASE}/learning-paths`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load learning blueprints");
    return data;
  },

  async completeLearningModule(moduleId: string) {
    const res = await fetch(`${API_BASE}/learning-paths/complete`, {
      method: "POST",
      body: JSON.stringify({ moduleId }),
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to checkoff module completion");
    return data;
  },

  // AI Trainer
  async askAITrainer(query: string, history: { role: string; text: string }[], engine?: "gemini" | "groq") {
    const res = await fetch(`${API_BASE}/ai-trainer/query`, {
      method: "POST",
      body: JSON.stringify({ query, history, engine }),
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Trainer module error");
    return data;
  },

  // Knowledge Hub
  async getKnowledgeHub() {
    const res = await fetch(`${API_BASE}/knowledge-hub`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to pull records");
    return data;
  },

  async uploadDoc(payload: { title: string; type: string; content: string; competencyId?: string; tags: string[] }) {
    const res = await fetch(`${API_BASE}/knowledge-hub/upload`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to upload manual");
    return data;
  },

  async seedDocuments() {
    const res = await fetch(`${API_BASE}/knowledge-hub/seed`, {
      method: "POST",
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to auto-seed standard enterprise library");
    return data;
  },

  // Mentoring
  async getMentorRecommendations() {
    const res = await fetch(`${API_BASE}/mentors/recommend`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to execute matchmaking");
    return data;
  },

  async nominateSelfAsMentor(payload: { competencies: string[]; yearsExp: number }) {
    const res = await fetch(`${API_BASE}/mentors/nominate`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed self nomination");
    return data;
  },

  async getMentorNominations() {
    const res = await fetch(`${API_BASE}/mentors/nominations`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to read nominations queue");
    return data;
  },

  async actOnNomination(nominationId: string, status: "approved" | "rejected") {
    const res = await fetch(`${API_BASE}/mentors/nominate/action`, {
      method: "POST",
      body: JSON.stringify({ nominationId, status }),
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to accept/reject request");
    return data;
  },

  async logMentorSession(payload: { employeeId: string; competencyId: string; sessionNotes: string; capturedKnowledge?: string }) {
    const res = await fetch(`${API_BASE}/mentors/session/log`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to archive session notes");
    return data;
  },

  async getMentorSessions() {
    const res = await fetch(`${API_BASE}/mentors/sessions`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load session logs");
    return data;
  },

  // Knowledge Graph
  async getGraph() {
    const res = await fetch(`${API_BASE}/graph`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load graph nodes");
    return data;
  },

  async declareGraphEdge(payload: { source: string; target: string; relation: string }) {
    const res = await fetch(`${API_BASE}/graph/edge`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed custom relation creation");
    return data;
  }
};
