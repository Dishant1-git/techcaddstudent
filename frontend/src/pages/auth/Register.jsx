import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  Phone,
  User,
  UserPlus,
  Clock,
  ShieldCheck,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [domain, setDomain] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submittedPending, setSubmittedPending] = useState(false);
  const { registerStudent } = useAuth();
  const toast = useToast();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!name.trim() || !email.trim() || !password) {
      toast.warning('Please complete your name, email address, and password.');
      return;
    }

    if (password.length < 6) {
      toast.warning('Your password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      toast.warning('Your password confirmation does not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerStudent({ name, email, phone, domain, password });
      if (res && res.pendingApproval) {
        setSubmittedPending(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (submittedPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100/10 p-8 sm:p-12 text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-50 border-2 border-amber-200 text-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/10 mb-6">
            <Clock className="w-10 h-10 animate-pulse" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 mb-4">
            Pending Verification
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Registration Submitted!
          </h2>

          <p className="mt-3 text-slate-600 text-sm leading-relaxed max-w-md mx-auto">
            Thank you, <span className="font-semibold text-slate-800">{name}</span>! Your student registration details have been securely received.
          </p>

          <div className="mt-6 p-5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-left text-xs leading-relaxed text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              Administrator Verification Required
            </div>
            <p>
              Your request has been forwarded to the institute administration for verification.
              <span className="font-semibold block mt-1">
                Please wait until an administrator approves your account before attempting to sign in.
              </span>
            </p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/login"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              Go to Sign In <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="mt-6 text-xs text-slate-400">
            Account Email: <span className="font-mono text-slate-600 font-semibold">{email}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100/10">
        <section className="lg:col-span-5 bg-gradient-to-br from-[#221e5b] via-[#2e246e] to-[#130f3a] p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-200 hover:text-white transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
            </Link>
            <div className="mt-8 mb-6">
              <div className="inline-block bg-white px-4 py-2.5 rounded-2xl shadow-xl shadow-slate-950/20 border border-white/40">
                <img
                  src="/logo.png"
                  alt="Techcadd - Your Skill & Technology Partner"
                  className="h-10 sm:h-11 w-auto object-contain"
                />
              </div>
            </div>
            <h2 className="mt-8 text-3xl font-extrabold leading-tight">Start your student journey.</h2>
            <p className="mt-3 text-sm leading-relaxed text-indigo-100">
              Register your student account to track attendance, receive updates, and submit private grievances.
            </p>
          </div>

          <div className="relative mt-10 rounded-2xl border border-white/15 bg-white/10 p-4 text-xs leading-relaxed text-indigo-100">
            Your email address is your unique sign-in ID. Once submitted, your registration will be reviewed by an administrator.
          </div>
        </section>

        <section className="lg:col-span-7 p-8 sm:p-10 bg-white">
          <div className="max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Student registration</h2>
                <p className="text-xs text-slate-500 mt-0.5">Account will be activated upon administrator verification.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Full name" icon={User}>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter your full name"
                  className="field-input"
                />
              </Field>

              <Field label="Email address" icon={Mail}>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="field-input"
                />
              </Field>

              <Field label="Phone number (optional)" icon={Phone}>
                <input
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Enter your phone number"
                  className="field-input"
                />
              </Field>

              <Field label="Domain / Field of Interest" icon={BookOpen}>
                <input
                  type="text"
                  list="domain-options"
                  value={domain}
                  onChange={(event) => setDomain(event.target.value)}
                  placeholder="e.g. Web Development, CAD / Mechanical, Data Science"
                  className="field-input"
                />
                <datalist id="domain-options">
                  <option value="Full-Stack Web Development" />
                  <option value="CAD / CAM & Mechanical Design" />
                  <option value="Civil & Architectural Design" />
                  <option value="Data Science & Machine Learning" />
                  <option value="Cybersecurity & Cloud Infrastructure" />
                  <option value="UI/UX Product Design" />
                  <option value="Digital Marketing & SEO" />
                  <option value="Python & AI Development" />
                  <option value="AutoCAD 2D/3D & SolidWorks" />
                  <option value="Industrial Automation / PLC" />
                </datalist>
              </Field>

              <Field label="Password" icon={Lock}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength="6"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  className="field-input pr-11"
                />
                <PasswordVisibilityButton showPassword={showPassword} setShowPassword={setShowPassword} />
              </Field>

              <Field label="Confirm password" icon={Lock}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength="6"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter your password"
                  className="field-input pr-11"
                />
                <PasswordVisibilityButton showPassword={showPassword} setShowPassword={setShowPassword} />
              </Field>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating account...</>
                ) : (
                  <>Create student account <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-500">
              Already registered?{' '}
              <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-700">Sign in to your account</Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
      {label}
      <span className="relative block mt-1.5">
        <Icon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        {children}
      </span>
    </label>
  );
}

function PasswordVisibilityButton({ showPassword, setShowPassword }) {
  return (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      aria-label={showPassword ? 'Hide password' : 'Show password'}
      className="p-1 text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2"
    >
      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );
}
