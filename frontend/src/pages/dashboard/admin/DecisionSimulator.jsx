import { useState, useEffect, useCallback } from "react";
import {
  FiCpu,
  FiDollarSign,
  FiUsers,
  FiClock,
  FiAlertTriangle,
  FiTrendingUp,
  FiTrendingDown,
  FiInfo,
  FiTrash2,
  FiBarChart2,
  FiActivity,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiSliders,
  FiRefreshCw,
  FiZap,
  FiServer,
  FiTarget,
  FiThumbsUp,
  FiDatabase,
  FiCloud,
  FiShield,
  FiGlobe,
  FiTrendingUp as FiSuccess,
  FiTrendingDown as FiFailure,
  FiPieChart,
  FiBookOpen,
  FiHome,
  FiAward,
  FiBarChart,
  FiHelpCircle,
  FiArrowRight,
  FiArrowLeft,
} from "react-icons/fi";
import DashboardLayout from "../../../components/layout/DashboardLayout";

const API_BASE_URL = import.meta.env.VITE_AI_API_URL || "http://localhost:8000";

// ============================
// UTILITY FUNCTIONS
// ============================

const getRiskColor = (risk) => {
  switch (risk?.toLowerCase()) {
    case "low": return "emerald";
    case "medium": return "amber";
    case "high": return "rose";
    default: return "slate";
  }
};

