import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Field states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Validation and process tracking
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [touchedFields, setTouchedFields] = useState({ email: false, password: false });

  // Load saved email if "Remember Me" was checked
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Real-time inline email format checker
  useEffect(() => {
    if (touchedFields.email && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Invalid email format");
    } else {
      setEmailError("");
    }
  }, [email, touchedFields.email]);

  const handleFieldBlur = (field) => {
    setTouchedFields({ ...touchedFields, [field]: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setTouchedFields({ email: true, password: true });
    
    if (emailError || !email || !password) {
      setError("Please check your credentials");
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Invalid email format");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
    
    setError("");
    setIsLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });
      const { user, token } = res.data;
      
      login(user, token);

      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      const roleRoutes = {
        admin: "/admin",
        director: "/director",
        manager: "/manager",
        viewer: "/viewer",
      };

      navigate(roleRoutes[user.role] || "/login");
    } catch (err) {
      setError(
        err.response?.data?.message || 
        "Authentication failed. Please verify your credentials."
      );
      setPassword("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-gradient-to-br from-stone-950 via-stone-900 to-slate-950 text-stone-200 font-sans antialiased selection:bg-blue-500/30 selection:text-blue-200 relative overflow-hidden">
      
      {/* Creative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        {/* Abstract geometric shapes */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-stone-800/20 rounded-full blur-2xl" />
        
        {/* Creative dots pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(59, 130, 246, 0.03) 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }} />
        
        {/* Wavy lines */}
        <svg className="absolute bottom-0 left-0 w-full opacity-[0.03]" viewBox="0 0 1440 320" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,165.3C1248,149,1344,107,1392,85.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" fill="#3b82f6" />
        </svg>
      </div>

      {/* LEFT PANEL: Creative Corporate Branding */}
      <div className="hidden lg:flex lg:w-5/12 p-12 flex-col justify-between relative z-10 bg-stone-900/40 backdrop-blur-sm border-r border-stone-800/60">
        
        {/* Decorative corner element */}
        <div className="absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2 border-blue-500/20" />
        <div className="absolute bottom-8 left-8 w-16 h-16 border-b-2 border-l-2 border-blue-500/20" />
        
        {/* Core Identity Header */}
        <div className="flex items-center gap-4 group cursor-default relative">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg flex items-center justify-center relative overflow-hidden transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
            <svg className="w-6 h-6 text-white relative z-10 filter drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

        {/* Creative Display Card */}
        <div className="relative group max-w-md">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 via-indigo-500/10 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative bg-stone-900/60 backdrop-blur-xl rounded-2xl p-8 border border-stone-800/80 shadow-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 tracking-wide">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
              </span>
              ACTIVE PORTAL
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl font-light tracking-tight text-stone-100 leading-snug">
                Digital<br />
                <span className="font-semibold bg-gradient-to-r from-blue-400 via-indigo-400 to-stone-300 bg-clip-text text-transparent">
                  Transformation & Governance
                </span>
              </h1>
              <p className="text-stone-400 text-sm leading-relaxed font-light">
                Centralized access to interactive dashboards, predictive analytics, and steering systems designed for administrative excellence.
              </p>
            </div>
            
            {/* Creative feature pills */}
            <div className="flex flex-wrap gap-3 pt-4">
              <div className="flex items-center gap-2 text-[11px] text-stone-300 bg-stone-800/60 px-3 py-1.5 rounded-full border border-stone-700/50">
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Enhanced Security</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-stone-300 bg-stone-800/60 px-3 py-1.5 rounded-full border border-stone-700/50">
                <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Optimal Performance</span>
              </div>
            </div>
          </div>
        </div>

        {/* Creative Footer */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-[10px] tracking-widest text-blue-500/40 font-medium uppercase border-t border-stone-800/60 pt-6">
            <span className="flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              SECURE CONNECTION
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              v3.0.0
            </span>
          </div>
          <div className="flex gap-3 text-[10px] text-stone-500">
            <span>Kingdom of Morocco</span>
            <span>•</span>
            <span>Ministry of Digital Transition</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Creative Dark Form */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-6 md:p-12 relative z-10 bg-stone-900/10">
        <div className="w-full max-w-md">
          
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-stone-800/90 backdrop-blur-sm px-5 py-2.5 rounded-full border border-stone-700 shadow-sm">
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="text-xs font-bold tracking-wider text-stone-200">Smart Ministry</span>
            </div>
          </div>

          {/* Creative Form Container */}
          <div className="bg-stone-900/90 backdrop-blur-xl rounded-3xl p-8 border border-stone-700/60 shadow-2xl shadow-stone-950/80">
            
            {/* Header with creative accent */}
            <div className="text-center mb-8">
              <div className="inline-block mb-3">
                <div className="w-12 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 rounded-full" />
              </div>
              <h2 className="text-2xl font-light tracking-tight text-white">
                Welcome Back
              </h2>
              <p className="text-sm text-stone-400 mt-2">
                Access your secure workspace
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              
              {/* Creative Error Plate */}
              {error && (
                <div className="p-4 text-sm text-rose-200 bg-rose-950/60 border border-rose-900/60 rounded-2xl flex items-start gap-3 animate-shake backdrop-blur-sm">
                  <div className="w-6 h-6 rounded-full bg-rose-900/40 flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="flex-1 leading-relaxed">{error}</span>
                  <button 
                    type="button"
                    onClick={() => setError("")}
                    className="text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Email Field with Creative Label */}
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
                <div className="relative group">
                  <input
                    type="email"
                    required
                    disabled={isLoading}
                    placeholder="name@ministere.gov.ma"
                    className="w-full bg-stone-950/60 border border-stone-700/70 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50 hover:border-stone-600"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => handleFieldBlur("email")}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-blue-500 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                </div>
                {emailError && touchedFields.email && (
                  <p className="text-[10px] text-blue-400/90 mt-1 px-2">
                    Expected format: firstname.lastname@domain.gov.ma
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[11px] font-medium text-stone-300 tracking-wide uppercase flex items-center gap-2">
                    <svg className="w-3 h-3 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Password
                  </label>
                  <Link 
                    to="/forgot-password" 
                    className="text-[11px] text-stone-400 hover:text-blue-400 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={isLoading}
                    placeholder="••••••••"
                    className="w-full bg-stone-950/60 border border-stone-700/70 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50 hover:border-stone-600 pr-24"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => handleFieldBlur("password")}
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

              {/* Remember Me with custom checkbox */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-stone-600 bg-stone-950 text-blue-500 focus:ring-blue-500/20 focus:ring-offset-0 focus:ring-2 transition-all"
                    />
                  </div>
                  <span className="text-xs text-stone-300 group-hover:text-stone-200 transition-colors">
                    Remember me
                  </span>
                </label>
                <div className="text-[10px] text-stone-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Secured
                </div>
              </div>

              {/* Creative Submit Button */}
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
                    <span>Logging in...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>Login</span>
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                )}
              </button>

              {/* Creative Divider */}
              <div className="relative mt-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-800"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-stone-900 text-stone-500 text-xs">
                    or
                  </span>
                </div>
              </div>
              
              {/* Register Link as creative button */}
              <Link
                to="/register"
                className="w-full block text-center bg-stone-800 hover:bg-stone-700/80 text-white text-sm font-medium py-3.5 rounded-2xl transition-all border border-stone-700 hover:border-stone-600"
              >
                Create a new account
              </Link>
            </form>
          </div>
          
          {/* Creative Footer */}
          <div className="mt-6 text-center">
            <p className="text-[10px] text-stone-400 flex items-center justify-center gap-2">
              <span className="inline-flex gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>256-bit SSL Encryption</span>
              </span>
              <span>•</span>
              <span>GDPR Compliant</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}