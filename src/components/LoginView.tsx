import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  ShoppingBag,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Store,
} from 'lucide-react';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
} from '../services/authService';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Helper to translate Firebase Auth errors into helpful Thai messages
  const getThaiErrorMessage = (code?: string, defaultMsg?: string): string => {
    switch (code) {
      case 'auth/invalid-email':
        return 'รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
      case 'auth/email-already-in-use':
        return 'อีเมลนี้ถูกลงทะเบียนไว้ในระบบแล้ว กรุณาเข้าสู่ระบบแทน';
      case 'auth/weak-password':
        return 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
      case 'auth/popup-closed-by-user':
        return 'หน้าต่างล็อกอินถูกปิดก่อนเสร็จสิ้น กรุณาลองใหม่อีกครั้ง';
      case 'auth/network-request-failed':
        return 'เกิดข้อผิดพลาดในการเชื่อมต่ออินเทอร์เน็ต กรุณาตรวจสอบสัญญาณเน็ต';
      case 'auth/too-many-requests':
        return 'มีการพยายามเข้าสู่ระบบผิดพลาดหลายครั้ง กรุณารอสักครู่แล้วลองใหม่';
      default:
        return defaultMsg || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง';
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
      return;
    }

    if (isRegisterMode) {
      if (password.length < 6) {
        setErrorMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('รหัสผ่านยืนยันไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
        return;
      }
    }

    setLoading(true);
    try {
      if (isRegisterMode) {
        await signUpWithEmail(cleanEmail, password);
        setSuccessMessage('สมัครสมาชิกสำเร็จ กำลังเข้าสู่ระบบ...');
      } else {
        await signInWithEmail(cleanEmail, password);
        setSuccessMessage('เข้าสู่ระบบสำเร็จ กำลังโหลดข้อมูล...');
      }
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMessage(getThaiErrorMessage(err?.code, err?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      setSuccessMessage('เข้าสู่ระบบด้วย Google สำเร็จ');
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(getThaiErrorMessage(err?.code, err?.message));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A203F] via-[#0D2B52] to-[#08182B] flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100 font-sans">
      {/* Container Box */}
      <div className="w-full max-w-md bg-white text-[#1F2A44] rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header Header Banner */}
        <div className="bg-gradient-to-r from-[#0D2B52] via-[#18539B] to-[#0D2B52] px-6 pt-8 pb-7 text-center text-white relative">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 border border-white/20 shadow-inner mb-3.5 backdrop-blur-xs">
            <ShoppingBag className="w-7 h-7 text-sky-300" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">SellersApp</h1>
          <p className="text-xs text-sky-100/90 font-medium mt-1">
            ระบบจัดการขาย เอกสาร และบัญชีร้านค้าครบวงจร
          </p>
        </div>

        {/* Tab Switcher: เข้าสู่ระบบ vs สมัครสมาชิก */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 p-1">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(false);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              !isRegisterMode
                ? 'bg-white text-[#0D2B52] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(true);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
              isRegisterMode
                ? 'bg-white text-[#0D2B52] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            ลงทะเบียนร้านค้าใหม่
          </button>
        </div>

        {/* Main Form Content */}
        <div className="p-6 sm:p-7 space-y-5">
          {/* Notification Messages */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <div className="font-semibold leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold animate-fadeIn">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              <div>{successMessage}</div>
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                อีเมลผู้ใช้งาน (Email)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@yourstore.com"
                  disabled={loading || googleLoading}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#18539B] focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-60"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  รหัสผ่าน (Password)
                </label>
                {isRegisterMode && (
                  <span className="text-[10px] text-slate-400">ขั้นต่ำ 6 ตัวอักษร</span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading || googleLoading}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#18539B] focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Register mode only) */}
            {isRegisterMode && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ยืนยันรหัสผ่านอีกครั้ง (Confirm Password)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading || googleLoading}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#18539B] focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-60"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-[#0D2B52] to-[#18539B] hover:from-[#0A203F] hover:to-[#13427C] text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer active:scale-98"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>กำลังดำเนินการ...</span>
                </>
              ) : isRegisterMode ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>สร้างบัญชีและเข้าใช้งาน</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>เข้าสู่ระบบ</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              หรือเข้าสู่ระบบด้วย
            </span>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 cursor-pointer active:scale-98"
          >
            {googleLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                <span>กำลังเชื่อมต่อกับ Google...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>เข้าสู่ระบบด้วย Google</span>
              </>
            )}
          </button>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 text-center">
          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-medium">
            <Store className="w-3.5 h-3.5 text-slate-400" />
            <span>เชื่อมต่อฐานข้อมูล Cloud Firestore & Firebase Auth</span>
          </div>
        </div>
      </div>
    </div>
  );
};
