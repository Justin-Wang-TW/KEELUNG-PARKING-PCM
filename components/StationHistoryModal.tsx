import React from 'react';
import { Task, TaskStatus } from '../types';
import { X, CheckCircle, ExternalLink, Calendar } from 'lucide-react';

interface StationHistoryModalProps {
  stationName: string;
  tasks: Task[];
  isOpen: boolean;
  onClose: () => void;
}

const StationHistoryModal: React.FC<StationHistoryModalProps> = ({ stationName, tasks, isOpen, onClose }) => {
  if (!isOpen) return null;

  // Filter only completed tasks and sort by lastUpdated (newest first)
  const historyTasks = tasks
    .filter(t => t.status === TaskStatus.COMPLETED)
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col animate-fade-in">
        <div className="flex justify-between items-center p-5 border-b bg-gray-50 rounded-t-xl">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center">
              <CheckCircle className="w-6 h-6 mr-2 text-green-600" />
              {stationName} - 履約完成紀錄
            </h3>
            <p className="text-sm text-gray-500 mt-1">顯示該場站所有已結案之工作項目</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        
        <div className="p-0 overflow-y-auto flex-1">
          {historyTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <CheckCircle className="w-16 h-16 mb-4 opacity-20" />
              <p>目前尚無已完成的履約紀錄</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">完成日期</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">工項名稱</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">UID</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">執行人員</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">佐證</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {historyTasks.map((task) => (
                  <tr key={task.uid} className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      {task.lastUpdated ? task.lastUpdated.split('T')[0] : task.deadline}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                      {task.itemName}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-500">
                      {task.uid}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {task.executorEmail || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {task.attachmentUrl ? (
                        <a 
                          href={task.attachmentUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                        >
                          開啟附件 <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        <div className="p-4 border-t bg-gray-50 rounded-b-xl text-right">
          <span className="text-sm text-gray-500">
            共 {historyTasks.length} 筆紀錄
          </span>
        </div>
      </div>
    </div>
  );
};

export default StationHistoryModal;