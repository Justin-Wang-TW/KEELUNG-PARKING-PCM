import React, { useState, useEffect } from 'react';
import { Task, User, TaskStatus } from '../types';
import { STATUS_COLORS } from '../constants';
import { 
  X, FileText, Download, User as UserIcon, Calendar, 
  MapPin, Paperclip, Clock, Send, Loader2, CheckCircle2 
} from 'lucide-react';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  // Updated signature: onSave now accepts optional new file data
  onSave: (
    taskId: string, 
    newStatus: TaskStatus, 
    currentAttachmentUrl?: string,
    newFile?: { name: string, type: string, content: string }
  ) => Promise<void>; 
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, isOpen, onClose, currentUser, onSave }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | ''>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success'>('idle');

  useEffect(() => {
    if (task) {
      setSelectedStatus(task.status);
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const handleUpdateStatus = async () => {
    if (!selectedStatus) {
      alert('請選擇目前的執行狀態');
      return;
    }
    if (!currentUser) {
      alert('登入逾時，請重新登入');
      return;
    }

    setIsSubmitting(true);

    try {
      let fileData = undefined;
      
      if (selectedFile) {
        if (selectedFile.size > 10 * 1024 * 1024) {
          alert("檔案過大，請選擇 10MB 以下的檔案。");
          setIsSubmitting(false);
          return;
        }
        
        const base64Content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(selectedFile);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
        });

        fileData = {
          name: selectedFile.name,
          type: selectedFile.type,
          content: base64Content
        };
      }

      // 呼叫 App.tsx 的 handleSaveTaskProgress
      // 若無新檔案，傳入目前的 task.attachmentUrl 以保留舊連結
      // 若有新檔案，傳入 fileData，後端會上傳到 Drive 並回傳新連結
      await onSave(task.uid, selectedStatus as TaskStatus, task.attachmentUrl, fileData);

      setUploadStatus('success');
      setTimeout(() => {
        onClose();
        setUploadStatus('idle');
        setSelectedFile(null);
      }, 1500);

    } catch (error) {
      console.error('提交失敗:', error);
      alert('提交過程中發生錯誤，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBase64 = task.attachmentUrl?.startsWith('data:');
  
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in">
        
        {/* Header */}
        <div className="p-5 border-b flex justify-between items-start bg-gray-50 rounded-t-xl">
          <div className="flex-1 pr-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-200 text-gray-700">
                <MapPin className="w-3 h-3 mr-1" />
                {task.stationName}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${STATUS_COLORS[task.status]}`}>
                {task.status}
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 leading-snug">{task.itemName}</h3>
            <p className="text-xs font-mono text-gray-400 mt-1">UID: {task.uid}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-xs font-bold text-gray-500 uppercase flex items-center mb-1">
                <Calendar className="w-3 h-3 mr-1" /> 截止日期
              </span>
              <p className={`font-medium ${new Date(task.deadline) < new Date() && task.status !== '已完成' ? 'text-red-600' : 'text-gray-800'}`}>
                {task.deadline}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-xs font-bold text-gray-500 uppercase flex items-center mb-1">
                <Clock className="w-3 h-3 mr-1" /> 最後更新時間
              </span>
              <p className="font-medium text-gray-800">
                {task.lastUpdated ? new Date(task.lastUpdated).toLocaleString() : '-'}
              </p>
            </div>
          </div>

          {/* ⚡ 進度提交表單 (重點功能) */}
          <div className="border-t pt-4 bg-blue-50/50 p-5 rounded-xl border border-blue-100">
            <h4 className="text-sm font-bold text-blue-800 mb-4 flex items-center">
              <Send className="w-4 h-4 mr-2" />
              提交進度更新
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">執行狀態更新</label>
                <select 
                  className="w-full p-2.5 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as TaskStatus)}
                >
                  {Object.values(TaskStatus).map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">上傳佐證檔案 (圖片或PDF)</label>
                <input 
                  type="file" 
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  accept="image/*,.pdf,.doc,.docx"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer"
                />
              </div>

              <button
                onClick={handleUpdateStatus}
                disabled={isSubmitting || !selectedStatus}
                className={`w-full py-3 rounded-lg text-white font-bold flex items-center justify-center transition-all ${
                  isSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 shadow-md'
                }`}
              >
                {isSubmitting ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> 正在處理並上傳檔案...</>
                ) : uploadStatus === 'success' ? (
                  <><CheckCircle2 className="w-5 h-5 mr-2" /> 更新成功！</>
                ) : (
                  '確認提交回報'
                )}
              </button>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
              <Paperclip className="w-4 h-4 mr-2 text-blue-600" />
              目前佐證資料附件
            </h4>
            
            {task.attachmentUrl ? (
              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="p-2 bg-gray-100 rounded">
                    <FileText className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                       {isBase64 ? '已上傳之佐證檔案' : '外部連結檔案'}
                    </p>
                    <p className="text-xs text-gray-400">點擊按鈕開啟連結</p>
                  </div>
                </div>
                <a 
                  href={task.attachmentUrl}
                  download={isBase64 ? `proof_${task.uid}` : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  開啟檢視
                </a>
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-400 text-sm">目前尚無上傳佐證資料</p>
              </div>
            )}
          </div>

        </div>

        <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;