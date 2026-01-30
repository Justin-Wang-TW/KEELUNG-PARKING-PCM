import React, { useState, useEffect } from 'react';
import { User, Task, AuditLog, UserRole, Meeting, Contact, TaskStatus } from './types';
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
import DueSoonModal from './components/DueSoonModal'; // Import new modal
import { sha256 } from './utils';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]); 
  const [users, setUsers] = useState<User[]>([]); 
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isChangePwdOpen, setIsChangePwdOpen] = useState(false);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  // States for the Warning Modal
  const [dueSoonTasks, setDueSoonTasks] = useState<Task[]>([]);
  const [isDueSoonModalOpen, setIsDueSoonModalOpen] = useState(false);
  const [hasShownWarning, setHasShownWarning] = useState(false); // Ensure it only shows once per login

  const isAdmin = (user: User | null) => {
    if (!user) return false;
    return user.role === UserRole.ADMIN || 
           user.role?.trim() === UserRole.ADMIN ||
           user.role?.toLowerCase() === 'admin';
  };

  useEffect(() => {
    const fetchUsers = async () => {
      if (!APP_CONFIG.SCRIPT_URL) return;
      try {
        const response = await fetch(`${APP_CONFIG.SCRIPT_URL}?action=getUsers`);
        const data = await response.json();
        if (Array.isArray(data)) setUsers(data);
        else setUsers([]);
      } catch (err) { console.error("獲取用戶失敗", err); setUsers([]); }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (currentUser && (currentUser.forceChangePassword === true || String(currentUser.forceChangePassword).toUpperCase() === 'TRUE')) {
      setIsChangePwdOpen(true);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    if (activeTab === 'admin' && isAdmin(currentUser)) {
        fetchLogs();
        fetchContacts();
    }
    if (activeTab === 'meetings') {
        fetchMeetings();
    }
    if (activeTab === 'dashboard' || activeTab === 'progress_report' || activeTab === 'calendar') {
        const stationFilter = currentUser.assignedStation === 'ALL' ? '全部' : STATIONS.find(s => s.code === currentUser.assignedStation)?.name || '全部';
        fetchTasks(stationFilter);
    }
  }, [activeTab, currentUser]);

  // Logic to detect due soon tasks upon task load
  useEffect(() => {
    if (currentUser && tasks.length > 0 && !hasShownWarning) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const urgentTasks = tasks.filter(task => {
        // 1. Filter by User Permission (Admins see all, Managers see their station)
        if (currentUser.assignedStation !== 'ALL' && task.stationCode !== currentUser.assignedStation) {
          return false;
        }

        // 2. Filter out completed tasks
        if (task.status === TaskStatus.COMPLETED) {
          return false;
        }

        // 3. Date Check: Due within 7 days OR Overdue
        // Using replace to ensure compatibility with "YYYY/MM/DD" and "YYYY-MM-DD"
        const deadlineDate = new Date(task.deadline.replace(/-/g, '/'));
        deadlineDate.setHours(0, 0, 0, 0);

        const diffTime = deadlineDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Logic: Show if Overdue (diffDays < 0) OR Due within 7 days (0 <= diffDays <= 7)
        return diffDays <= 7;
      });

      if (urgentTasks.length > 0) {
        setDueSoonTasks(urgentTasks);
        setIsDueSoonModalOpen(true);
      }
      
      // Mark as shown so it doesn't pop up again when switching tabs
      setHasShownWarning(true);
    }
  }, [tasks, currentUser, hasShownWarning]);


  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setHasShownWarning(false); // Reset warning flag on new login
    const stationFilter = user.assignedStation === 'ALL' ? '全部' : STATIONS.find(s => s.code === user.assignedStation)?.name || '全部';
    fetchTasks(stationFilter);
  };

  const fetchTasks = async (stationName: string) => {
    try {
      const response = await fetch(`${APP_CONFIG.SCRIPT_URL}?action=getTasks&station=${encodeURIComponent(stationName)}`);
      const data = await response.json();
      if (data.success && Array.isArray(data.tasks)) {
        setTasks(data.tasks.map((row: any[]) => ({
          uid: row[0], stationName: row[1], stationCode: getStationCodeByName(row[1]),
          itemCode: row[2], itemName: row[3], deadline: row[4], status: row[5],
          executorEmail: row[6], lastUpdated: row[7], attachmentUrl: row[8]
        })));
      } else {
        setTasks([]);
      }
    } catch (err) { console.error(err); setTasks([]); }
  };

  const fetchLogs = async () => {
    try {
        const response = await fetch(`${APP_CONFIG.SCRIPT_URL}?action=getLogs`);
        const data = await response.json();
        if (data.success && Array.isArray(data.logs)) setLogs(data.logs);
        else setLogs([]);
    } catch (err) { console.error("Fetch logs failed", err); setLogs([]); }
  };

  const fetchMeetings = async () => {
      try {
          const response = await fetch(`${APP_CONFIG.SCRIPT_URL}?action=getMeetings`);
          const data = await response.json();
          if (data.success && Array.isArray(data.data)) setMeetings(data.data);
          else setMeetings([]);
      } catch (err) { console.error(err); setMeetings([]); }
  };

  const fetchContacts = async () => {
      try {
          const response = await fetch(`${APP_CONFIG.SCRIPT_URL}?action=getContacts`);
          const data = await response.json();
          if (data.success && Array.isArray(data.data)) setContacts(data.data);
          else setContacts([]);
      } catch (err) { console.error(err); setContacts([]); }
  };

  const handleChangePassword = async (newPassword: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const hashedPassword = await sha256(newPassword);
      const response = await fetch(APP_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'changePassword', email: currentUser.email, newPassword: hashedPassword })
      });
      const res = await response.json();
      if (res.success) {
        alert("密碼修改成功！");
        setCurrentUser(prev => prev ? { ...prev, forceChangePassword: false } : null);
        setIsChangePwdOpen(false);
        return true;
      }
      return false;
    } catch (err) { return false; }
  };

  const handleUpdateUser = async (email: string, updates: Partial<User>): Promise<boolean> => {
      if (!currentUser || !isAdmin(currentUser)) return false;
      try {
          const response = await fetch(APP_CONFIG.SCRIPT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ 
                  action: 'updateUser', 
                  adminEmail: currentUser.email,
                  targetEmail: email,
                  updates 
              })
          });
          const result = await response.json();
          if (result.success) {
             const refreshRes = await fetch(`${APP_CONFIG.SCRIPT_URL}?action=getUsers`);
             const userData = await refreshRes.json();
             if (Array.isArray(userData)) setUsers(userData);
             if (!updates.password) alert("使用者權限已更新");
             return true;
          } else {
             alert("更新失敗: " + (result.msg || "未知錯誤"));
             return false;
          }
      } catch (err) { console.error(err); alert("連線錯誤"); return false; }
  };

  const handleCreateTask = async (taskData: any) => {
      if (!currentUser || !isAdmin(currentUser)) return;
      try {
          const res = await fetch(APP_CONFIG.SCRIPT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                  action: 'createTask',
                  adminEmail: currentUser.email,
                  taskData
              })
          });
          const result = await res.json();
          if (result.success) {
              alert("工項發佈成功");
              const stationFilter = currentUser.assignedStation === 'ALL' ? '全部' : STATIONS.find(s => s.code === currentUser.assignedStation)?.name || '全部';
              fetchTasks(stationFilter);
          } else { alert("發佈失敗: " + result.msg); }
      } catch (err) { console.error(err); alert("連線錯誤"); }
  };

  // Updated: Accept fileData object for Drive upload
  const handleSaveMeeting = async (meeting: Partial<Meeting>, fileData?: { name: string, type: string, content: string }) => {
      if(!currentUser) return;
      try {
          const response = await fetch(APP_CONFIG.SCRIPT_URL, {
              method: 'POST',
              headers: { 
                  'Content-Type': 'text/plain;charset=utf-8' 
              },
              body: JSON.stringify({
                  action: 'saveMeeting',
                  userEmail: currentUser.email,
                  data: meeting,
                  file: fileData, // Pass file metadata + content
                  folderId: APP_CONFIG.UPLOAD_FOLDER_ID // Pass designated folder ID
              })
          });
          
          const result = await response.json();
          if(result.success) {
              alert("會議紀錄已儲存" + (fileData ? "，檔案已上傳至雲端硬碟" : ""));
              fetchMeetings(); 
          } else {
              alert("儲存失敗: " + (result.msg || "未知錯誤"));
          }
      } catch(err) { 
          console.error(err); 
          alert("連線錯誤或檔案過大 (請小於 10MB)"); 
      }
  };

  const handleSaveContact = async (contact: Partial<Contact>) => {
      if(!currentUser) return;
      try {
          const res = await fetch(APP_CONFIG.SCRIPT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'saveContact', userEmail: currentUser.email, data: contact })
          });
          const result = await res.json();
          if(result.success) { alert("聯絡人已儲存"); fetchContacts(); }
      } catch(err) { console.error(err); alert("儲存失敗"); }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsEditTaskModalOpen(true);
  };

  const handleViewDetail = (task: Task) => {
    setViewingTask(task);
  };

  // Updated: Accept structured file data
  const handleSaveTaskProgress = async (
    taskId: string, 
    newStatus: TaskStatus, 
    currentAttachmentUrl?: string, 
    newFile?: { name: string, type: string, content: string }
  ) => {
    if (!currentUser) return;

    // Optimistic Update
    setTasks(prevTasks => prevTasks.map(t => {
      if (t.uid === taskId) {
        return {
          ...t,
          status: newStatus,
          lastUpdated: new Date().toISOString()
        };
      }
      return t;
    }));

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
          file: newFile, // File data
          folderId: APP_CONFIG.UPLOAD_FOLDER_ID // Pass designated folder ID
        })
      });
      const result = await response.json();
      if (result.success) {
        alert("進度已更新" + (newFile ? "，檔案已上傳至雲端硬碟" : ""));
        const stationFilter = currentUser.assignedStation === 'ALL' ? '全部' : STATIONS.find(s => s.code === currentUser.assignedStation)?.name || '全部';
        fetchTasks(stationFilter);
      } else {
        alert("更新失敗: " + (result.msg || "未知錯誤"));
        // Revert on failure
        const stationFilter = currentUser.assignedStation === 'ALL' ? '全部' : STATIONS.find(s => s.code === currentUser.assignedStation)?.name || '全部';
        fetchTasks(stationFilter);
      }
    } catch (err) {
      console.error("Task update error:", err);
      alert("連線錯誤或檔案過大 (請小於 10MB)");
      const stationFilter = currentUser.assignedStation === 'ALL' ? '全部' : STATIONS.find(s => s.code === currentUser.assignedStation)?.name || '全部';
      fetchTasks(stationFilter);
    }
  };

  if (!currentUser) {
    return <Login 
      onLogin={handleLogin} 
      onRegister={async (name, email, org) => {
        try {
          const response = await fetch(APP_CONFIG.SCRIPT_URL, { 
              method: 'POST', 
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'registerUser', user: { name, email, organization: org } }) 
          });
          const result = await response.json();
          // Assume the backend handles email notification logic on success
          return result.success;
        } catch (e) {
          console.error("Registration error", e);
          return false;
        }
      }}
      onForgotPassword={async (email) => {
        await fetch(APP_CONFIG.SCRIPT_URL, { 
            method: 'POST', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'resetPasswordRequest', email }) 
        });
        alert("重設請求已送出");
      }}
      users={users} 
    />;
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} onLogout={() => setCurrentUser(null)}>
      {activeTab === 'dashboard' && <Dashboard tasks={tasks} />}
      {activeTab === 'progress_report' && (
        <TaskList tasks={tasks} currentUser={currentUser} onEditTask={handleEditTask} onViewDetail={handleViewDetail} />
      )}
      {activeTab === 'calendar' && <CalendarView tasks={tasks} onEditTask={handleEditTask} />}
      {activeTab === 'meetings' && <MeetingRecords meetings={meetings} onSave={handleSaveMeeting} />}
      {activeTab === 'admin' && isAdmin(currentUser) && (
          <AdminPanel 
            users={users} logs={logs} onUpdateUser={handleUpdateUser} 
            currentUser={currentUser} tasks={tasks} onEditTask={handleEditTask}
            onCreateTask={handleCreateTask} onViewDetail={handleViewDetail} 
            contacts={contacts} onSaveContact={handleSaveContact}
          />
      )}
      <ChangePasswordModal isOpen={isChangePwdOpen} onClose={() => setIsChangePwdOpen(false)} onSubmit={handleChangePassword} isForced={true} />
      <EditTaskModal isOpen={isEditTaskModalOpen} task={editingTask} onClose={() => setIsEditTaskModalOpen(false)} onSave={handleSaveTaskProgress} />
       
       <TaskDetailModal
         task={viewingTask}
         isOpen={!!viewingTask}
         onClose={() => setViewingTask(null)}
         currentUser={currentUser}
         onSave={handleSaveTaskProgress}
       />

       {/* Warning Modal for Tasks Due Soon */}
       <DueSoonModal 
         isOpen={isDueSoonModalOpen}
         onClose={() => setIsDueSoonModalOpen(false)}
         tasks={dueSoonTasks}
         currentUser={currentUser}
       />
    </Layout>
  );
};

export default App;