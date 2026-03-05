import React, { useState, useEffect } from 'react';
import { User, Task, AuditLog, UserRole, Meeting, Contact, TaskStatus, ChecklistItem, ChecklistSubmission, Asset, AssetCheckRecord, AssetCheckBatch, Message } from './types';
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
import AssetManagement from './components/AssetManagement';
import MessageCenter from './components/MessageCenter';
import { sha256 } from './utils';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

import SessionTimeoutModal from './components/SessionTimeoutModal';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isHighContrast, setIsHighContrast] = useState(false);
  
  // --- 閒置登出邏輯 ---
  const IDLE_TIMEOUT = 1500; // 25分鐘 = 1500秒
  const [timeLeft, setTimeLeft] = useState(IDLE_TIMEOUT);
  const lastActiveRef = React.useRef<number>(Date.now());

  // 0. High Contrast Effect
  useEffect(() => {
    if (isHighContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [isHighContrast]);

  const toggleHighContrast = () => {
    setIsHighContrast(prev => !prev);
  };

  // 1. 監聽使用者活動，更新最後活動時間
  useEffect(() => {
    const handleActivity = () => {
      lastActiveRef.current = Date.now();
    };

    // 只有在登入狀態下才監聽
    if (currentUser) {
      window.addEventListener('mousemove', handleActivity);
      window.addEventListener('keydown', handleActivity);
      window.addEventListener('click', handleActivity);
      window.addEventListener('scroll', handleActivity);
      window.addEventListener('touchstart', handleActivity);
    }

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [currentUser]);

  // 2. 定時器倒數
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - lastActiveRef.current) / 1000);
      const remaining = IDLE_TIMEOUT - elapsed;

      setTimeLeft(remaining);

      if (remaining <= 0) {
        handleLogout();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentUser]);

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('currentUser');
    setTimeLeft(IDLE_TIMEOUT); // 重置計時器
  };

  // --- 初始化：檢查 Session Storage 是否有登入資訊 ---
  useEffect(() => {
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
      } catch (e) {
        console.error("解析登入資訊失敗", e);
        sessionStorage.removeItem('currentUser');
      }
    }
  }, []);

  const [tasks, setTasks] = useState<Task[]>([]);  
  const [users, setUsers] = useState<User[]>([]); 
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetCheckRecords, setAssetCheckRecords] = useState<AssetCheckRecord[]>([]);
  const [assetCheckBatches, setAssetCheckBatches] = useState<AssetCheckBatch[]>([]);
  
  const [checklistTemplate, setChecklistTemplate] = useState<ChecklistItem[]>([]);
  const [checklistSubmissions, setChecklistSubmissions] = useState<ChecklistSubmission[]>([]);
  const [isChangePwdOpen, setIsChangePwdOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  
  // --- Messaging State ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMessageCenterOpen, setIsMessageCenterOpen] = useState(false);
  
  // --- 警示功能 State ---
  const [dueSoonTasks, setDueSoonTasks] = useState<Task[]>([]);
  const [isDueSoonModalOpen, setIsDueSoonModalOpen] = useState(false);
  const [hasShownWarning, setHasShownWarning] = useState(false); 

  const isAdmin = (user: User | null) => {
    if (!user) return false;
    return user.role === UserRole.ADMIN;
  };

  const isManager3D = (user: User | null) => {
    if (!user) return false;
    return user.role === UserRole.MANAGER_3D;
  };

  const canAccessAdminPanel = (user: User | null) => {
    return isAdmin(user) || isManager3D(user);
  };

  // --- 1. 初始化資料抓取 (注意：未登入時會被 GAS 拒絕，這是正常的安全機制) ---
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!APP_CONFIG.SCRIPT_URL) return;
      try {
        const res = await fetch(`${APP_CONFIG.SCRIPT_URL}?action=getUsers`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) setUsers(data.data);
        else if (Array.isArray(data)) setUsers(data);
      } catch (err) { console.error("初始化用戶失敗 (可能因未登入被擋下)", err); }
    };
    fetchInitialData();
  }, []);

  // --- 2. 根據分頁載入資料 ---
  useEffect(() => {
    if (!currentUser) return;
    
    if (activeTab === 'meetings') fetchMeetings();
    if (activeTab === 'venue_check') fetchChecklistData();
    if (activeTab === 'assets') fetchAssets();
    if (activeTab === 'admin' && canAccessAdminPanel(currentUser)) { 
      fetchLogs(); 
      fetchContacts(); 
      // 進入後台時重新抓取受保護的使用者名單
      fetchProtectedUsers();
    }
    
    if (['dashboard', 'progress_report', 'calendar'].includes(activeTab)) {
      const assignedStations = currentUser.assignedStation ? currentUser.assignedStation.split(',') : [];
      let filter = '全部';
      if (!assignedStations.includes('ALL')) {
         filter = '全部'; 
      }
      fetchTasks(filter);
    }
  }, [activeTab, currentUser]);

  // --- 3. 監聽強制修改密碼需求 ---
  useEffect(() => {
    if (currentUser?.forceChangePassword) {
      setIsChangePwdOpen(true);
    }
  }, [currentUser]);

  // --- 4. 監聽任務資料載入，執行到期警示判斷 ---
  useEffect(() => {
    if (currentUser && tasks.length > 0 && !hasShownWarning) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const warningTasks = tasks.filter(task => {
        if (task.status === TaskStatus.COMPLETED) return false;

        const assignedStations = currentUser.assignedStation ? currentUser.assignedStation.split(',') : [];
        if (!assignedStations.includes('ALL') && !assignedStations.includes(task.stationCode)) {
          return false;
        }

        const deadline = new Date(task.deadline);
        deadline.setHours(23, 59, 59, 999); 
        
        const diffTime = deadline.getTime() - today.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);

        return diffDays <= 7;
      });

      if (warningTasks.length > 0) {
        setDueSoonTasks(warningTasks);
        setIsDueSoonModalOpen(true);
      }

      setHasShownWarning(true);
    }
  }, [tasks, currentUser, hasShownWarning]);

  // --- 5. 訊息輪詢 ---
  useEffect(() => {
    if (currentUser) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 60000); // Poll every minute
      return () => clearInterval(interval);
    }
  }, [currentUser]);


  // --- 業務邏輯函式定義 (⚡全面加上 Token) ---

  const fetchProtectedUsers = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${APP_CONFIG.SCRIPT_URL}?action=getUsers&userEmail=${encodeURIComponent(currentUser.email)}&token=${encodeURIComponent(currentUser.password || '')}`);
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch (err) { console.error("抓取使用者名單失敗", err); }
  };

  const fetchMeetings = async () => {
    try {
      const response = await fetch(`${APP_CONFIG.SCRIPT_URL}?action=getMeetings&userEmail=${encodeURIComponent(currentUser!.email)}&token=${encodeURIComponent(currentUser!.password || '')}`);
      const result = await response.json();
      const list = result.meetings || result.data; 
      if (result.success && Array.isArray(list)) setMeetings(list);
      else setMeetings([]);
    } catch (err) { console.error("載入會議紀錄失敗", err); }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${APP_CONFIG.SCRIPT_URL}?action=getLogs&userEmail=${encodeURIComponent(currentUser!.email)}&token=${encodeURIComponent(currentUser!.password || '')}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) setLogs(data.logs);
      else setLogs([]);
    } catch (err) { console.error("載入系統日誌失敗", err); }
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch(`${APP_CONFIG.SCRIPT_URL}?action=getContacts&userEmail=${encodeURIComponent(currentUser!.email)}&token=${encodeURIComponent(currentUser!.password || '')}`);
      const data = await res.json();
      const list = data.contacts || data.data;
      if (data.success && Array.isArray(list)) setContacts(list);
      else setContacts([]);
    } catch (err) { console.error("載入通訊錄失敗", err); }
  };

  const fetchAssets = async () => {
    try {
      const [assetsRes, recordsRes, batchesRes] = await Promise.all([
        fetch(`${APP_CONFIG.SCRIPT_URL}?action=getAssets&userEmail=${encodeURIComponent(currentUser!.email)}&token=${encodeURIComponent(currentUser!.password || '')}`),
        fetch(`${APP_CONFIG.SCRIPT_URL}?action=getAssetCheckRecords&userEmail=${encodeURIComponent(currentUser!.email)}&token=${encodeURIComponent(currentUser!.password || '')}`),
        fetch(`${APP_CONFIG.SCRIPT_URL}?action=getAssetCheckBatches&userEmail=${encodeURIComponent(currentUser!.email)}&token=${encodeURIComponent(currentUser!.password || '')}`)
      ]);

      const assetsData = await assetsRes.json();
      const recordsData = await recordsRes.json();
      const batchesData = await batchesRes.json();

      if (assetsData.success && Array.isArray(assetsData.assets)) {
        setAssets(assetsData.assets);
      } else {
        setAssets([]);
      }

      if (recordsData.success && Array.isArray(recordsData.records)) {
        setAssetCheckRecords(recordsData.records);
      } else {
        setAssetCheckRecords([]);
      }

      if (batchesData.success && Array.isArray(batchesData.batches)) {
        setAssetCheckBatches(batchesData.batches);
      } else {
        setAssetCheckBatches([]);
      }
    } catch (err) { console.error("載入財產資料失敗", err); }
  };

  const handleSaveBatchAssets = async (items: { asset: Partial<Asset>, file?: { name: string, type: string, content: string } }[]) => {
    if (!currentUser) return;
    try {
      const res = await fetch(APP_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveAssetsBatch',
          userEmail: currentUser.email,
          token: currentUser.password,
          items: items,
          folderId: APP_CONFIG.UPLOAD_FOLDER_ID
        })
      });
      const result = await res.json();
      if (result.success) {
        alert("批量新增財產成功");
        fetchAssets();
      } else {
        alert("批量新增失敗: " + result.msg);
      }
    } catch (err) { alert("儲存失敗，請檢查連線"); }
  };

  const handleEditAsset = async (asset: Partial<Asset>, file?: { name: string, type: string, content: string }) => {
    if (!currentUser) return;
    try {
      const res = await fetch(APP_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updateAsset',
          userEmail: currentUser.email,
          token: currentUser.password,
          data: asset,
          file: file,
          folderId: APP_CONFIG.UPLOAD_FOLDER_ID
        })
      });
      const result = await res.json();
      if (result.success) {
        alert("財產資料更新成功");
        fetchAssets();
      } else {
        alert("更新失敗: " + result.msg);
      }
    } catch (err) { alert("更新失敗，請檢查連線"); }
  };

  const handleSubmitAssetCheck = async (record: Partial<AssetCheckRecord>, file?: { name: string, type: string, content: string }) => {
    if (!currentUser) return;
    try {
      const res = await fetch(APP_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'submitAssetCheck',
          userEmail: currentUser.email,
          token: currentUser.password,
          data: record,
          file: file,
          folderId: APP_CONFIG.UPLOAD_FOLDER_ID
        })
      });
      const result = await res.json();
      if (result.success) {
        alert("檢核紀錄已提交" + (file ? " (含照片)" : ""));
        fetchAssets();
      } else {
        alert("提交失敗: " + result.msg);
      }
    } catch (err) { alert("提交失敗，請檢查連線"); }
  };

  const handleSaveAssetCheckBatch = async (batch: Partial<AssetCheckBatch>, files?: { [key: string]: { name: string, type: string, content: string } }) => {
    if (!currentUser) return;
    try {
      const res = await fetch(APP_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveAssetCheckBatch',
          userEmail: currentUser.email,
          token: currentUser.password,
          data: batch,
          files: files, // Map of assetId -> file
          folderId: APP_CONFIG.UPLOAD_FOLDER_ID
        })
      });
      const result = await res.json();
      if (result.success) {
        alert("財產檢核批次已提交");
        fetchAssets();
      } else {
        alert("提交失敗: " + result.msg);
      }
    } catch (err) { alert("提交失敗，請檢查連線"); }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(APP_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'deleteAsset',
          userEmail: currentUser.email,
          token: currentUser.password,
          id: id
        })
      });
      const result = await res.json();
      if (result.success) {
        alert("財產資料已刪除");
        fetchAssets();
      } else {
        alert("刪除失敗: " + result.msg);
      }
    } catch (err) { alert("刪除失敗，請檢查連線"); }
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
          token: currentUser.password, // ⚡ 加入 Token
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
        body: JSON.stringify({ 
          action: 'updateUser', 
          adminEmail: currentUser.email, 
          token: currentUser.password, // ⚡ 加入 Token
          targetEmail: email, 
          updates 
        })
      });
      const result = await res.json();
      if (result.success) {
        fetchProtectedUsers();
        return true;
      }
      return false;
    } catch (err) { return false; }
  };

  const handleDeleteUser = async (email: string): Promise<boolean> => {
    if (!currentUser || !isAdmin(currentUser)) return false;
    
    try {
      const res = await fetch(APP_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
          action: 'deleteUser', 
          adminEmail: currentUser.email, 
          token: currentUser.password, // ⚡ 加入 Token
          targetEmail: email 
        })
      });
      const result = await res.json();
      if (result.success) {
        fetchProtectedUsers();
        alert("使用者已刪除");
        return true;
      } else {
        alert("刪除失敗: " + (result.msg || "未知錯誤"));
        return false;
      }
    } catch (err) { 
      alert("連線錯誤，請檢查網路狀態");
      return false; 
    }
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
          token: currentUser.password, // ⚡ 加入 Token
          taskData 
        })
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
          token: currentUser.password, // ⚡ 加入 Token
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
      const res = await fetch(`${APP_CONFIG.SCRIPT_URL}?action=getTasks&station=${encodeURIComponent(stationName)}&userEmail=${encodeURIComponent(currentUser!.email)}&token=${encodeURIComponent(currentUser!.password || '')}`);
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

  const fetchMessages = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${APP_CONFIG.SCRIPT_URL}?action=getMessages&userEmail=${encodeURIComponent(currentUser.email)}&token=${encodeURIComponent(currentUser.password || '')}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch (err) { console.error("Fetch messages error", err); }
  };

  const handleMarkAsRead = async (messageId: string) => {
    if (!currentUser) return;
    // Optimistic update
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isRead: true } : m));
    try {
      await fetch(APP_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'markAsRead',
          userEmail: currentUser.email,
          token: currentUser.password,
          messageId: messageId
        })
      });
    } catch (err) { console.error("Mark read error", err); }
  };

  const handleSendMessage = async (receiverEmail: string, content: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const res = await fetch(APP_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'sendMessage',
          userEmail: currentUser.email,
          token: currentUser.password,
          receiverEmail: receiverEmail,
          content: content,
          type: 'private'
        })
      });
      const result = await res.json();
      if (result.success) {
        return true;
      }
      return false;
    } catch (err) {
      console.error("Send message error", err);
      return false;
    }
  };

  const fetchChecklistData = async () => {
    try {
      const [subRes, tmplRes] = await Promise.all([
        fetch(`${APP_CONFIG.SCRIPT_URL}?action=getChecklistSubmissions&userEmail=${encodeURIComponent(currentUser!.email)}&token=${encodeURIComponent(currentUser!.password || '')}`),
        fetch(`${APP_CONFIG.SCRIPT_URL}?action=getChecklistTemplate&userEmail=${encodeURIComponent(currentUser!.email)}&token=${encodeURIComponent(currentUser!.password || '')}`)
      ]);

      const subData = await subRes.json();
      const tmplData = await tmplRes.json();

      if(subData.success) {
         let list = subData.submissions || subData.data;
         if (Array.isArray(list)) {
            list = list.map((item: any) => ({
              ...item,
              stationName: item.stationName || STATIONS.find(s => s.code === item.stationCode)?.name || item.stationCode
            }));
            setChecklistSubmissions(list);
         } else {
            setChecklistSubmissions([]);
         }
      }

      if (tmplData.success) {
         const items = tmplData.template || tmplData.data;
         setChecklistTemplate(Array.isArray(items) ? items : []);
      }
    } catch (err) { 
      console.error("載入檢核表資料失敗", err); 
    }
  };

  const handleSaveChecklistTemplate = async (items: ChecklistItem[]) => {
    if (!currentUser) return;
    try {
      const res = await fetch(APP_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveChecklistTemplate',
          userEmail: currentUser.email,
          token: currentUser.password, // ⚡ 加入 Token
          items: items 
        })
      });
      const result = await res.json();
      if (result.success) {
        alert("檢核項目範本已更新");
        fetchChecklistData(); 
      } else {
        alert("更新失敗: " + result.msg);
      }
    } catch (err) { alert("儲存失敗，請檢查連線"); }
  };

  const handleSubmitChecklist = async (data: any) => {
     if (!currentUser) return;
     try {
       const res = await fetch(APP_CONFIG.SCRIPT_URL, {
         method: 'POST',
         headers: { 'Content-Type': 'text/plain;charset=utf-8' },
         body: JSON.stringify({
           action: 'submitChecklist',
           userEmail: currentUser.email,
           token: currentUser.password, // ⚡ 加入 Token
           data: data
         })
       });
       const result = await res.json();
       if (result.success) {
         alert("本月檢核表已成功提交");
         fetchChecklistData(); 
       } else {
         alert("提交失敗: " + result.msg);
       }
     } catch (err) { alert("提交失敗，請檢查連線"); }
  };

  const handleResolveAlert = async (submissionId: string, alertId: string) => {
    if (!currentUser) return;
    try {
      setChecklistSubmissions(prev => prev.map(sub => {
        if (sub.id === submissionId) {
          const currentResolved = sub.resolvedAlerts || [];
          if (!currentResolved.includes(alertId)) {
            return { ...sub, resolvedAlerts: [...currentResolved, alertId] };
          }
        }
        return sub;
      }));

      const res = await fetch(APP_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'resolveAlert',
          userEmail: currentUser.email,
          token: currentUser.password, // ⚡ 加入 Token
          submissionId: submissionId,
          alertId: alertId
        })
      });
      
      const result = await res.json();
      if (!result.success) {
        alert("更新失敗: " + result.msg);
        fetchChecklistData(); 
      }
    } catch (err) {
      console.error("Resolve alert error", err);
      fetchChecklistData();
    }
  };

  const handleSaveMeeting = async (meeting: Partial<Meeting>, fileData?: { name: string, type: string, content: string }) => {
    if(!currentUser) return;
    try {
      const res = await fetch(APP_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
          action: 'saveMeeting', 
          userEmail: currentUser.email, 
          token: currentUser.password, // ⚡ 加入 Token
          data: meeting, 
          file: fileData, 
          folderId: APP_CONFIG.UPLOAD_FOLDER_ID 
        })
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
          token: currentUser.password, // ⚡ 加入 Token 驗證舊身分
          newPassword: hashedPassword
        })
      });
      const result = await res.json();
      
      if (result.success) {
        alert("密碼修改成功！請牢記您的新密碼。");
        // 更新當前狀態的 password 為新的雜湊值，避免下次請求被擋
        const updatedUser = { ...currentUser, password: hashedPassword, forceChangePassword: false };
        setCurrentUser(updatedUser);
        sessionStorage.setItem('currentUser', JSON.stringify(updatedUser)); // 更新 Session Storage
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

  const handleLogin = (user: User) => { 
    setCurrentUser(user); 
    setActiveTab('dashboard'); 
    sessionStorage.setItem('currentUser', JSON.stringify(user)); // 寫入 Session Storage
    lastActiveRef.current = Date.now(); // 重置計時器
  };

  if (!currentUser) {
    return (
      <ErrorBoundary>
        <Login onLogin={handleLogin} onRegister={handleRegister} onForgotPassword={async () => {}} users={users} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary currentUser={currentUser}>
      <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUser={currentUser} 
        onLogout={handleLogout} 
        timeLeft={timeLeft}
        unreadCount={messages.filter(m => !m.isRead).length}
        onToggleMessages={() => setIsMessageCenterOpen(!isMessageCenterOpen)}
        isHighContrast={isHighContrast}
        toggleHighContrast={toggleHighContrast}
      >
      {activeTab === 'dashboard' && <Dashboard tasks={tasks} />}
      {activeTab === 'progress_report' && <TaskList tasks={tasks} currentUser={currentUser} onEditTask={setEditingTask} onViewDetail={setViewingTask} />}
      {activeTab === 'venue_check' && (
        <ChecklistDashboard 
          currentUser={currentUser} 
          submissions={checklistSubmissions} 
          template={checklistTemplate} 
          onSaveTemplate={handleSaveChecklistTemplate} 
          onSubmitChecklist={handleSubmitChecklist}    
          onResolveAlert={handleResolveAlert}
        />
      )}
      {activeTab === 'assets' && (
        <AssetManagement 
          currentUser={currentUser}
          assets={assets}
          checkRecords={assetCheckRecords}
          checkBatches={assetCheckBatches}
          onDelete={handleDeleteAsset}
          onSubmitCheck={handleSubmitAssetCheck}
          onSaveBatch={handleSaveAssetCheckBatch}
          onSaveBatchAssets={handleSaveBatchAssets}
          onEdit={handleEditAsset}
        />
      )}
      {activeTab === 'calendar' && <CalendarView tasks={tasks} onEditTask={setEditingTask} />}
      {activeTab === 'meetings' && <MeetingRecords meetings={meetings} onSave={handleSaveMeeting} currentUser={currentUser} />}
      
      {activeTab === 'admin' && canAccessAdminPanel(currentUser) && (
        <AdminPanel 
          users={users} 
          logs={logs} 
          onUpdateUser={handleUpdateUser} 
          onDeleteUser={handleDeleteUser}
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
      <SessionTimeoutModal 
        isOpen={timeLeft <= 60} 
        timeLeft={timeLeft} 
        onContinue={() => {
          lastActiveRef.current = Date.now();
          setTimeLeft(IDLE_TIMEOUT);
        }} 
        onLogout={handleLogout} 
      />

      <ChangePasswordModal 
        isOpen={isChangePwdOpen} 
        onClose={() => setIsChangePwdOpen(false)} 
        onSubmit={handleChangePassword} 
        isForced={!!currentUser?.forceChangePassword} 
      />
      
      <DueSoonModal
        isOpen={isDueSoonModalOpen}
        onClose={() => setIsDueSoonModalOpen(false)}
        tasks={dueSoonTasks}
        currentUser={currentUser}
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

      <MessageCenter 
        isOpen={isMessageCenterOpen}
        onClose={() => setIsMessageCenterOpen(false)}
        messages={messages}
        users={users}
        currentUser={currentUser}
        onMarkAsRead={handleMarkAsRead}
        onSendMessage={handleSendMessage}
      />
      </Layout>
    </ErrorBoundary>
  );
};

export default App;