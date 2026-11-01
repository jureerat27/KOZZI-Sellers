import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  ShoppingBag,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Store,
} from 'lucide-react';
import {
  signInWithEmail,
  signInWithGoogle,
} from '../services/authService';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Helper to translate Firebase Auth errors into helpful Thai messages
  const getThaiErrorMessage = (code?: string, defaultMsg?: string): string => {
    switch (code) {
      case 'auth/operation-not-allowed':
        return 'วิธีล็อกอินนี้ยังไม่ได้เปิดใช้งานใน Firebase Console (สำหรับ Email/Password กรุณาเข้าไปเปิดที่ Firebase Console > Authentication > Sign-in method หรือกดล็อกอินด้วย Google ด้านล่างแทน)';
      case 'auth/invalid-email':
        return 'รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
      case 'auth/popup-closed-by-user':
        return 'หน้าต่างล็อกอิน Google ถูกปิดก่อนเสร็จสิ้น (หากเปิดผ่านแอป LINE หรือ Facebook ระบบ Google จะบล็อกหน้าต่างไว้ แนะนำให้แตะปุ่ม 3 จุด ⋯ แล้วเลือก "เปิดด้วย Safari / Chrome" แทนครับ)';
      case 'auth/popup-blocked':
        return 'เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป กรุณากด "อนุญาตป๊อปอัป (Allow Popups)" ในการตั้งค่าเบราว์เซอร์ หรือหากเปิดจากแอป LINE ให้กดปุ่ม 3 จุดแล้วเลือก "เปิดในเบราว์เซอร์ภายนอก / Safari / Chrome"';
      case 'auth/unauthorized-domain':
        return `โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase Auth (Authorized domains) [${code}]: กรุณาเพิ่มโดเมนของแอปนี้ใน Firebase Console > Authentication > Settings > Authorized domains`;
      case 'auth/cancelled-popup-request':
        return 'มีการกดยกเลิกหรือกดย้ำหน้าต่างล็อกอิน กรุณารอสักครู่แล้วลองกดใหม่อีกครั้ง';
      case 'auth/network-request-failed':
        return 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย กรุณาตรวจสอบสัญญาณอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง';
      case 'auth/too-many-requests':
        return 'มีการพยายามเข้าสู่ระบบผิดพลาดหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง';
      default:
        return defaultMsg
          ? `${defaultMsg} (${code || 'error'})`
          : `เกิดข้อผิดพลาดในการเข้าสู่ระบบ (${code || 'unknown'}) กรุณาลองใหม่อีกครั้ง`;
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

    setLoading(true);
    try {
      await signInWithEmail(cleanEmail, password);
      setSuccessMessage('เข้าสู่ระบบสำเร็จ กำลังโหลดข้อมูล...');
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
      setSuccessMessage('เข้าสู่ระบบด้วย Google สำเร็จ กำลังเข้าสู่ระบบ...');
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      setErrorMessage(getThaiErrorMessage(err?.code, err?.message));
    } finally {
      setGoogleLoading(false);
    }
  };

  // Detect if running inside in-app browser like LINE or Facebook
  const isLineOrInApp = typeof navigator !== 'undefined' && /Line|FBAN|FBAV|Instagram/i.test(navigator.userAgent);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#18181B] via-[#18181B] to-[#18181B] flex flex-col justify-center items-center p-4 sm:p-6 text-zinc-100 font-sans">
      {/* Container Box */}
      <div className="w-full max-w-md bg-white text-[#18181B] rounded-xl shadow-2xl border border-zinc-100 overflow-hidden">
        {/* Header Header Banner */}
        <div className="bg-gradient-to-r from-[#18181B] via-[#27272A] to-[#18181B] px-6 pt-8 pb-7 text-center text-white relative">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-white/10 border border-white/20 shadow-inner mb-3.5 backdrop-blur-xs">
            <ShoppingBag className="w-7 h-7 text-zinc-300" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">SellersApp</h1>
          <p className="text-xs text-zinc-100/90 font-medium mt-1">
            ระบบจัดการขาย เอกสาร และบัญชีร้านค้าครบวงจร
          </p>
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[11px] text-zinc-200 border border-white/20">
            <Lock className="w-3 h-3" />
            <span>เข้าสู่ระบบสำหรับเจ้าของร้าน</span>
          </div>
        </div>

        {/* Main Form Content */}
        <div className="p-6 sm:p-7 space-y-5">
          {/* In-app browser warning for LINE/Facebook */}
          {isLineOrInApp && (
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>กำลังเปิดผ่านแอป LINE หรือ Facebook</span>
              </div>
              <p className="text-[11px] text-amber-700">
                ระบบรักษาความปลอดภัยของ Google จะบล็อกการล็อกอินในแอปนี้ แนะนำให้แตะปุ่ม <strong>เมนู 3 จุด (⋯)</strong> ที่มุมจอ แล้วเลือก <strong>&quot;เปิดในเบราว์เซอร์อื่น / Safari / Chrome&quot;</strong> เพื่อเข้าสู่ระบบได้ตามปกติครับ
              </p>
            </div>
          )}

          {/* Notification Messages */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 text-red-700 text-xs animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <div className="font-semibold leading-relaxed break-words">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold animate-fadeIn">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              <div>{successMessage}</div>
            </div>
          )}

          {/* Primary Action: Google Sign In Button */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              className="w-full py-3 px-4 bg-white hover:bg-zinc-50 border-2 border-zinc-300 hover:border-zinc-400 rounded-lg text-xs font-bold text-zinc-700 shadow-sm hover:shadow transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 cursor-pointer active:scale-98"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
                  <span>กำลังเชื่อมต่อกับ Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                  <span>เข้าสู่ระบบด้วย Google (mp.jureerat@gmail.com)</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-zinc-500 font-medium">
              เข้าใช้งานทันทีด้วยบัญชี Google เจ้าของร้าน
            </p>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-zinc-200 w-full"></div>
            <span className="bg-white px-3 text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              หรือเข้าสู่ระบบด้วย Email / รหัสผ่าน
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                อีเมล (Email)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mp.jureerat@gmail.com"
                  disabled={loading || googleLoading}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-[#27272A] focus:bg-white focus:ring-2 focus:ring-zinc-100 transition-all disabled:opacity-60"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-zinc-700">
                  รหัสผ่าน (Password)
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading || googleLoading}
                  className="w-full pl-10 pr-10 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-[#27272A] focus:bg-white focus:ring-2 focus:ring-zinc-100 transition-all disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-[#0068F0] to-[#0068F0] hover:from-[#0052C7] hover:to-[#0052C7] text-white text-xs font-bold rounded-lg shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer active:scale-98"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>กำลังเข้าสู่ระบบ...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>เข้าสู่ระบบด้วยรหัสผ่าน</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3.5 bg-zinc-50 border-t border-zinc-100 text-center">
          <div className="flex items-center justify-center gap-1 text-[11px] text-zinc-500 font-medium">
            <Store className="w-3.5 h-3.5 text-zinc-400" />
            <span>เชื่อมต่อฐานข้อมูล Cloud Firestore & Firebase Auth</span>
          </div>
        </div>
      </div>
    </div>
  );
};
