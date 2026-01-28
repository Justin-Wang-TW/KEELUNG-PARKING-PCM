import React, { useState, useMemo, useEffect } from 'react';
import { Task, User, StationCode, TaskStatus } from '../types';
import { STATIONS, STATUS_COLORS } from '../constants';
import { Search, History, Edit, Paperclip, ClipboardCheck, Eye } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  currentUser: User;
  onEditTask: (task: Task) => void;
  // Changed from onViewHistory(uid) to onViewDetail(task) for rich modal
  onViewDetail: (task: Task) => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks = [], currentUser, onEditTask, onViewDetail }) => {
  // Logic: Users/Managers are locked to their assigned station. Admins can see ALL.
  const [filterStation, setFilterStation] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize filter based on user role
  useEffect(() => {
    if (currentUser.assignedStation !== 'ALL') {
      setFilterStation(currentUser.assignedStation);
    }
  }, [currentUser]);

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((task) => {
      // Security Check: Even if UI dropdown is bypassed, enforce logic here for non-admins
      const userAllowedStation = currentUser.assignedStation === 'ALL' ? 'ALL' : currentUser.assignedStation;
      if (userAllowedStation !== 'ALL' && task.stationCode !== userAllowedStation) {
        return false; 
      }

      const matchStation = filterStation === 'ALL' || task.stationCode === filterStation;
      const matchStatus = filterStatus === 'ALL' || task.status === filterStatus;
      const matchSearch = task.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          task.uid.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStation && matchStatus && matchSearch;
    });
  }, [tasks, filterStation, filterStatus, searchTerm, currentUser]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 flex items-center">
             <ClipboardCheck className="w-6 h-6 mr-2 text-blue-600" />
             進度匯報
           </h2>
           <p className="text-gray-500 mt-1">
             {currentUser.assignedStation === 'ALL' 
               ? '檢核全區履約工項並追蹤進度' 
               : '請檢核本場站應執行項目，並填報進度與上傳佐證'}
           </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="搜尋 UID 或項目名稱..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1 font-bold">場站篩選</label>
          <select
            value={filterStation}
            onChange={(e) => setFilterStation(e.target.value)}
            disabled={currentUser.assignedStation !== 'ALL'}
            className="w-full p-2 border rounded-lg bg-white disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="ALL">所有場站</option>
            {STATIONS.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1 font-bold">狀態篩選</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full p-2 border rounded-lg bg-white"
          >
            <option value="ALL">所有狀態</option>
            {Object.values(TaskStatus).map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-600 w-1/3">UID / 場站 / 項目內容</th>
                <th className="px-6 py-4 font-semibold text-gray-600">截止日期</th>
                <th className="px-6 py-4 font-semibold text-gray-600">狀態</th>
                <th className="px-6 py-4 font-semibold text-gray-600">執行人</th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-right">回報/檢視</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    查無符合條件的工項
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr key={task.uid} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                         <div className="flex items-center gap-2 mb-1.5">
                             <span className="font-mono text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{task.uid}</span>
                             <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                               {task.stationName}
                             </span>
                         </div>
                         <div className="font-bold text-gray-800 text-base">{task.itemName}</div>
                         {task.attachmentUrl && (
                             <div className="text-blue-500 text-xs flex items-center mt-1 font-medium">
                                <Paperclip className="w-3 h-3 mr-1" />
                                已上傳佐證資料
                             </div>
                         )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <span className={new Date(task.deadline) < new Date() && task.status !== TaskStatus.COMPLETED ? 'text-red-600 font-bold' : 'text-gray-600'}>
                        {task.deadline}
                       </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[task.status]}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                      {task.executorEmail || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => onEditTask(task)}
                          className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-medium transition-colors"
                          title="填寫進度與上傳照片"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          匯報進度
                        </button>
                        <button
                          onClick={() => onViewDetail(task)}
                          className="flex items-center px-3 py-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded text-xs font-medium transition-colors border border-transparent hover:border-gray-200"
                          title="查看詳細資訊與下載檔案"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          檢視
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TaskList;