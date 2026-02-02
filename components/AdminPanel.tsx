
import React, { useState } from 'react';
import { User, AuditLog, UserRole, StationCode, Task, Contact, ROLE_LABELS } from '../types';
import { Shield, Users, FileText, Search, Activity, Lock, Unlock, X, ListTodo, Plus, Contact as ContactIcon, Check, Copy, Key, Loader2, AlertTriangle, UserCheck, Building2, ShieldAlert, UserPlus } from 'lucide-react';
import { STATIONS } from '../constants';
import TaskList from './TaskList';
import CreateTaskModal from './CreateTaskModal';
import ContactList from './ContactList';
import { sha256, generateRandomPassword } from '../utils';

interface AdminPanelProps {
  users: User[];
  logs: AuditLog[];
  onUpdateUser: (email: string, updates: Partial<User>) => Promise<boolean>;
  currentUser: User;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onCreateTask: (taskData: any) => void; 
  onViewDetail: (task: Task) => void; 
  contacts: Contact[];
  onSaveContact: (contact: Partial<Contact>) => Promise<void>;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  users = [], 
  logs = [], 
  onUpdateUser,
  currentUser,
  tasks = [],
  onEditTask,
  onCreateTask,
  onViewDetail,
  contacts = [],
  onSaveContact
}) => {
  // 新增 'pending' 頁籤類型
  const [activeTab, setActiveTab] = useState<'tasks' | 'pending' | 'users' | 'logs' | 'contacts'>('tasks');
  const [userSearch, setUserSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  
  // 核准流程相關 State
  const [approvingUser, setApprovingUser] = useState<User | null>(null);
  const [approvalRole, setApprovalRole] = useState<UserRole>(UserRole.OPERATOR); 
  const [approvalStation, setApprovalStation] = useState<StationCode | 'ALL'>(STATIONS && STATIONS.length > 0 ? STATIONS[0].code : StationCode.BAIFU);
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  // 核准成功憑證視窗 State
  const [createdCredentials, setCreatedCredentials] = useState<{name: string, email: string, password: string} | null>(null);

  // 權限檢查
  const isAdmin = currentUser.role === UserRole.ADMIN;
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500 bg-white rounded-xl shadow-sm">
        <Shield className="w-16 h-16 mb-4 text-red-400" />
        <h2 className="text-xl font-bold text-gray-800">存取被拒</h2>
        <p>您沒有權限存取後台管理系統。</p>
      </div>
    );
  }

  // 強力判定待審核邏輯
  const isPendingUser = (u: User) => {
    const roleVal = String(u.role || '').trim();
    const statusVal = String(u.isActive || '').trim();
    const pendingKeywords = ['PENDING', '待審核', '待分配', '待處理'];
    const isRolePending = pendingKeywords.some(k => roleVal.toUpperCase().includes(k)) || !u.role || roleVal === '';
    const isStatusPending = pendingKeywords.some(k => statusVal.toUpperCase().includes(k));
    return isRolePending || isStatusPending;
  };

  // 分離名單
  const pendingUsers = (users || []).filter(u => isPendingUser(u));
  const activeUsers = (users || []).filter(u => {
    const isPending = isPendingUser(u);
    if (isPending) return false;
    const searchTerm = userSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(searchTerm) || 
      u.email.toLowerCase().includes(searchTerm) || 
      (u.organization || '').toLowerCase().includes(searchTerm)
    );
  });

  const filteredLogs = (logs || []).filter(l => 
    l.userEmail.includes(logSearch) || l.details.includes(logSearch) || l.action.includes(logSearch)
  );

  const handleApproveSubmit = async () => {
    if (!approvingUser) return;
    setIsProcessingApproval(true);
    try {
      const tempPassword = generateRandomPassword(8);
      const hashedPassword = await sha256(tempPassword);
      const success = await onUpdateUser(approvingUser.email, {
        role: approvalRole,
        assignedStation: approvalStation,
        isActive: true,
        password: hashedPassword,
        forceChangePassword: true
      });
      if (success) {
        setCreatedCredentials({ name: approvingUser.name, email: approvingUser.email, password: tempPassword });
        setApprovingUser(null);
      } else {
        alert("核准失敗");
      }
    } catch (error) {
      alert("程序錯誤");
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => alert('已複製到剪貼簿'));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Shield className="w-6 h-6 mr-2 text-purple-600" />
            後台管理系統
          </h2>
          <p className="text-gray-500 mt-1">系統中樞：任務派發、權限審核與日誌稽核</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-lg border shadow-sm mt-4 md:mt-0 flex-wrap gap-1">
          <button onClick={() => setActiveTab('tasks')} className={`px-3 py-2 text-sm font-medium rounded-md flex items-center transition-all ${activeTab === 'tasks' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <ListTodo className="w-4 h-4 mr-2" /> 任務列表
          </button>
          
          {/* 新增獨立的待審核頁籤按鈕 */}
          <button onClick={() => setActiveTab('pending')} className={`px-3 py-2 text-sm font-medium rounded-md flex items-center transition-all relative ${activeTab === 'pending' ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <UserPlus className="w-4 h-4 mr-2" /> 待審核申請
            {pendingUsers.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                {pendingUsers.length}
              </span>
            )}
          </button>

          <button onClick={() => setActiveTab('users')} className={`px-3 py-2 text-sm font-medium rounded-md flex items-center transition-all ${activeTab === 'users' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Users className="w-4 h-4 mr-2" /> 人員權限管理
          </button>
          
          <button onClick={() => setActiveTab('contacts')} className={`px-3 py-2 text-sm font-medium rounded-md flex items-center transition-all ${activeTab === 'contacts' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <ContactIcon className="w-4 h-4 mr-2" /> 通訊錄
          </button>
          
          <button onClick={() => setActiveTab('logs')} className={`px-3 py-2 text-sm font-medium rounded-md flex items-center transition-all ${activeTab === 'logs' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <FileText className="w-4 h-4 mr-2" /> 系統操作日誌
          </button>
        </div>
      </div>

      {activeTab === 'tasks' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
           <div className="flex justify-between items-center mb-6">
             <div className="bg-blue-50 border-l-4 border-blue-500 p-4 flex-1 mr-4">
                <p className="text-sm text-blue-700"><strong>說明：</strong> 此處為全系統任務總表。您在此處新增或編輯的任務，將同步顯示於前端「進度匯報」頁面。</p>
             </div>
             <button onClick={() => setIsCreateTaskModalOpen(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap">
               <Plus className="w-4 h-4 mr-2" /> 發佈新工項
             </button>
           </div>
           <TaskList tasks={tasks} currentUser={currentUser} onEditTask={onEditTask} onViewDetail={onViewDetail} />
           <CreateTaskModal isOpen={isCreateTaskModalOpen} onClose={() => setIsCreateTaskModalOpen(false)} onSubmit={(data) => { onCreateTask(data); setIsCreateTaskModalOpen(false); }} />
        </div>
      )}

      {/* --- 新增：待審核申請獨立頁面 --- */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          <div className="bg-white border border-orange-200 rounded-xl shadow-sm overflow-hidden animate-fade-in">
            <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex items-center justify-between">
              <div className="flex items-center">
                <ShieldAlert className="w-6 h-6 text-orange-600 mr-3" />
                <h3 className="text-lg font-bold text-orange-900">
                  待審核申請列表 ({pendingUsers.length})
                </h3>
              </div>
              <p className="text-xs text-orange-700 bg-orange-200/50 px-2 py-1 rounded">僅顯示狀態為「待審核」的申請</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-xs font-bold border-b">
                  <tr>
                    <th className="px-6 py-4">申請人資訊</th>
                    <th className="px-6 py-4">單位名稱</th>
                    <th className="px-6 py-4">申請狀態</th>
                    <th className="px-6 py-4 text-right">管理執行</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingUsers.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-20 text-center text-gray-400">目前沒有待審核的申請案件</td></tr>
                  ) : (
                    pendingUsers.map(user => (
                      <tr key={user.email} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-800">{user.name}</div>
                          <div className="text-xs text-gray-500 font-mono">{user.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-gray-600">
                             <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                             {user.organization || <span className="text-gray-400 italic">未填寫</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {user.role || '待分配'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => { setApprovingUser(user); setApprovalRole(UserRole.OPERATOR); }} 
                            className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
                          >
                            <UserCheck className="w-4 h-4 mr-1.5" />
                            進行審核
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
          <div className="p-4 border-b flex items-center justify-between bg-gray-50">
            <h3 className="font-bold text-gray-700 flex items-center">
              <Users className="w-5 h-5 mr-2 text-gray-500" />
              正式人員管理
            </h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="搜尋姓名、Email 或單位..." 
                value={userSearch} 
                onChange={e => setUserSearch(e.target.value)} 
                className="w-full pl-9 pr-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-purple-500 outline-none" 
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 font-semibold text-gray-600">姓名 / Email</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">角色權限</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">負責場站</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">帳號狀態</th>
                  <th className="px-6 py-3 font-semibold text-gray-600 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeUsers.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">查無人員資料</td></tr>
                ) : (
                  activeUsers.map((user) => (
                    <tr key={user.email} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-gray-500 text-xs font-mono mb-1">{user.email}</div>
                        {user.organization && (
                          <div className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600 border border-gray-200">
                            {user.organization}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <select 
                          value={user.role}
                          onChange={(e) => onUpdateUser(user.email, { role: e.target.value as UserRole })}
                          className="p-1.5 border rounded text-xs bg-white font-medium text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          {Object.values(UserRole).filter(r => r !== UserRole.PENDING).map(role => (
                            <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <select 
                          value={user.assignedStation} 
                          onChange={(e) => onUpdateUser(user.email, { assignedStation: e.target.value as StationCode | 'ALL' })} 
                          className="p-1.5 border rounded text-xs bg-white max-w-[150px] shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="ALL">全部 (ALL)</option>
                          {STATIONS.map(s => (<option key={s.code} value={s.code}>{s.name}</option>))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                       <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                         user.isActive === true || String(user.isActive).includes('啟用')
                           ? 'bg-green-100 text-green-700 border border-green-200' 
                           : 'bg-red-100 text-red-700 border border-red-200'
                       }`}>
                         {user.isActive === true || String(user.isActive).includes('啟用') ? '啟用中' : '已停用'}
                       </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => onUpdateUser(user.email, { isActive: !user.isActive })} 
                          className={`p-2 rounded-lg transition-colors border ${
                            user.isActive === true || String(user.isActive).includes('啟用')
                              ? 'text-red-600 border-red-200 hover:bg-red-50' 
                              : 'text-green-600 border-green-200 hover:bg-green-50'
                          }`} 
                        >
                          {user.isActive === true || String(user.isActive).includes('啟用') ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'contacts' && <ContactList contacts={contacts} onSave={onSaveContact} />}

      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
           <div className="p-4 border-b flex items-center justify-between bg-gray-50">
            <h3 className="font-bold text-gray-700 flex items-center"><Activity className="w-4 h-4 mr-2 text-gray-500"/> 系統稽核紀錄</h3>
            <div className="relative w-64">
               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
               <input type="text" placeholder="搜尋..." value={logSearch} onChange={e => setLogSearch(e.target.value)} className="w-full pl-9 pr-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-purple-500 outline-none" />
            </div>
          </div>
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr><th className="px-6 py-3 font-semibold text-gray-600">時間戳記</th><th className="px-6 py-3 font-semibold text-gray-600">操作者</th><th className="px-6 py-3 font-semibold text-gray-600">動作</th><th className="px-6 py-3 font-semibold text-gray-600">詳細內容</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.length === 0 ? (<tr><td colSpan={4} className="p-4 text-center text-gray-400">尚無紀錄</td></tr>) : 
                  (filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-500 text-xs font-mono">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-6 py-3 font-medium text-gray-800">{log.userEmail}</td>
                      <td className="px-6 py-3"><span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{log.action}</span></td>
                      <td className="px-6 py-3 text-gray-600">{log.details}</td>
                    </tr>
                  )))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- 核准設定 Modal --- */}
      {approvingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm animate-fade-in">
             <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
               <h3 className="font-bold text-gray-800">核准使用者申請</h3>
               <button onClick={() => !isProcessingApproval && setApprovingUser(null)}><X className="w-5 h-5 text-gray-400" /></button>
             </div>
             <div className="p-6 space-y-4">
               <div className="bg-blue-50 p-3 rounded border border-blue-100">
                 <div className="mb-2"><label className="text-xs font-bold text-blue-500 block mb-0.5">申請人</label><p className="font-medium text-blue-900">{approvingUser.name}</p></div>
                 <div className="mb-2"><label className="text-xs font-bold text-blue-500 block mb-0.5">單位</label><p className="font-medium text-blue-900">{approvingUser.organization || '未填寫'}</p></div>
                 <div><label className="text-xs font-bold text-blue-500 block mb-0.5">Email</label><p className="font-mono text-xs text-blue-700">{approvingUser.email}</p></div>
               </div>
               
               <div>
                 <label className="text-xs font-bold text-gray-600 block mb-1">指派角色權限</label>
                 <select value={approvalRole} onChange={(e) => setApprovalRole(e.target.value as UserRole)} className="w-full p-2 border rounded bg-white font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none">
                    {Object.values(UserRole).filter(r => r !== UserRole.PENDING).map(role => (
                      <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                    ))}
                 </select>
               </div>
               <div>
                 <label className="text-xs font-bold text-gray-600 block mb-1">指派負責場站</label>
                 <select value={approvalStation} onChange={(e) => setApprovalStation(e.target.value as StationCode | 'ALL')} className="w-full p-2 border rounded bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                   <option value="ALL">全部 (ALL)</option>
                   {STATIONS.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                 </select>
               </div>
               <button onClick={handleApproveSubmit} disabled={isProcessingApproval} className="w-full py-2.5 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium mt-4 flex items-center justify-center shadow-md">
                 {isProcessingApproval ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserCheck className="w-4 h-4 mr-2" />} 
                 {isProcessingApproval ? '處理中...' : '確認核准並啟用帳號'}
               </button>
             </div>
          </div>
        </div>
      )}

      {/* --- 核准成功憑證顯示視窗 --- */}
      {createdCredentials && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-bounce-in">
            <div className="p-6 bg-green-50 border-b border-green-100 rounded-t-xl text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3"><Check className="w-6 h-6 text-green-600" /></div>
              <h3 className="text-xl font-bold text-green-800">核准成功！</h3>
              <p className="text-sm text-green-600 mt-1">帳號已正式啟用，請將密碼告知使用者</p>
            </div>
            <div className="p-6 space-y-4">
               <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1">姓名</label><p className="font-medium text-gray-800 bg-gray-50 p-2 rounded border border-gray-200">{createdCredentials.name}</p></div>
               <div>
                 <label className="text-xs font-bold text-gray-500 uppercase block mb-1">登入帳號</label>
                 <div className="flex">
                   <p className="font-medium text-gray-800 bg-gray-50 p-2 rounded-l border border-gray-200 border-r-0 flex-1 overflow-hidden text-ellipsis">{createdCredentials.email}</p>
                   <button onClick={() => copyToClipboard(createdCredentials.email)} className="bg-gray-100 border border-gray-200 border-l-0 rounded-r px-3 hover:bg-gray-200 text-gray-600 transition-colors"><Copy className="w-4 h-4"/></button>
                 </div>
               </div>
               <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mt-4">
                  <label className="text-xs font-bold text-blue-600 uppercase block mb-2 flex items-center"><Key className="w-3 h-3 mr-1"/> 登入密碼</label>
                  <div className="flex items-center">
                    <p className="font-mono text-2xl font-bold text-blue-800 tracking-wider flex-1 select-all">{createdCredentials.password}</p>
                    <button onClick={() => copyToClipboard(createdCredentials.password)} className="text-sm bg-white text-blue-600 px-3 py-1.5 rounded border border-blue-200 hover:bg-blue-50 font-medium shadow-sm transition-colors">複製密碼</button>
                  </div>
                  <p className="text-[10px] text-blue-400 mt-2">* 系統已對此密碼加密儲存，使用者登入後將被要求修改密碼。</p>
               </div>
               <button onClick={() => setCreatedCredentials(null)} className="w-full py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium mt-2 shadow-lg transition-colors">關閉並回到列表</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