const getRiskIcon = (risk) => {
  switch (risk?.toLowerCase()) {
    case "low": return FiCheckCircle;
    case "medium": return FiAlertCircle;
    case "high": return FiXCircle;
    default: return FiInfo;
  }
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCurrency = (amount) => {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M MAD`;
  }
  return `${amount.toLocaleString()} MAD`;
};

// ============================
// TOOLTIP COMPONENT
// ============================

const Tooltip = ({ children, content }) => {
  const [show, setShow] = useState(false);
  
  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex items-center gap-1 cursor-help"
      >
        {children}
        <FiHelpCircle className="text-slate-400 text-xs" />
      </div>
      {show && (
        <div className="absolute z-50 w-64 p-3 mt-1 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg shadow-lg -left-2">
          {content}
          <div className="absolute -top-1 left-3 w-2 h-2 bg-white border-t border-l border-slate-200 rotate-45" />
        </div>
      )}
    </div>
  );
};

// ============================
// FIELD GROUP COMPONENT
// ============================

const FieldGroup = ({ title, icon: Icon, children }) => (
  <div className="md:col-span-2 animate-fadeIn">
    <h3 className="text-sm font-semibold text-slate-700 mb-3 border-b border-slate-200 pb-2 flex items-center gap-2">
      <Icon className="text-indigo-600" size={16} />
      {title}
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {children}
    </div>
  </div>
);

// ============================
// MAIN COMPONENT
// ============================

export default function DecisionSimulator() {
  // ============================
  // STATE
  // ============================
  
  const [aiConnected, setAiConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [activeTooltip, setActiveTooltip] = useState(null);
  
  // Wizard Stepper State
  const [formStep, setFormStep] = useState(0);

  const [scenario, setScenario] = useState({
    project_name: "",
    project_type: "Digital Platform",
    region: "Casablanca-Settat",
    province: "Casablanca",
    ministry: "Digital Transition",
    sector: "Digital Platforms",
    
    planned_budget_mad: 25000000,
    budget_sufficiency: 0.85,
    planned_duration_days: 270,
    funding_source: "National Budget",
    strategic_importance: "High",
    project_priority: "High",
    procurement_method: "International Tender",
    
    cloud_provider: "Azure",
    software_complexity: "High",
    integration_complexity: "Medium",
    api_count: 34,
    legacy_systems: 8,
    interoperability_score: 85,
    microservices: "Yes",
    frontend_framework: "React",
    backend_framework: "Spring Boot",
    database: "PostgreSQL",
    
    ai_component: "Yes",
    ai_type: "Predictive Analytics",
    ai_maturity: 0.7,
    
    cybersecurity_level: "High",
    encryption_level: "Strong",
    gdpr_compliance: "Yes",
    iso27001: "Yes",
    penetration_testing: "Yes",
    security_audit_score: 92,
    vulnerabilities_found: 2,
    
    team_size: 25,
    senior_developers: 18,
    vendor_experience: 4.6,
    digital_skill_score: 84,
    staff_turnover: 0.20,
    project_manager_experience_years: 10,
    previous_projects: 12,
    previous_success_rate: 0.85,
    contractor_rating: 4.2,
    
    testing_coverage: 91,
    compliance_score: 88,
    audit_findings: 1,
    scrum_maturity: "High",
    user_training: 82,
    digital_maturity: 0.85,
    chatbot_usage: "Medium",
    
    citizen_users: 1000000,
    expected_transactions: 500000,
    digital_adoption_rate: 0.65,
    citizen_complaints: 1,
    system_availability_target: 99.95,
    
    procurement_delay_days: 30,
    approval_delay_days: 20,
    inflation_rate: 0.030,
    contract_amendments: 2,
    legal_disputes: 0,
    permit_complexity: 2,
    stakeholder_count: 6,
    change_requests: 5,
    
    digital_service: "Digital Platform",
    approved_budget_mad: 24000000,
    contract_value_mad: 23000000,
    estimated_team_size: 25,
  });

  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("input");
  const [whatIfChanges, setWhatIfChanges] = useState({});

  // Wizard Steps Configuration
  const steps = [
    { label: "General & Finance", icon: FiHome },
    { label: "Architecture & AI", icon: FiCloud },
    { label: "Security & QA", icon: FiShield },
    { label: "Governance & Citizen Impact", icon: FiUsers },
  ];

  // ============================
  // EFFECTS
  // ============================
  
  useEffect(() => {
    checkAIConnection();
    loadHistory();
  }, []);

  // ============================
  // AI CONNECTION
  // ============================
  
  const checkAIConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        setAiConnected(true);
        setAiError(null);
        
        const infoResponse = await fetch(`${API_BASE_URL}/model-info`);
        if (infoResponse.ok) {
          const info = await infoResponse.json();
          setModelInfo(info);
        }
      } else {
        setAiConnected(false);
        setAiError("AI service unavailable");
      }
    } catch (error) {
      setAiConnected(false);
      setAiError("Cannot connect to AI service. Please start the API server.");
    }
  };

  // ============================
  // HISTORY
  // ============================
  
  const loadHistory = () => {
    const savedHistory = localStorage.getItem("simulationHistory");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Error loading history:", e);
      }
    }
  };

  const saveHistory = (newEntry) => {
    const updatedHistory = [newEntry, ...history].slice(0, 20);
    setHistory(updatedHistory);
    localStorage.setItem("simulationHistory", JSON.stringify(updatedHistory));
  };

  // ============================
  // FORM HANDLERS
  // ============================
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setScenario({
      ...scenario,
      [name]: value,
    });
    if (validationErrors[name]) {
      setValidationErrors({
        ...validationErrors,
        [name]: "",
      });
    }
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const cleanValue = value.replace(',', '.');
    setScenario({
      ...scenario,
      [name]: parseFloat(cleanValue) || 0,
    });
    if (validationErrors[name]) {
      setValidationErrors({
        ...validationErrors,
        [name]: "",
      });
    }
  };

  // ============================
  // AI PREDICTION
  // ============================
  
  const prepareAIPayload = useCallback((scenarioData) => {
    return {
      project_name: scenarioData.project_name || "Unnamed Project",
      project_type: scenarioData.project_type,
      region: scenarioData.region,
      province: scenarioData.province,
      ministry: scenarioData.ministry,
      sector: scenarioData.sector,
      
      planned_budget_mad: scenarioData.planned_budget_mad,
      budget_sufficiency: scenarioData.budget_sufficiency,
      planned_duration_days: scenarioData.planned_duration_days,
      funding_source: scenarioData.funding_source,
      strategic_importance: scenarioData.strategic_importance,
      project_priority: scenarioData.project_priority,
      procurement_method: scenarioData.procurement_method,
      
      cloud_provider: scenarioData.cloud_provider,
      software_complexity: scenarioData.software_complexity,
      integration_complexity: scenarioData.integration_complexity,
      api_count: scenarioData.api_count,
      legacy_systems: scenarioData.legacy_systems,
      interoperability_score: scenarioData.interoperability_score,
      microservices: scenarioData.microservices,
      frontend_framework: scenarioData.frontend_framework,
      backend_framework: scenarioData.backend_framework,
      database: scenarioData.database,
      
      ai_component: scenarioData.ai_component,
      ai_type: scenarioData.ai_type,
      ai_maturity: scenarioData.ai_maturity,
      
      cybersecurity_level: scenarioData.cybersecurity_level,
      encryption_level: scenarioData.encryption_level,
      gdpr_compliance: scenarioData.gdpr_compliance,
      iso27001: scenarioData.iso27001,
      penetration_testing: scenarioData.penetration_testing,
      security_audit_score: scenarioData.security_audit_score,
      vulnerabilities_found: scenarioData.vulnerabilities_found,
      
      team_size: scenarioData.team_size,
      senior_developers: scenarioData.senior_developers,
      vendor_experience: scenarioData.vendor_experience,
      digital_skill_score: scenarioData.digital_skill_score,
      staff_turnover: scenarioData.staff_turnover,
      project_manager_experience_years: scenarioData.project_manager_experience_years,
      previous_projects: scenarioData.previous_projects,
      previous_success_rate: scenarioData.previous_success_rate,
      contractor_rating: scenarioData.contractor_rating,
      
      testing_coverage: scenarioData.testing_coverage,
      compliance_score: scenarioData.compliance_score,
      audit_findings: scenarioData.audit_findings,
      scrum_maturity: scenarioData.scrum_maturity,
      user_training: scenarioData.user_training,
      digital_maturity: scenarioData.digital_maturity,
      chatbot_usage: scenarioData.chatbot_usage,
      
      citizen_users: scenarioData.citizen_users,
      expected_transactions: scenarioData.expected_transactions,
      digital_adoption_rate: scenarioData.digital_adoption_rate,
      citizen_complaints: scenarioData.citizen_complaints,
      system_availability_target: scenarioData.system_availability_target,
      
      procurement_delay_days: scenarioData.procurement_delay_days,
      approval_delay_days: scenarioData.approval_delay_days,
      inflation_rate: scenarioData.inflation_rate,
      contract_amendments: scenarioData.contract_amendments,
      legal_disputes: scenarioData.legal_disputes,
      permit_complexity: scenarioData.permit_complexity,
      stakeholder_count: scenarioData.stakeholder_count,
      change_requests: scenarioData.change_requests,
      
      digital_service: scenarioData.digital_service,
      approved_budget_mad: scenarioData.approved_budget_mad,
      contract_value_mad: scenarioData.contract_value_mad,
      estimated_team_size: scenarioData.estimated_team_size,
    };
  }, []);

  const runAIPrediction = useCallback(async (scenarioData) => {
    if (!aiConnected) {
      setAiError("AI service is not connected.");
      return null;
    }

    setIsLoading(true);
    setAiError(null);
    setValidationErrors({});

    try {
      const payload = prepareAIPayload(scenarioData);
      
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 422) {
        const errorData = await response.json();
        
        if (errorData.detail) {
          const errors = {};
          if (Array.isArray(errorData.detail)) {
            errorData.detail.forEach((err) => {
              if (err.loc) {
                const field = err.loc[err.loc.length - 1];
                errors[field] = err.msg;
              }
            });
          }
          setValidationErrors(errors);
          const firstError = Object.values(errors)[0];
          setAiError(`Validation error: ${firstError || 'Please check your inputs.'}`);
        }
        return null;
      }

      if (!response.ok) {
        throw new Error(`AI prediction failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("AI Prediction Error:", error);
      setAiError(error.message || "Unknown error occurred");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [aiConnected, prepareAIPayload]);

  // ============================
  // RUN SIMULATION
  // ============================
  
  const runSimulation = useCallback(async () => {
    if (!scenario.project_name) {
      setValidationErrors({ project_name: "Project name is required" });
      setFormStep(0); // Jump back to General step
      return;
    }

    const aiResult = await runAIPrediction(scenario);

    if (aiResult) {
      setResult(aiResult);
      
      const historyItem = {
        id: Date.now(),
        scenarioName: scenario.project_name,
        ministry: scenario.ministry,
        project_type: scenario.project_type,
        budget: scenario.planned_budget_mad,
        teamSize: scenario.team_size,
        duration: scenario.planned_duration_days,
        aiPrediction: aiResult.prediction,
        confidence: aiResult.confidence / 100,
        successRate: aiResult.success_probability,
        riskScore: aiResult.risk_score,
        timestamp: new Date().toISOString(),
      };
      saveHistory(historyItem);

      setActiveTab("results");
    }
  }, [scenario, runAIPrediction, saveHistory]);

  // ============================
  // WHAT-IF ANALYSIS
  // ============================
  
  const runWhatIfSimulation = useCallback(async (field, value) => {
    const updatedScenario = {
      ...scenario,
      [field]: value,
    };
    
    setWhatIfChanges({
      ...whatIfChanges,
      [field]: value,
    });
    
    const aiResult = await runAIPrediction(updatedScenario);
    
    if (aiResult) {
      setResult(aiResult);
    }
  }, [scenario, whatIfChanges, runAIPrediction]);

  // ============================
  // RENDER FUNCTIONS
  // ============================

  const renderField = (label, name, type = "text", options = null, tooltip = null, required = false) => {
    const isSelect = options !== null;
    const value = scenario[name];
    const error = validationErrors[name];

    return (
      <div>
        <label className="text-xs font-medium text-slate-600 uppercase tracking-wider block mb-1.5">
          <div className="flex items-center gap-1.5 font-semibold">
            {label}
            {required && <span className="text-rose-500">*</span>}
            {tooltip && (
              <Tooltip content={tooltip}>
                <span className="text-slate-400" />
              </Tooltip>
            )}
          </div>
        </label>
        {isSelect ? (
          <select
            name={name}
            value={value}
            onChange={handleChange}
            className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all ${
              error ? 'border-rose-500 bg-rose-50' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            name={name}
            placeholder={`Enter ${label.toLowerCase()}`}
            value={value}
            onChange={type === "number" ? handleNumberChange : handleChange}
            step={type === "number" ? "any" : undefined}
            className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all ${
              error ? 'border-rose-500 bg-rose-50' : 'border-slate-200 hover:border-slate-300'
            }`}
          />
        )}
        {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
      </div>
    );
  };

  // ============================
  // RENDER INPUT TAB
  // ============================
  
  const renderInputTab = () => (
    <div className="grid lg:grid-cols-3 gap-6 items-start relative">
      {/* Left Columns - Stepper & Form Configuration */}
      <div className="lg:col-span-2 space-y-4">
        {/* Wizard Multi-Step Container */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <FiBookOpen className="text-indigo-600" size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-slate-900">Project Configuration</h2>
              <p className="text-sm text-slate-500">Step-by-step setup for AI-powered risk assessment</p>
            </div>
          </div>

          {/* Stepper Header */}
          <div className="mb-8 relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 z-0 hidden md:block" />
            <div className="relative flex justify-between items-center z-10 flex-wrap gap-4 md:gap-0">
              {steps.map((step, idx) => {
                const StepIcon = step.icon;
                const isCompleted = idx < formStep;
                const isActive = idx === formStep;
                return (
                  <button
                    key={idx}
                    onClick={() => setFormStep(idx)}
                    className="flex flex-col items-center group flex-1"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        isCompleted
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                          : isActive
                          ? "bg-white border-indigo-600 text-indigo-600 shadow-md scale-105"
                          : "bg-white border-slate-200 text-slate-400 group-hover:border-slate-300"
                      }`}
                    >
                      {isCompleted ? <FiCheckCircle size={18} /> : <StepIcon size={18} />}
                    </div>
                    <span
                      className={`text-xs mt-2 font-medium transition-all text-center max-w-[100px] md:max-w-none ${
                        isActive ? "text-indigo-600 font-bold" : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    >
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {Object.keys(validationErrors).length > 0 && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-sm font-medium text-rose-700 mb-1">Please fix the following errors:</p>
              <ul className="text-xs text-rose-600 list-disc list-inside">
                {Object.entries(validationErrors).map(([field, error]) => (
                  <li key={field}>{field}: {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Step Contents */}
          <div className="min-h-[380px]">
            {formStep === 0 && (
              <div className="space-y-6">
                <FieldGroup title="Project Information" icon={FiHome}>
                  {renderField("Project Name", "project_name", "text", null, 
                    "Unique identifier for your project. This helps track and reference the assessment.", true)}
                  {renderField("Ministry", "ministry", "text", [
                    "Digital Transition", "Health", "Education", "Interior", 
                    "Agriculture", "Equipment & Transport", "Water & Energy"
                  ], "Select the ministry responsible for this project.")}
                  {renderField("Project Type", "project_type", "text", [
                    "AI Chatbot", "Cloud Migration", "Digital Identity", "Open Data Platform",
                    "National Registry", "Tax Platform", "Customs System", "Smart City",
                    "Digital Platform", "Cloud Infrastructure", "Cybersecurity System"
                  ], "The primary category of digital transformation initiative.")}
                  {renderField("Region", "region", "text", [
                    "Casablanca-Settat", "Rabat-Salé-Kénitra", "Marrakech-Safi", 
                    "Fès-Meknès", "Tanger-Tétouan-Al Hoceïma"
                  ], "Geographic region where the project will be implemented.")}
                  {renderField("Province", "province", "text", null, 
                    "Specific province within the selected region.")}
                  {renderField("Strategic Importance", "strategic_importance", "text", [
                    "Low", "Medium", "High", "Critical"
                  ], "The strategic priority of this project within the ministry's portfolio.")}
                  {renderField("Project Priority", "project_priority", "text", [
                    "Low", "Medium", "High", "Critical"
                  ], "The internal priority level assigned to this project.")}
                </FieldGroup>

                <FieldGroup title="Financial Parameters" icon={FiDollarSign}>
                  {renderField("Budget (MAD)", "planned_budget_mad", "number", null, 
                    "Total planned budget for the project in Moroccan Dirhams. This is a key risk factor.", true)}
                  {renderField("Budget Sufficiency", "budget_sufficiency", "number", null, 
                    "The adequacy of the planned budget (0-1). 1.0 means fully sufficient, lower values indicate potential funding gaps.", true)}
                  {renderField("Duration (Days)", "planned_duration_days", "number", null, 
                    "Expected project duration in calendar days. Longer projects typically carry higher risk.", true)}
                  {renderField("Funding Source", "funding_source", "text", [
                    "National Budget", "International Grant", "Public-Private Partnership", "Mixed"
                  ], "The primary funding mechanism for the project.")}
                  {renderField("Procurement Method", "procurement_method", "text", [
                    "International Tender", "National Tender", "Direct Award", "Framework Agreement"
                  ], "The procurement approach used for vendor selection.")}
                </FieldGroup>
              </div>
            )}

            {formStep === 1 && (
              <div className="space-y-6">
                <FieldGroup title="Technical Assessment" icon={FiCloud}>
                  {renderField("Cloud Provider", "cloud_provider", "text", [
                    "AWS", "Azure", "GCP", "Hybrid", "On-Premise"
                  ], "The cloud infrastructure platform selected for the project.")}
                  {renderField("Software Complexity", "software_complexity", "text", [
                    "Low", "Medium", "High", "Very High"
                  ], "The technical complexity of the software being developed or implemented.")}
                  {renderField("Integration Complexity", "integration_complexity", "text", [
                    "Low", "Medium", "High", "Very High"
                  ], "The difficulty of integrating with existing systems and third-party services.")}
                  {renderField("API Count", "api_count", "number", null, 
                    "Number of APIs that need to be developed or integrated. Higher counts increase complexity.")}
                  {renderField("Legacy Systems", "legacy_systems", "number", null, 
                    "Number of existing legacy systems that need to be integrated or replaced.")}
                  {renderField("Interoperability Score", "interoperability_score", "number", null, 
                    "A score (0-100) indicating how well the project will integrate with existing infrastructure.")}
                  {renderField("Microservices", "microservices", "text", [
                    "Yes", "No"
                  ], "Whether the solution uses a microservices architecture.")}
                  {renderField("Backend Framework", "backend_framework", "text", null, 
                    "The primary backend development framework being used.")}
                </FieldGroup>

                <FieldGroup title="Artificial Intelligence" icon={FiCpu}>
                  {renderField("AI Component", "ai_component", "text", [
                    "Yes", "No"
                  ], "Whether the project includes artificial intelligence or machine learning capabilities.")}
                  {scenario.ai_component === "Yes" && (
                    <>
                      {renderField("AI Type", "ai_type", "text", [
                        "Chatbot", "NLP", "Computer Vision", "Recommendation", 
                        "Decision Support", "Predictive Analytics"
                      ], "The specific type of AI technology being implemented.")}
                      {renderField("AI Maturity", "ai_maturity", "number", null, 
                        "The maturity level of the AI solution (0-1). Higher values indicate more proven technology.")}
                    </>
                  )}
                </FieldGroup>
              </div>
            )}

            {formStep === 2 && (
              <div className="space-y-6">
                <FieldGroup title="Security & Compliance" icon={FiShield}>
                  {renderField("Cybersecurity Level", "cybersecurity_level", "text", [
                    "Low", "Medium", "High", "Critical"
                  ], "The required cybersecurity posture for the project.")}
                  {renderField("Encryption Level", "encryption_level", "text", [
                    "None", "Basic", "Strong", "Military Grade"
                  ], "The encryption standard applied to data at rest and in transit.")}
                  {renderField("GDPR Compliance", "gdpr_compliance", "text", [
                    "Yes", "No"
                  ], "Whether the solution complies with GDPR data protection requirements.")}
                  {renderField("ISO27001", "iso27001", "text", [
                    "Yes", "No"
                  ], "Whether the project follows ISO27001 information security management standards.")}
                  {renderField("Penetration Testing", "penetration_testing", "text", [
                    "Yes", "No"
                  ], "Whether security penetration testing has been conducted.")}
                  {renderField("Security Audit Score", "security_audit_score", "number", null, 
                    "A score (0-100) from security audits. Higher scores indicate better security posture.")}
                  {renderField("Vulnerabilities Found", "vulnerabilities_found", "number", null, 
                    "Number of security vulnerabilities identified during assessment.")}
                </FieldGroup>

                <FieldGroup title="Quality Assurance" icon={FiAward}>
                  {renderField("Testing Coverage", "testing_coverage", "number", null, 
                    "Percentage of code covered by automated tests (0-100). Higher is better.")}
                  {renderField("Compliance Score", "compliance_score", "number", null, 
                    "A score (0-100) measuring regulatory compliance.")}
                  {renderField("Audit Findings", "audit_findings", "number", null, 
                    "Number of issues identified during project audits.")}
                  {renderField("Scrum Maturity", "scrum_maturity", "text", [
                    "Low", "Medium", "High"
                  ], "The team's maturity in using Scrum agile methodology.")}
                  {renderField("User Training", "user_training", "number", null, 
                    "A score (0-100) for user training and adoption readiness.")}
                  {renderField("Digital Maturity", "digital_maturity", "number", null, 
                    "The organization's digital maturity (0-1). Higher values indicate better digital readiness.")}
                </FieldGroup>
              </div>
            )}

            {formStep === 3 && (
              <div className="space-y-6">
                <FieldGroup title="Team & Governance" icon={FiUsers}>
                  {renderField("Team Size", "team_size", "number", null, 
                    "Total number of team members assigned to the project.", true)}
                  {renderField("Senior Developers", "senior_developers", "number", null, 
                    "Number of senior developers with 5+ years of experience on the team.")}
                  {renderField("Vendor Experience", "vendor_experience", "number", null, 
                    "The vendor's experience rating (1-5). Higher values indicate more experienced vendors.")}
                  {renderField("Digital Skill Score", "digital_skill_score", "number", null, 
                    "A score (0-100) measuring the team's digital capabilities.")}
                  {renderField("Staff Turnover", "staff_turnover", "number", null, 
                    "Annual staff turnover rate (0-1). Higher values indicate potential continuity risks.")}
                  {renderField("PM Experience (Years)", "project_manager_experience_years", "number", null, 
                    "Years of experience of the project manager.")}
                </FieldGroup>

                <FieldGroup title="Citizen Impact" icon={FiUsers}>
                  {renderField("Expected Users", "citizen_users", "number", null, 
                    "The number of citizens expected to use the service.", true)}
                  {renderField("Expected Transactions", "expected_transactions", "number", null, 
                    "The expected volume of transactions per year.", true)}
                  {renderField("Digital Adoption Rate", "digital_adoption_rate", "number", null, 
                    "The expected digital adoption rate (0-1) among target users.", true)}
                  {renderField("Citizen Complaints", "citizen_complaints", "number", null, 
                    "Number of complaints received during similar projects.")}
                  {renderField("System Availability Target", "system_availability_target", "number", null, 
                    "The target system availability percentage (e.g., 99.95). Higher values require more investment.")}
                </FieldGroup>
              </div>
            )}
          </div>

          {/* Stepper Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-100">
            <button
              onClick={() => setFormStep((prev) => Math.max(0, prev - 1))}
              disabled={formStep === 0}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                formStep === 0
                  ? "border-slate-100 text-slate-300 cursor-not-allowed"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <FiArrowLeft size={16} /> Back
            </button>

            {formStep < steps.length - 1 ? (
              <button
                onClick={() => setFormStep((prev) => Math.min(steps.length - 1, prev + 1))}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-semibold transition-all"
              >
                Next <FiArrowRight size={16} />
              </button>
            ) : (
              <div className="flex gap-2">
                {!aiConnected && (
                  <button
                    onClick={checkAIConnection}
                    className="px-4 py-3 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg font-medium transition-all"
                  >
                    <FiRefreshCw size={16} />
                  </button>
                )}
                <button
                  onClick={runSimulation}
                  disabled={isLoading || !aiConnected}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-lg px-6 py-3 font-semibold transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Analyzing Project...
                    </>
                  ) : (
                    <>
                      <FiZap size={18} />
                      Run Risk Assessment
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {aiError && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-700">{aiError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Sticky Results Summary */}
      <div className="space-y-4 lg:sticky lg:top-6 self-start">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <FiServer className="text-indigo-600" size={18} />
            Risk Engine
          </h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 mt-0.5">•</span>
              XGBoost model trained on 10,000+ Moroccan projects
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 mt-0.5">•</span>
              SHAP explainability for transparent decisions
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 mt-0.5">•</span>
              Real-time risk assessment with what-if analysis
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 mt-0.5">•</span>
              Success probability calculation
            </li>
          </ul>
        </div>

        {result && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-fadeIn">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FiTarget size={18} />
              Assessment Results
            </h3>

            <div className={`mb-4 p-3 rounded-lg border bg-${getRiskColor(result.prediction)}-50 border-${getRiskColor(result.prediction)}-200`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = getRiskIcon(result.prediction);
                    return <Icon className={`text-${getRiskColor(result.prediction)}-600`} size={20} />;
                  })()}
                  <span className={`font-bold text-${getRiskColor(result.prediction)}-600`}>
                    {result.prediction} Risk
                  </span>
                </div>
                <span className={`text-xs text-${getRiskColor(result.prediction)}-600 font-semibold`}>
                  XGBoost Prediction
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {result.prediction === "Low" && "The project shows strong indicators of success with minimal identified risks."}
                {result.prediction === "Medium" && "Several risk factors identified. Success achievable with proper mitigation."}
                {result.prediction === "High" && "Significant risks identified that could threaten project success."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-lg border bg-emerald-50/50 border-emerald-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 font-medium">Success</p>
                  <FiSuccess className="text-emerald-600" size={16} />
                </div>
                <p className="text-xl font-bold text-emerald-600">
                  {result.success_probability?.toFixed(1) || 0}%
                </p>
              </div>
              <div className="p-3 rounded-lg border bg-indigo-50/50 border-indigo-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 font-medium">Confidence</p>
                  <FiActivity className="text-indigo-600" size={16} />
                </div>
                <p className="text-xl font-bold text-indigo-600">
                  {result.confidence?.toFixed(1) || 0}%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-lg border bg-amber-50/50 border-amber-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 font-medium">Risk Score</p>
                  <FiAlertTriangle className="text-amber-600" size={16} />
                </div>
                <p className={`text-xl font-bold text-${getRiskColor(result.prediction)}-600`}>
                  {result.risk_score?.toFixed(1) || 0}/100
                </p>
              </div>
              <div className="p-3 rounded-lg border bg-slate-50/50 border-slate-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 font-medium">Probabilities</p>
                  <FiPieChart className="text-slate-600" size={16} />
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  {result.risk_probabilities && Object.entries(result.risk_probabilities).map(([level, prob]) => (
                    <span key={level} className="mr-2 inline-block">
                      {level}: {prob.toFixed(1)}%
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {result.top_features && result.top_features.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Key Risk Drivers
                </p>
                <div className="space-y-1.5">
                  {result.top_features.slice(0, 5).map((factor, idx) => {
                    const isRiskIncrease = factor.impact === 'supports';
                    return (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 truncate max-w-[55%]">{factor.feature_label}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold ${isRiskIncrease ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {isRiskIncrease ? '↑ Increases Risk' : '↓ Reduces Risk'}
                          </span>
                          <span className="text-xs text-slate-400">({factor.shap_value.toFixed(3)})</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {result.recommendations && result.recommendations.length > 0 && (
              <div className="mt-3 p-3 bg-indigo-50 rounded-lg">
                <p className="text-xs font-semibold text-indigo-600 mb-2">Recommendations</p>
                <ul className="text-xs text-slate-700 space-y-1">
                  {result.recommendations.slice(0, 3).map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-indigo-500 mt-0.5">•</span>
                      <span>
                        <strong>{rec.action}</strong> - {rec.details}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ============================
  // RENDER RESULTS TAB
  // ============================
  
  const renderResultsTab = () => {
    if (!result) {
      return (
        <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center">
          <FiBarChart2 className="text-4xl text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Assessment Results</h3>
          <p className="text-sm text-slate-500">
            Run a simulation to see detailed risk assessment results.
          </p>
          <button
            onClick={() => setActiveTab("input")}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-all"
          >
            Configure Project
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Risk Level</p>
            <p className={`text-2xl font-bold text-${getRiskColor(result.prediction)}-600 mt-1`}>
              {result.prediction}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Success Probability</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {result.success_probability?.toFixed(1) || 0}%
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">AI Confidence</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">
              {result.confidence?.toFixed(1) || 0}%
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Risk Score</p>
            <p className={`text-2xl font-bold text-${getRiskColor(result.prediction)}-600 mt-1`}>
              {result.risk_score?.toFixed(1) || 0}
            </p>
          </div>
        </div>

        {result.risk_breakdown && result.risk_breakdown.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FiBarChart size={18} />
              SHAP Feature Importance
            </h3>
            <div className="space-y-3">
              {result.risk_breakdown.map((item, idx) => {
                const isRiskIncrease = item.sign === '+';
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-slate-600">{item.feature}</span>
                      <span className={`font-semibold ${isRiskIncrease ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {item.sign}{item.percentage?.toFixed(1) || 0}% {isRiskIncrease ? 'Risk Increase' : 'Risk Reduction'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-1">
                      <div
                        className={`h-2 rounded-full ${isRiskIncrease ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.abs(item.percentage || 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-3 font-medium">
              Positive percentages contribute directly to a higher Risk Prediction. Negative percentages support Risk Reduction.
            </p>
          </div>
        )}

        {result.digital_insights && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FiCpu size={18} />
              Digital Transformation Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(result.digital_insights).map(([key, value]) => {
                if (!value) return null;
                return (
                  <div key={key} className="p-3 rounded-lg border border-slate-200">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      {key.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm font-semibold text-slate-800 mt-1">{value.feature_label}</p>
                    <p className="text-xs text-slate-500">Value: {value.feature_value}</p>
                    <p className={`text-xs font-semibold mt-1 ${value.impact === 'supports' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {value.impact === 'supports' ? '↑ Increases Risk' : '↓ Reduces Risk'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {result.recommendations && result.recommendations.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FiThumbsUp size={18} />
              Recommendations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.recommendations.map((rec, idx) => (
                <div key={idx} className="p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      rec.priority === 'Critical' ? 'bg-rose-100 text-rose-700' :
                      rec.priority === 'High' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {rec.priority}
                    </span>
                    <span className="text-xs text-slate-400">{rec.feature}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{rec.action}</p>
                  <p className="text-xs text-slate-500 mt-1">{rec.details}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FiSliders size={18} />
            What-If Analysis
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            Adjust key parameters to understand their impact on the risk prediction
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">
                Testing Coverage ({scenario.testing_coverage}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={scenario.testing_coverage}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setScenario({ ...scenario, testing_coverage: val });
                  runWhatIfSimulation('testing_coverage', val);
                }}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">
                Vendor Experience ({scenario.vendor_experience})
              </label>
              <input
                type="range"
                min="1"
                max="5"
                step="0.1"
                value={scenario.vendor_experience}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setScenario({ ...scenario, vendor_experience: val });
                  runWhatIfSimulation('vendor_experience', val);
                }}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">
                Digital Skills ({scenario.digital_skill_score}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={scenario.digital_skill_score}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setScenario({ ...scenario, digital_skill_score: val });
                  runWhatIfSimulation('digital_skill_score', val);
                }}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">
                Team Size ({scenario.team_size})
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={scenario.team_size}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setScenario({ ...scenario, team_size: val });
                  runWhatIfSimulation('team_size', val);
                }}
                className="w-full"
              />
            </div>
          </div>

          {Object.keys(whatIfChanges).length > 0 && (
            <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
              <p className="text-xs text-indigo-600 font-semibold">
                What-If Analysis Applied - Updated Prediction: {result.prediction} Risk
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================
  // RENDER HISTORY TAB
  // ============================
  
  const renderHistoryTab = () => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <FiClock size={18} />
          Assessment History
        </h3>
        <span className="text-xs text-slate-400 font-medium">
          {history.length} assessments saved
        </span>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-8">
          <FiBarChart2 className="text-4xl text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No assessments have been saved yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                <th className="text-left py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Project</th>
                <th className="text-left py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Risk</th>
                <th className="text-left py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Success</th>
                <th className="text-left py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Confidence</th>
                <th className="text-left py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 text-sm text-slate-600">{formatDate(item.timestamp)}</td>
                  <td className="py-3 text-sm font-medium text-slate-900">{item.scenarioName}</td>
                  <td className="py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      item.aiPrediction === "Low" ? "bg-emerald-100 text-emerald-700" :
                      item.aiPrediction === "Medium" ? "bg-amber-100 text-amber-700" :
                      "bg-rose-100 text-rose-700"
                    }`}>
                      {item.aiPrediction}
                    </span>
                  </td>
                  <td className="py-3 text-sm font-semibold text-emerald-600">
                    {item.successRate?.toFixed(1) || 0}%
                  </td>
                  <td className="py-3 text-sm font-semibold text-slate-700">
                    {(item.confidence * 100).toFixed(1)}%
                  </td>
                  <td className="py-3">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          setScenario({
                            ...scenario,
                            project_name: item.scenarioName,
                            ministry: item.ministry || "Digital Transition",
                            planned_budget_mad: item.budget,
                            team_size: item.teamSize,
                            planned_duration_days: item.duration,
                          });
                          setActiveTab("input");
                          setFormStep(0); // Reset wizard back to first step on load
                        }}
                        className="text-indigo-500 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Load scenario"
                      >
                        <FiRefreshCw size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm("Delete this assessment record?")) {
                            const updatedHistory = history.filter((h) => h.id !== item.id);
                            setHistory(updatedHistory);
                            localStorage.setItem("simulationHistory", JSON.stringify(updatedHistory));
                          }
                        }}
                        className="text-rose-500 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-all"
                        title="Delete"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ============================
  // MAIN RENDER
  // ============================
  
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50/80 p-6">
        {/* AI Status Banner */}
        <div className={`mb-6 p-4 rounded-lg border ${aiConnected ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-full ${aiConnected ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                <FiServer className={aiConnected ? 'text-emerald-600' : 'text-amber-600'} size={18} />
              </div>
              <div>
                <p className={`text-sm font-semibold ${aiConnected ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {aiConnected ? 'XGBoost Risk Engine Connected' : 'XGBoost Risk Engine Offline'}
                </p>
                {modelInfo && (
                  <p className="text-xs text-slate-500">
                    Model: {modelInfo.model_type} • {modelInfo.n_features} features • {modelInfo.risk_levels?.join(' / ') || 'Low / Medium / High'}
                  </p>
                )}
                {aiError && (
                  <p className="text-xs text-amber-600 mt-1">{aiError}</p>
                )}
              </div>
            </div>
            <button
              onClick={checkAIConnection}
              className="text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all font-medium text-slate-700"
            >
              <FiRefreshCw size={12} className="inline mr-1" /> Check Connection
            </button>
          </div>
        </div>

        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <FiCpu className="text-indigo-600" size={24} />
                AI Decision Simulator
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                XGBoost-powered risk assessment with SHAP explainability
              </p>
            </div>
            <div className="flex items-center gap-2">
              {history.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm("Clear all assessment history?")) {
                      setHistory([]);
                      localStorage.removeItem("simulationHistory");
                    }
                  }}
                  className="text-sm font-semibold text-rose-600 hover:text-rose-700 px-4 py-2 rounded-lg hover:bg-rose-50 transition-all"
                >
                  Clear History
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("input")}
            className={`px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "input"
                ? "text-indigo-600 border-b-2 border-indigo-600 font-semibold"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <FiBarChart2 className="inline mr-1" /> Input & Results
          </button>
          <button
            onClick={() => setActiveTab("results")}
            className={`px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "results"
                ? "text-indigo-600 border-b-2 border-indigo-600 font-semibold"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <FiPieChart className="inline mr-1" /> Detailed Results
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "history"
                ? "text-indigo-600 border-b-2 border-indigo-600 font-semibold"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <FiClock className="inline mr-1" /> History
          </button>
        </div>

        {/* Active Tab Content */}
        {activeTab === "input" && renderInputTab()}
        {activeTab === "results" && renderResultsTab()}
        {activeTab === "history" && renderHistoryTab()}
      </div>
    </DashboardLayout>
  );
}
