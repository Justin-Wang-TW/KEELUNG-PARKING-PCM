import React, { useState, useEffect } from 'react';
import { User, Task, AuditLog, UserRole, Meeting, Contact, TaskStatus, ChecklistItem, ChecklistSubmission } from './types';
import { STATIONS, APP_CONFIG, getStationCodeByName } from './constants';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TaskList from './components/TaskList'; 
import CalendarView from './components/CalendarView';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import ChangePasswordModal from './components/ChangePasswordModal';
import MeetingRecords from './components/MeetingRecords';
import EditTaskModal from './components/EditTaskModal';
import TaskDetailModal from './components/TaskDetailModal';
import DueSoonModal from './components/DueSoonModal'; 
import ChecklistDashboard from './components/ChecklistDashboard'; 
import { sha256 } from './utils';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]); 
  const [users, setUsers] = useState<User[]>([]); 
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  const [checklistTemplate, setChecklistTemplate] = useState<ChecklistItem[]>([]);
  const [checklistSubmissions, setChecklistSubmissions] = useState<ChecklistSubmission[]>([]);
  const [isChangePwdOpen, setIsChangePwdOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [dueSoonTasks, setDueSoonTasks] = useState<Task[]>([]);
  const [isDueSoonModalOpen, setIsDueSoonModalOpen] = useState(false);
  const [hasShownWarning, setHasShownWarning] = useState(false); 

  const isAdmin = (user: User | null) => {
    if (!user) return false;
    return user.role === UserRole.ADMIN;
  };

  // --- 1. 初始化資料抓取 ---
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!APP_CONFIG.SCRIPT_URL) return;
      try {
        const res = await fetch(`${APP_CONFIG.SCRIPT_URL}?action=getUsers`);
        const data = await res.json();
        if (Array.isArray(data)) setUsers(data);
      } catch (err) { console.error("初始化用戶失敗", err); }
    };
    fetchInitialData();
  }, []);

  // --- 2. 根據分頁載入資料 ---
  useEffect(() => {
    if (!currentUser) return;
    
    if (activeTab === 'meetings') fetchMeetings();
    if (activeTab === 'venue_check') fetchChecklistData(); // 切換到檢核表時抓取資料
    if (activeTab === 'admin' && isAdmin(currentUser)) { 
      fetchLogs(); 
      fetchContacts(); 
    }
    
    if (['dashboard', 'progress_report', 'calendar'].includes(activeTab)) {
      const filter = currentUser.assignedStation === 'ALL' ? '全部' : STATIONS.find(s => s.code === currentUser.assignedStation)?.name || '全部';
      fetchTasks(filter);
    }
  }, [activeTab, currentUser]);

  // --- 3. 監聽強制修改密碼需求 ---
  useEffect(() => {
    if (currentUser?.forceChangePassword) {
      setIsChangePwdOpen(true);
    }
  }, [currentUser]);

  // --- 4. 業務邏輯函式定義 ---

  const fetchMeetings = async () => {
    try {
      const response = await fetch(`${APP_CONFIG.SCRIPT_URL}?action=getMeetings`);
      const result = await response.json();
      const list = result.meetings || result.data; 
      if (result.success && Array.isArray(list)) setMeetings(list);
      else setMeetings([]);
    } catch (err) { console.error("載入會議紀錄失敗", err); }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${APP_CONFIG.SCRIPT_URL}?action=getLogs`);
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) setLogs(data.logs);
      else setLogs([]);
    } catch (err) { console.error("載入系統日誌失敗", err); }
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch(`${APP_CONFIG.SCRIPT_URL}?action=getContacts`);
      const data = await res.json();
      const list = data.contacts || data.data;
      if (data.success && Array.isArray(list)) setContacts(list);
      else setContacts([]);
    } catch (err) { console.error("載入通訊錄失敗", err); }
  };

  const handleSaveContact = async (contact: Partial<Contact>) => {
    if(!currentUser) return;
    try {
      const res = await fetch(APP_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
          action: 'saveContact', 
          userEmail: currentUser.email, 
          data: contact 
        })
      });
      const result = await res.json();
      if(result.success) { 
        alert("聯絡人已儲存"); 
        fetchContacts(); 
      }
    } catch(err) { alert("儲存失敗"); }
  };

  const handleUpdateUser = async (email: string, updates: Partial<User>): Promise<boolean> => {
    if (!currentUser || !isAdmin(currentUser)) return false;
    try {
      const res = await fetch(APP_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateUser', adminEmail: currentUser.email, targetEmail: email, updates })
      });
      const result = await res.json();
      if (result.success) {
        const refreshRes = await fetch(`${APP_CONFIG.SCRIPT_URL}?action=getUsers`);
        const userData = await refreshRes.json();
        if (Array.isArray(userData)) setUsers(userData);
        return true;
      }
      return false;
    } catch (err) { return false; }
  };

  const handleCreateTask = async (taskData: any) => {
    if (!currentUser || !isAdmin(currentUser)) return;
    try {
      const res = await fetch(APP_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'createTask', adminEmail: currentUser.email, taskData })
      });
      const result = await res.json();
      if (result.success) {
        alert("工項發佈成功");
        const filter = currentUser.assignedStation === 'ALL' ? '全部' : STATIONS.find(s => s.code === currentUser.assignedStation)?.name || '全部';
        fetchTasks(filter);
      }
    } catch (err) { alert("發佈失敗"); }
  };

  const handleSaveTaskProgress = async (
    taskId: string, 
    newStatus: TaskStatus, 
    currentAttachmentUrl?: string, 
    newFile?: { name: string, type: string, content: string }
  ) => {
    if (!currentUser) return;

    try {
      const response = await fetch(APP_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updateTask',
          userEmail: currentUser.email,
          uid: taskId,
          status: newStatus,
          currentAttachmentUrl: currentAttachmentUrl, 
          file: newFile, 
          folderId: APP_CONFIG.UPLOAD_FOLDER_ID 
        })
      });
      const result = await response.json();
      
      if (result.success) {
        alert("進度更新成功！" + (newFile ? " (檔案已上傳)" : ""));
        const filter = currentUser.assignedStation === 'ALL' ? '全部' : STATIONS.find(s => s.code === currentUser.assignedStation)?.name || '全部';
        fetchTasks(filter);
      } else {
        alert("更新失敗: " + (result.msg || "未知錯誤"));
      }
    } catch (err) {
      console.error("Task update error:", err);
      alert("連線錯誤，請檢查網路狀態");
    }
  };

  const fetchTasks = async (stationName: string) => {
    try {
      const res = await fetch(`${APP_CONFIG.SCRIPT_URL}?action=getTasks&station=${encodeURIComponent(stationName)}`);
      const data = await res.json();
      const taskList = data.tasks || data.data;

      if (data.success && Array.isArray(taskList)) {
        setTasks(taskList.map((row: any[]) => ({
          uid: row[0], stationName: row[1], stationCode: getStationCodeByName(row[1]),
          itemCode: row[2], itemName: row[3], deadline: row[4], status: row[5],
          executorEmail: row[6], lastUpdated: row[7], attachmentUrl: row[8]
        })));
      } else {
        setTasks([]);
      }
    } catch (err) { 
      console.error(err); 
      setTasks([]);
    }
  };

  /**
   * [核心修正] fetchChecklistData
   * 同時抓取「提交紀錄」與「檢核項目範本」
   */
  const fetchChecklistData = async () => {
    try {
      // 平行請求以加快速度
      const [subRes, tmplRes] = await Promise.all([
        fetch(`${APP_CONFIG.SCRIPT_URL}?action=getChecklistSubmissions`),
        fetch(`${APP_CONFIG.SCRIPT_URL}?action=getChecklistTemplate`)
      ]);

      const subData = await subRes.json();
      const tmplData = await tmplRes.json();

      // 1. 設定提交紀錄
      if(subData.success) {
         const list = subData.submissions || subData.data;
         setChecklistSubmissions(Array.isArray(list) ? list : []);
      }

      // 2. 設定檢核範本
      if (tmplData.success) {
         const items = tmplData.template || tmplData.data;
         setChecklistTemplate(Array.isArray(items) ? items : []);
      }
    } catch (err) { 
      console.error("載入檢核表資料失敗", err); 
    }
  };

  /**
   * [核心修正] 儲存檢核項目範本
   */
  const handleSaveChecklistTemplate = async (items: ChecklistItem[]) => {
    if (!currentUser) return;
    try {
      const res = await fetch(APP_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveChecklistTemplate',
          userEmail: currentUser.email,
          items: items // 注意: 這裡參數名稱要對應 GAS (params.items)
        })
      });
      const result = await res.json();
      if (result.success) {
        alert("檢核項目範本已更新");
        fetchChecklistData(); // 重新整理
      } else {
        alert("更新失敗: " + result.msg);
      }
    } catch (err) { alert("儲存失敗，請檢查連線"); }
  };

  /**
   * [核心修正] 提交每月檢核表
   */
  const handleSubmitChecklist = async (data: any) => {
     if (!currentUser) return;
     try {
       const res = await fetch(APP_CONFIG.SCRIPT_URL, {
         method: 'POST',
         headers: { 'Content-Type': 'text/plain;charset=utf-8' },
         body: JSON.stringify({
           action: 'submitChecklist',
           userEmail: currentUser.email,
           data: data
         })
       });
       const result = await res.json();
       if (result.success) {
         alert("本月檢核表已成功提交");
         fetchChecklistData(); // 重新整理
       } else {
         alert("提交失敗: " + result.msg);
       }
     } catch (err) { alert("提交失敗，請檢查連線"); }
  };

  const handleSaveMeeting = async (meeting: Partial<Meeting>, fileData?: { name: string, type: string, content: string }) => {
    if(!currentUser) return;
    try {
      const res = await fetch(APP_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'saveMeeting', userEmail: currentUser.email, data: meeting, file: fileData, folderId: APP_CONFIG.UPLOAD_FOLDER_ID })
      });
      const result = await res.json();
      if(result.success) { alert("會議紀錄已儲存"); fetchMeetings(); }
    } catch(err) { alert("儲存失敗"); }
  };

  const handleRegister = async (name: string, email: string, organization: string) => {
    try {
      const res = await fetch(APP_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'registerUser',
          user: { name, email, organization }
        })
      });
      const result = await res.json();
      return result.success;
    } catch (err) {
      console.error("註冊連線錯誤", err);
      return false;
    }
  };

  const handleChangePassword = async (newPassword: string) => {
    if (!currentUser) return false;
    try {
      const hashedPassword = await sha256(newPassword);
      const res = await fetch(APP_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'changePassword',
          email: currentUser.email,
          newPassword: hashedPassword
        })
      });
      const result = await res.json();
      
      if (result.success) {
        alert("密碼修改成功！請牢記您的新密碼。");
        const updatedUser = { ...currentUser, forceChangePassword: false };
        setCurrentUser(updatedUser);
        setIsChangePwdOpen(false);
        return true;
      } else {
        alert("修改失敗: " + (result.msg || "系統錯誤"));
        return false;
      }
    } catch (err) {
      console.error(err);
      alert("連線錯誤，請檢查網路");
      return false;
    }
  };

  const handleLogin = (user: User) => { setCurrentUser(user); setActiveTab('dashboard'); };

  if (!currentUser) return <Login onLogin={handleLogin} onRegister={handleRegister} onForgotPassword={async () => {}} users={users} />;

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} onLogout={() => setCurrentUser(null)}>
      {activeTab === 'dashboard' && <Dashboard tasks={tasks} />}
      {activeTab === 'progress_report' && <TaskList tasks={tasks} currentUser={currentUser} onEditTask={setEditingTask} onViewDetail={setViewingTask} />}
      {activeTab === 'venue_check' && (
        <ChecklistDashboard 
          currentUser={currentUser} 
          submissions={checklistSubmissions} 
          template={checklistTemplate} 
          onSaveTemplate={handleSaveChecklistTemplate} // 綁定儲存函式
          onSubmitChecklist={handleSubmitChecklist}     // 綁定提交函式
        />
      )}
      {activeTab === 'calendar' && <CalendarView tasks={tasks} onEditTask={setEditingTask} />}
      {activeTab === 'meetings' && <MeetingRecords meetings={meetings} onSave={handleSaveMeeting} />}
      
      {activeTab === 'admin' && isAdmin(currentUser) && (
        <AdminPanel 
          users={users} 
          logs={logs} 
          onUpdateUser={handleUpdateUser} 
          currentUser={currentUser} 
          tasks={tasks} 
          onEditTask={setEditingTask} 
          onCreateTask={handleCreateTask} 
          onViewDetail={setViewingTask} 
          contacts={contacts} 
          onSaveContact={handleSaveContact} 
        />
      )}
      
      {/* Modals */}
      <ChangePasswordModal 
        isOpen={isChangePwdOpen} 
        onClose={() => setIsChangePwdOpen(false)} 
        onSubmit={handleChangePassword} 
        isForced={!!currentUser?.forceChangePassword} 
      />
      
      {editingTask && (
        <EditTaskModal 
          isOpen={true} 
          task={editingTask} 
          onClose={() => setEditingTask(null)} 
          onSave={handleSaveTaskProgress} 
        />
      )}
      
      {viewingTask && (
        <TaskDetailModal 
          task={viewingTask} 
          isOpen={true} 
          onClose={() => setViewingTask(null)} 
          currentUser={currentUser} 
          onSave={handleSaveTaskProgress} 
        />
      )}
    </Layout>
  );
};

export default App;