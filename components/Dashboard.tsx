import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Task, TaskStats, TaskStatus, StationCode } from '../types';
import { STATIONS } from '../constants';
import StationHistoryModal from './StationHistoryModal';
import { ChevronRight } from 'lucide-react';

interface DashboardProps {
  tasks: Task[];
}

const COLORS = ['#10B981', '#E5E7EB', '#3B82F6', '#EF4444']; // Green, Gray, Blue, Red

const Dashboard: React.FC<DashboardProps> = ({ tasks = [] }) => {
  const [selectedStationCode, setSelectedStationCode] = useState<string | null>(null);

  const stats = useMemo(() => {
    return STATIONS.map(station => {
      const stationTasks = (tasks || []).filter(t => t.stationCode === station.code);
      const total = stationTasks.length;
      const completed = stationTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
      const overdue = stationTasks.filter(t => t.status === TaskStatus.OVERDUE).length;
      
      return {
        stationName: station.name,
        stationCode: station.code, // Added for filtering
        total,
        completed,
        overdue,
        rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });
  }, [tasks]);

  const globalStats = useMemo(() => {
    const safeTasks = tasks || [];
    const total = safeTasks.length;
    const completed = safeTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const pending = safeTasks.filter(t => t.status === TaskStatus.PENDING).length;
    const inProgress = safeTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
    const overdue = safeTasks.filter(t => t.status === TaskStatus.OVERDUE).length;

    return [
      { name: '已完成', value: completed },
      { name: '待處理', value: pending },
      { name: '執行中', value: inProgress },
      { name: '逾期', value: overdue },
    ];
  }, [tasks]);

  const selectedStationName = STATIONS.find(s => s.code === selectedStationCode)?.name || '';
  const selectedStationTasks = (tasks || []).filter(t => t.stationCode === selectedStationCode);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">戰情儀表板</h2>
           <p className="text-gray-500 mt-1">即時監控各場站履約狀況</p>
        </div>
        <div className="mt-4 md:mt-0 bg-white p-3 rounded-lg shadow-sm border">
          <span className="text-sm text-gray-500 mr-2">總任務數:</span>
          <span className="text-xl font-bold text-gray-800">{(tasks || []).length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         {stats.map((stat) => (
           <div 
             key={stat.stationCode} 
             onClick={() => setSelectedStationCode(stat.stationCode)}
             className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
           >
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">{stat.stationName}</h3>
               <span className={`px-2 py-1 text-xs rounded-full ${stat.rate >= 90 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                 達成率 {stat.rate}%
               </span>
             </div>
             <div className="space-y-2">
                <div className="flex justify-between text-sm">
                   <span className="text-gray-500">已完成</span>
                   <span className="font-medium text-gray-900">{stat.completed}/{stat.total}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                   <div 
                     className={`h-2 rounded-full ${stat.rate === 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                     style={{ width: `${stat.rate}%` }}
                   ></div>
                </div>
                {stat.overdue > 0 ? (
                  <p className="text-xs text-red-500 mt-2 flex items-center">
                     ⚠️ {stat.overdue} 筆逾期未處理
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-2 flex items-center justify-between">
                     點擊查看歷史紀錄
                     <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-blue-400" />
                  </p>
                )}
             </div>
           </div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
          <h3 className="text-lg font-bold text-gray-800 mb-6">全區任務狀態分佈</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={globalStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {globalStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <h3 className="text-lg font-bold text-gray-800 mb-6">近期高風險項目</h3>
           <div className="space-y-4">
             {(tasks || [])
                .filter(t => t.status === TaskStatus.OVERDUE || (t.status !== TaskStatus.COMPLETED && new Date(t.deadline) < new Date()))
                .slice(0, 5)
                .map(task => (
                  <div key={task.uid} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                     <div>
                        <div className="flex items-center gap-2">
                           <span className="text-xs font-bold text-red-600 bg-red-200 px-1 rounded">{task.stationName}</span>
                           <h4 className="text-sm font-medium text-gray-900">{task.itemName}</h4>
                        </div>
                        <p className="text-xs text-red-600 mt-1">截止日期: {task.deadline}</p>
                     </div>
                     <span className="text-xs font-semibold px-2 py-1 bg-white text-red-600 rounded border border-red-200">
                        {task.status}
                     </span>
                  </div>
             ))}
             {(tasks || []).filter(t => t.status === TaskStatus.OVERDUE).length === 0 && (
               <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <p>👍 目前無逾期項目</p>
               </div>
             )}
           </div>
        </div>
      </div>

      <StationHistoryModal 
        isOpen={!!selectedStationCode}
        onClose={() => setSelectedStationCode(null)}
        stationName={selectedStationName}
        tasks={selectedStationTasks}
      />
    </div>
  );
};

export default Dashboard;