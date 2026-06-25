import { useNavigate } from 'react-router-dom';
import { Globe, ArrowRight } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060c1a]">
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-30 z-0"
      >
        <source 
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_215831_c6a8989c-d716-4d8d-8745-e972a2eec711.mp4" 
          type="video/mp4" 
        />
      </video>

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#060c1a] via-[#060c1a]/80 to-transparent z-0" />

      {/* Foreground Content */}
      <div className="relative z-10 flex flex-col min-h-screen justify-between">
        {/* Navbar */}
        <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <Globe size={18} className="text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">PaySphere</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="text-slate-300 hover:text-white font-semibold text-sm transition-all"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all"
            >
              Register
            </button>
          </div>
        </header>

        {/* Hero */}
        <div className="max-w-7xl mx-auto w-full px-6 flex-1 flex flex-col justify-center items-start space-y-6 py-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold uppercase tracking-wider">
            Trusted Platform for Cross-Border Settlement
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-white max-w-3xl leading-[1.1] tracking-tight">
            Secure cross-border payments built for modern businesses.
          </h1>

          <p className="text-slate-400 text-lg md:text-xl max-w-xl">
            Settle payments, manage beneficiaries, calculate exchange rates, and audit compliance from a single dashboard.
          </p>

          <div className="flex gap-4 pt-2">
            <button
              onClick={() => navigate('/login')}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 font-bold px-6 py-3.5 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all duration-300"
            >
              Start a Transfer <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-white/[0.06] bg-black/20 py-6">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
            <p>&copy; 2026 PaySphere Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#privacy" className="hover:text-slate-300">Privacy Policy</a>
              <a href="#terms" className="hover:text-slate-300">Terms of Service</a>
              <a href="#support" className="hover:text-slate-300">Compliance & Security</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
