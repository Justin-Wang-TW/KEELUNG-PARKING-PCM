import React, { useState } from 'react';
import { User, AuditLog, UserRole, StationCode, Task, Contact } from '../types';
import { Shield, Users, FileText, Search, Activity, Lock, Unlock, X, ListTodo, Plus, Contact as ContactIcon, Check, Copy, Key, Loader2 } from 'lucide-react';
import { STATIONS } from '../constants';
import TaskList from './TaskList';
import CreateTaskModal from './CreateTaskModal';
import ContactList from './ContactList';
import { sha256, generateRandomPassword } from '../utils';

interface AdminPanelProps {
  users: User[];
  logs: AuditLog[];
  onUpdateUser: (email: string, updates: Partial<User>) => Promise<boolean>; // Updated type
  currentUser: User;
  // Props for TaskList integration
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onCreateTask: (taskData: any) => void; 
  onViewDetail: (task: Task) => void; // Changed prop name
  // Props for Contact List
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
  onViewDetail, // Use new prop
  contacts = [],
  onSaveContact
}) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'users' | 'logs' | 'contacts'>('tasks');
  const [userSearch, setUserSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  
  // State for Approval Modal
  const [approvingUser, setApprovingUser] = useState<User | null>(null);
  const [approvalRole, setApprovalRole] = useState<UserRole>(UserRole.USER);
  const [approvalStation, setApprovalStation] = useState<StationCode | 'ALL'>(StationCode.BAIFU);
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  // State for Credentials Modal (New Feature)
  const [createdCredentials, setCreatedCredentials] = useState<{name: string, email: string, password: string} | null>(null);

  // Helper for Admin check
  const isAdmin = currentUser.role === UserRole.ADMIN || 
                  currentUser.role?.trim() === UserRole.ADMIN ||
                  currentUser.role?.toLowerCase() === 'admin';

  // Strict check
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500 bg-white rounded-xl shadow-sm">
        <Shield className="w-16 h-16 mb-4 text-red-400" />
        <h2 className="text-xl font-bold text-gray-800">存取被拒</h2>
        <p>您沒有權限存取後台管理系統。</p>
      </div>
    );
  }

  // Robust helper to identify pending users
  // Handles '待審核', 'PENDING', 'pending', or empty/null roles
  const isPendingUser = (u: User) => {
    if (!u.role) return true; 
    const r = String(u.role).trim();
    return r === UserRole.PENDING || 
           r.toUpperCase() === 'PENDING' || 
           r === '待審核';
  };

  const pendingUsers = (users || []).filter(u => isPendingUser(u));
  const activeUsers = (users || []).filter(u => !isPendingUser(u) && (u.name.includes(userSearch) || u.email.includes(userSearch)));

  const filteredLogs = (logs || []).filter(l => 
    l.userEmail.includes(logSearch) || l.details.includes(logSearch) || l.action.includes(logSearch)
  );

  const handleApproveSubmit = async () => {
    if (!approvingUser) return;
    
    setIsProcessingApproval(true);
    try {
      // 1. Generate a random 8-character password (Plaintext) using robust util
      const tempPassword = generateRandomPassword(8);
      
      // 2. Hash it for the backend (await the promise!)
      const hashedPassword = await sha256(tempPassword);

      // 3. Send to Backend
      // NOTE: We await this to ensure the backend confirms before showing the user the password
      const success = await onUpdateUser(approvingUser.email, {
        role: approvalRole,
        assignedStation: approvalStation,
        isActive: true,
        password: hashedPassword, // Send SHA-256 Hash to backend
        forceChangePassword: true // Ensure they change it on first login
      });

      if (success) {
        // 4. Show Plaintext credentials to Admin so they can copy it
        setCreatedCredentials({
          name: approvingUser.name,
          email: approvingUser.email,
          password: tempPassword // Show Plaintext to Admin
        });

        // 5. Close the input modal
        setApprovingUser(null);
      }
    } catch (error) {
      console.error("Approval error:", error);
      alert("核准程序發生錯誤，請重試");
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('已複製到剪貼簿');
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Shield className="w-6 h-6 mr-2 text-purple-600" />
            後台管理系統
          </h2>
          <p className="text-gray-500 mt-1">
            系統中樞：任務派發、權限審核與日誌稽核
          </p>
        </div>
        
        <div className="flex bg-white p-1 rounded-lg border shadow-sm mt-4 md:mt-0 flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 text-sm font-medium rounded-md flex items-center transition-all ${
              activeTab === 'tasks' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <ListTodo className="w-4 h-4 mr-2" />
            任務列表
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-sm font-medium rounded-md flex items-center transition-all ${
              activeTab === 'users' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users className="w-4 h-4 mr-2" />
            人員權限管理
            {pendingUsers.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {pendingUsers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
             className={`px-4 py-2 text-sm font-medium rounded-md flex items-center transition-all ${
              activeTab === 'contacts' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <ContactIcon className="w-4 h-4 mr-2" />
            通訊錄
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 text-sm font-medium rounded-md flex items-center transition-all ${
              activeTab === 'logs' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FileText className="w-4 h-4 mr-2" />
            系統操作日誌
          </button>
        </div>
      </div>

      {/* Task List Tab (Restored) */}
      {activeTab === 'tasks' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
           <div className="flex justify-between items-center mb-6">
             <div className="bg-blue-50 border-l-4 border-blue-500 p-4 flex-1 mr-4">
                <p className="text-sm text-blue-700">
                  <strong>說明：</strong> 此處為全系統任務總表。您在此處新增或編輯的任務，將同步顯示於前端「進度匯報」頁面，供各停車場經理填報。
                </p>
             </div>
             <button
               onClick={() => setIsCreateTaskModalOpen(true)}
               className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
             >
               <Plus className="w-4 h-4 mr-2" />
               發佈新工項
             </button>
           </div>
           
           <TaskList 
             tasks={tasks} 
             currentUser={currentUser} 
             onEditTask={onEditTask} 
             onViewDetail={onViewDetail} 
           />

           <CreateTaskModal 
             isOpen={isCreateTaskModalOpen}
             onClose={() => setIsCreateTaskModalOpen(false)}
             onSubmit={(data) => {
               onCreateTask(data);
               setIsCreateTaskModalOpen(false);
             }}
           />
        </div>
      )}

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Pending Approvals Section */}
          {pendingUsers.length > 0 && (
            <div className="bg-orange-50 rounded-xl shadow-sm border border-orange-200 overflow-hidden">
              <div className="p-4 border-b border-orange-200 bg-orange-100 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-orange-600" />
                <h3 className="font-bold text-orange-800">待審核申請 ({pendingUsers.length})</h3>
              </div>
              <div className="p-4">
                 <table className="w-full text-left text-sm">
                   <tbody>
                     {pendingUsers.map(user => (
                       <tr key={user.email} className="border-b border-orange-100 last:border-0">
                         <td className="py-3 px-2 font-medium text-gray-800">{user.name}</td>
                         <td className="py-3 px-2 text-gray-600">{user.email}</td>
                         <td className="py-3 px-2 text-right">
                           <button 
                             onClick={() => {
                               setApprovingUser(user);
                               setApprovalRole(UserRole.MANAGER);
                               // SAFE SETTING: fallback to BAIFU if STATIONS is somehow empty or 0 is undefined
                               setApprovalStation(STATIONS && STATIONS.length > 0 ? STATIONS[0].code : StationCode.BAIFU);
                             }}
                             className="bg-green-600 text-white px-3 py-1.5 rounded-md text-xs hover:bg-green-700 shadow-sm"
                           >
                             審核 / 分派權限
                           </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
              </div>
            </div>
          )}

          {/* Active Users Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-gray-700">正式人員清單</h3>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="搜尋人員..." 
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
                    <th className="px-6 py-3 font-semibold text-gray-600">角色</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">負責場站</th>
                    <th className="px-6 py-3 font-semibold text-gray-600">狀態</th>
                    <th className="px-6 py-3 font-semibold text-gray-600 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeUsers.length === 0 ? (
                    <tr>
                       <td colSpan={5} className="px-6 py-8 text-center text-gray-400">查無人員</td>
                    </tr>
                  ) : (
                    activeUsers.map((user) => (
                      <tr key={user.email} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-gray-500 text-xs">{user.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <select 
                            value={user.role}
                            onChange={(e) => onUpdateUser(user.email, { role: e.target.value as UserRole })}
                            className="p-1 border rounded text-xs bg-white"
                          >
                            {Object.values(UserRole).filter(r => r !== UserRole.PENDING).map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={user.assignedStation}
                            onChange={(e) => onUpdateUser(user.email, { assignedStation: e.target.value as StationCode | 'ALL' })}
                            className="p-1 border rounded text-xs bg-white max-w-[150px]"
                          >
                            <option value="ALL">全部 (ALL)</option>
                            {STATIONS.map(s => (
                              <option key={s.code} value={s.code}>{s.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4">
                         <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                           user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                         }`}>
                           {user.isActive ? '啟用中' : '已停用'}
                         </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => onUpdateUser(user.email, { isActive: !user.isActive })}
                            className={`p-2 rounded-lg transition-colors ${
                              user.isActive 
                                ? 'text-red-600 hover:bg-red-50' 
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={user.isActive ? '停用帳號' : '啟用帳號'}
                          >
                            {user.isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
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

      {/* Contacts Tab */}
      {activeTab === 'contacts' && (
        <ContactList contacts={contacts} onSave={onSaveContact} />
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
           <div className="p-4 border-b flex items-center justify-between bg-gray-50">
            <h3 className="font-bold text-gray-700 flex items-center">
              <Activity className="w-4 h-4 mr-2 text-gray-500"/>
              系統稽核紀錄
            </h3>
            <div className="relative w-64">
               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
               <input 
                 type="text" 
                 placeholder="搜尋..." 
                 value={logSearch}
                 onChange={e => setLogSearch(e.target.value)}
                 className="w-full pl-9 pr-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-purple-500 outline-none"
               />
            </div>
          </div>
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>
                  <th className="px-6 py-3 font-semibold text-gray-600">時間戳記</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">操作者</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">動作</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">詳細內容</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.length === 0 ? (
                  <tr><td colSpan={4} className="p-4 text-center text-gray-400">尚無紀錄</td></tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-500 text-xs font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 font-medium text-gray-800">{log.userEmail}</td>
                      <td className="px-6 py-3"><span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{log.action}</span></td>
                      <td className="px-6 py-3 text-gray-600">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {approvingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm animate-fade-in">
             <div className="p-4 border-b flex justify-between items-center">
               <h3 className="font-bold text-gray-800">核准使用者申請</h3>
               <button onClick={() => !isProcessingApproval && setApprovingUser(null)}><X className="w-5 h-5 text-gray-400" /></button>
             </div>
             <div className="p-6 space-y-4">
               <div>
                 <label className="text-xs font-bold text-gray-500 block mb-1">申請人</label>
                 <p className="font-medium">{approvingUser.name} ({approvingUser.email})</p>
               </div>
               
               <div>
                 <label className="text-xs font-bold text-gray-500 block mb-1">指派角色</label>
                 <select 
                   value={approvalRole}
                   onChange={(e) => setApprovalRole(e.target.value as UserRole)}
                   className="w-full p-2 border rounded bg-white"
                 >
                   <option value={UserRole.MANAGER}>經理 (Manager)</option>
                   <option value={UserRole.USER}>一般人員 (User)</option>
                   <option value={UserRole.ADMIN}>管理員 (Admin)</option>
                 </select>
               </div>

               <div>
                 <label className="text-xs font-bold text-gray-500 block mb-1">負責場站</label>
                 <select 
                   value={approvalStation}
                   onChange={(e) => setApprovalStation(e.target.value as StationCode | 'ALL')}
                   className="w-full p-2 border rounded bg-white"
                 >
                   <option value="ALL">全部 (ALL)</option>
                   {STATIONS.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                 </select>
               </div>

               <button 
                 onClick={handleApproveSubmit}
                 disabled={isProcessingApproval}
                 className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium mt-4 flex justify-center items-center"
               >
                 {isProcessingApproval ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                 {isProcessingApproval ? '處理中...' : '確認核准並啟用 (產生預設密碼)'}
               </button>
             </div>
          </div>
        </div>
      )}

      {/* New Credentials Modal */}
      {createdCredentials && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-bounce-in">
            <div className="p-6 bg-green-50 border-b border-green-100 rounded-t-xl text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                 <Check className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-green-800">核准成功！</h3>
              <p className="text-sm text-green-600 mt-1">用戶已啟用，請複製以下資訊提供給使用者</p>
            </div>
            
            <div className="p-6 space-y-4">
               <div>
                 <label className="text-xs font-bold text-gray-500 uppercase block mb-1">使用者姓名</label>
                 <p className="font-medium text-gray-800 bg-gray-50 p-2 rounded border border-gray-200">{createdCredentials.name}</p>
               </div>
               <div>
                 <label className="text-xs font-bold text-gray-500 uppercase block mb-1">登入帳號 (Email)</label>
                 <div className="flex">
                   <p className="font-medium text-gray-800 bg-gray-50 p-2 rounded-l border border-gray-200 border-r-0 flex-1 overflow-hidden text-ellipsis">{createdCredentials.email}</p>
                   <button onClick={() => copyToClipboard(createdCredentials.email)} className="bg-gray-100 border border-gray-200 border-l-0 rounded-r px-3 hover:bg-gray-200 text-gray-600">
                      <Copy className="w-4 h-4"/>
                   </button>
                 </div>
               </div>
               
               <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mt-4">
                  <label className="text-xs font-bold text-blue-600 uppercase block mb-2 flex items-center">
                     <Key className="w-3 h-3 mr-1"/>
                     預設登入密碼 (明碼)
                  </label>
                  <div className="flex items-center">
                    <p className="font-mono text-xl font-bold text-blue-800 tracking-wider flex-1">{createdCredentials.password}</p>
                    <button 
                      onClick={() => copyToClipboard(createdCredentials.password)}
                      className="text-sm bg-white text-blue-600 px-3 py-1.5 rounded border border-blue-200 hover:bg-blue-50 font-medium shadow-sm"
                    >
                      複製密碼
                    </button>
                  </div>
                  <p className="text-[10px] text-blue-400 mt-2">
                    * 系統僅儲存此密碼之雜湊值，請務必現在複製提供給使用者。
                  </p>
               </div>
               
               <button 
                 onClick={() => setCreatedCredentials(null)}
                 className="w-full py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium mt-2 shadow-lg"
               >
                 關閉視窗
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;