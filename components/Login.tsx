import React, { useState } from 'react';
import { User } from '../types';
import { APP_CONFIG } from '../constants';
import { Car, Loader2, UserPlus, LogIn, AlertCircle, Eye, EyeOff, Building2 } from 'lucide-react';
import { sha256 } from '../utils';

interface LoginProps {
  onLogin: (user: User) => void;
  onRegister: (name: string, email: string, organization: string) => void;
  onForgotPassword: (email: string) => void;
  users: User[]; // 用於註冊時前端快速檢查
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegister, onForgotPassword, users }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 正式的 API 登入邏輯
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      // ⚡ 將密碼進行 SHA-256 雜湊後再發送
      const hashedPassword = await sha256(password);

      // ⚡ 直接向 GAS 發送驗證請求，讓後端比對雜湊密碼
      const response = await fetch(APP_CONFIG.SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'checkUserAuth',
          userEmail: email.trim().toLowerCase(),
          password: hashedPassword // 發送雜湊值
        })
      });

      const result = await response.json();

      if (result.success) {
        // 登入成功：將後端回傳的 User 物件（包含 forceChangePassword 旗標）傳給 App
        onLogin(result.user);
      } else {
        // 登入失敗：顯示後端回傳的具體原因（密碼錯誤或帳號不存在）
        setErrorMsg(result.msg || '登入失敗，請檢查帳號密碼。');
      }
    } catch (err) {
      setErrorMsg('連線失敗，請檢查網路或 API URL 設定。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);
    
    // 前端初步重複檢查
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      setErrorMsg('此 Email 已被註冊。');
      setIsLoading(false);
      return;
    }

    onRegister(name, email, organization);
    setSuccessMsg('申請已送出！管理員核准後會寄發初始密碼。');
    setMode('LOGIN');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full inline-block mb-4">
            <Car className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">基隆市停車場履約管理</h1>
        </div>
        
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg text-sm flex items-center">
             <UserPlus className="w-4 h-4 mr-2" />
             {successMsg}
          </div>
        )}

        {mode === 'LOGIN' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">電子郵件 (Email)</label>
              <input 
                type="email" required value={email}
                className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">密碼</label>
                <button type="button" onClick={() => onForgotPassword(email)} className="text-xs text-blue-600">忘記密碼？</button>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} required value={password}
                  className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  onChange={e => setPassword(e.target.value)}
                />
                <button type="button" className="absolute right-3 top-3 text-gray-400" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold flex justify-center items-center">
              {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : '登入系統'}
            </button>
            <div className="text-center mt-4">
              <button type="button" onClick={() => setMode('REGISTER')} className="text-sm text-blue-600 hover:underline">申請存取權限</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <input type="text" required placeholder="姓名" className="w-full p-2.5 border rounded-lg" value={name} onChange={e => setName(e.target.value)} />
            <input type="text" required placeholder="任職單位" className="w-full p-2.5 border rounded-lg" value={organization} onChange={e => setOrganization(e.target.value)} />
            <input type="email" required placeholder="Email" className="w-full p-2.5 border rounded-lg" value={email} onChange={e => setEmail(e.target.value)} />
            <button type="submit" disabled={isLoading} className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold">送出申請</button>
            <button type="button" onClick={() => setMode('LOGIN')} className="w-full text-sm text-gray-500 mt-2">返回登入</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;