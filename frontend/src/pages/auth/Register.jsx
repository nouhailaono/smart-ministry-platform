import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "viewer", // Enforced as system default
  });

  // State flags for interactive UI
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" }); // type: "success" | "error"
  const [emailError, setEmailError] = useState("");
  const [touchedFields, setTouchedFields] = useState({ name: false, email: false, password: false });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleBlur = (field) => {
    setTouchedFields({ ...touchedFields, [field]: true });
  };

  // Real-time email validation matching secure government domain pattern
  useEffect(() => {
    if (touchedFields.email && formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setEmailError("Invalid email format");
    } else {
      setEmailError("");
    }
  }, [formData.email, touchedFields.email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouchedFields({ name: true, email: true, password: true });

    // Client-side guard rails
    if (!formData.name.trim()) {
      setStatus({ type: "error", text: "Please enter your full name" });
      return;
    }
    if (emailError || !formData.email) {
      setStatus({ type: "error", text: "Please provide a valid institutional email" });
      return;
    }
    if (formData.password.length < 6) {
      setStatus({ type: "error", text: "Password must be at least 6 characters long" });
      return;
    }

    setStatus({ type: "", text: "" });
    setIsLoading(true);

    try {
      const res = await api.post("/auth/register", formData);
      setStatus({ type: "success", text: res.data.message || "Account created successfully!" });
      
      // Auto-redirect to login after success with a brief reading window
      setTimeout(() => {
        navigate("/login");
      }, 2500);
    } catch (err) {
      setStatus({
        type: "error",
        text: err.response?.data?.message || "Registration failed. Please contact your system administrator.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-gradient-to-br from-stone-950 via-stone-900 to-slate-950 text-stone-200 font-sans antialiased selection:bg-blue-500/30 selection:text-blue-200 relative overflow-hidden">
      
      {/* Background Graphic Accents */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl" />
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(59, 130, 246, 0.03) 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }} />
      </div>

      {/* LEFT PANEL: Branding Context */}
      <div className="hidden lg:flex lg:w-5/12 p-12 flex-col justify-between relative z-10 bg-stone-900/40 backdrop-blur-sm border-r border-stone-800/60">
        <div className="absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2 border-blue-500/20" />
        <div className="absolute bottom-8 left-8 w-16 h-16 border-b-2 border-l-2 border-blue-500/20" />
        
        {/* Header App Identity */}
        <div className="flex items-center gap-4 group cursor-default">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg flex items-center justify-center relative overflow-hidden transition-all">
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
            <svg className="w-6 h-6 text-white z-10 filter drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="tracking-[0.15em] text-xs font-bold uppercase bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Smart Ministry
            </span>
            <span className="text-[10px] text-blue-500/60 tracking-wider uppercase font-medium mt-0.5">
              Governance Platform
            </span>
          </div>
        </div>

        {/* Display Insight Card */}
        <div className="relative group max-w-md">
          <div className="relative bg-stone-900/60 backdrop-blur-xl rounded-2xl p-8 border border-stone-800/80 shadow-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 tracking-wide">
              IDENTITY MANAGEMENT
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl font-light tracking-tight text-stone-100 leading-snug">
                Request access<br />
                <span className="font-semibold bg-gradient-to-r from-blue-400 via-indigo-400 to-stone-300 bg-clip-text text-transparent">
                  to administrative nodes
                </span>
              </h1>
              <p className="text-stone-400 text-sm leading-relaxed font-light">
                Submit your registration credentials to configure your access level profile within our security schema.
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Footer Information */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-[10px] tracking-widest text-blue-500/40 font-medium uppercase border-t border-stone-800/60 pt-6">
            <span className="flex items-center gap-2">ROLE-BASED RBAC ENABLED</span>
            <span>v3.0.0</span>
          </div>
          <div className="flex gap-3 text-[10px] text-stone-500">
            <span>Kingdom of Morocco</span>
            <span>•</span>
            <span>Ministry of Digital Transition</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Form Block */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-6 md:p-12 relative z-10 bg-stone-900/10 overflow-y-auto">
        <div className="w-full max-w-md my-auto">
          
          <div className="bg-stone-900/90 backdrop-blur-xl rounded-3xl p-8 border border-stone-700/60 shadow-2xl shadow-stone-950/80">
            
            <div className="text-center mb-8">
              <div className="inline-block mb-3">
                <div className="w-12 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 rounded-full" />
              </div>
              <h2 className="text-2xl font-light tracking-tight text-white">
                Account Registration
              </h2>
              <p className="text-sm text-stone-400 mt-2">
                Join the secure system cluster
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              
              {/* Dynamic Notification Message Plates */}
              {status.text && (
                <div className={`p-4 text-sm rounded-2xl flex items-start gap-3 backdrop-blur-sm border ${
                  status.type === "success" 
                    ? "text-emerald-200 bg-emerald-950/60 border-emerald-900/60" 
                    : "text-rose-200 bg-rose-950/60 border-rose-900/60"
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    status.type === "success" ? "bg-emerald-900/40" : "bg-rose-900/40"
                  }`}>
                    {status.type === "success" ? (
                      <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <span className="flex-1 leading-relaxed">{status.text}</span>
                </div>
              )}

              {/* Full Name Input */}
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-stone-300 tracking-wide uppercase flex items-center gap-2 px-1">
                  <svg className="w-3 h-3 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  disabled={isLoading}
                  placeholder="Ex: Ezzahi Nouhaila"
                  className="w-full bg-stone-950/60 border border-stone-700/70 rounded-2xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50 hover:border-stone-600"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={() => handleBlur("name")}
                />
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[11px] font-medium text-stone-300 tracking-wide uppercase flex items-center gap-2">
                    <svg className="w-3 h-3 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Institutional Email
                  </label>
                  {emailError && touchedFields.email && (
                    <span className="text-[10px] text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-800/40">
                      {emailError}
                    </span>
                  )}
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  disabled={isLoading}
                  placeholder="name@ministere.gov.ma"
                  className="w-full bg-stone-950/60 border border-stone-700/70 rounded-2xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50 hover:border-stone-600"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={() => handleBlur("email")}
                />
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-stone-300 tracking-wide uppercase flex items-center gap-2 px-1">
                  <svg className="w-3 h-3 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    disabled={isLoading}
                    placeholder="••••••••"
                    className="w-full bg-stone-950/60 border border-stone-700/70 rounded-2xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50 hover:border-stone-600 pr-20"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={() => handleBlur("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-blue-400 transition-colors text-[10px] font-medium tracking-wider px-2 py-1 rounded-full hover:bg-stone-800"
                  >
                    {showPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>
              </div>

              {/* Display Default Clearance (Replaces the Interactive Dropdown) */}
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-stone-400 tracking-wide uppercase flex items-center gap-2 px-1">
                  <svg className="w-3 h-3 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Assigned Clearance Tier
                </label>
                <div className="w-full bg-stone-950/30 border border-stone-800 rounded-2xl px-4 py-3 text-sm text-stone-400 flex items-center justify-between cursor-not-allowed">
                  <span>Viewer Profile (Read-only Node)</span>
                  <span className="text-[10px] bg-stone-800 text-stone-400 px-2 py-0.5 rounded-md uppercase tracking-wider font-semibold">
                    Default
                  </span>
                </div>
              </div>

              {/* Submit Component Activation Button */}
              <button
                type="submit"
                disabled={isLoading || !!emailError}
                className="relative w-full group overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-medium py-3.5 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-blue-950/20 mt-6"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Registering Core Profile...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>Register</span>
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9l3 3m0 0l-3 3m3-3H8" />
                    </svg>
                  </span>
                )}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-800" /></div>
                <div className="relative flex justify-center"><span className="px-4 bg-stone-900 text-stone-500 text-xs">or</span></div>
              </div>
              
              {/* Fallback to Active Sign-in Link */}
              <Link
                to="/login"
                className="w-full block text-center bg-stone-800 hover:bg-stone-700/80 text-white text-sm font-medium py-3.5 rounded-2xl transition-all border border-stone-700 hover:border-stone-600"
              >
                Back to Login Workspace
              </Link>
            </form>
          </div>
          
        </div>
      </div>
    </div>
  );
}