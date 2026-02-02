import React, { useState } from 'react';
import { ChecklistSubmission, ChecklistItem, User, StationCode, CheckStatus, UserRole } from '../types';
import { STATIONS } from '../constants';
import { ClipboardList, Plus, Search, Settings, FileCheck, AlertCircle, Eye } from 'lucide-react';
import ChecklistTemplateModal from './ChecklistTemplateModal';
import ChecklistSubmissionModal from './ChecklistSubmissionModal';

interface ChecklistDashboardProps {
  currentUser: User;
  submissions: ChecklistSubmission[];
  template: ChecklistItem[];
  onSaveTemplate: (items: ChecklistItem[]) => Promise<void>;
  onSubmitChecklist: (data: any) => Promise<void>;
}

const ChecklistDashboard: React.FC<ChecklistDashboardProps> = ({
  currentUser,
  submissions = [],
  template = [],
  onSaveTemplate,
  onSubmitChecklist
}) => {
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [viewingSubmission, setViewingSubmission] = useState<ChecklistSubmission | null>(null);

  const [filterStation, setFilterStation] = useState<string>('ALL');
  const [filterMonth, setFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Permission Logic:
  // OPERATOR (經營業者) and MANAGER_DEPT (交通處) are Read-Only. 
  // They cannot manage templates or submit new checklists.
  const isReadOnly = currentUser.role === UserRole.OPERATOR || currentUser.role === UserRole.MANAGER_DEPT;

  // Filter Submissions
  const filteredSubmissions = submissions.filter(sub => {
    const matchStation = filterStation === 'ALL' || sub.stationCode === filterStation;
    const matchMonth = filterMonth === '' || sub.yearMonth === filterMonth;
    
    // Permission check: Non-admins/Managers can only see their station or if they have ALL access
    const userStation = currentUser.assignedStation === 'ALL' ? 'ALL' : currentUser.assignedStation;
    if (userStation !== 'ALL' && sub.stationCode !== userStation) return false;

    return matchStation && matchMonth;
  });

  const handleOpenSubmission = () => {
    setIsSubmissionModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 flex items-center">
             <ClipboardList className="w-6 h-6 mr-2 text-blue-600" />
             每月場館檢核表
           </h2>
           <p className="text-gray-500 mt-1">
             定期檢視停車場環境、設備與服務品質
           </p>
        </div>
        <div className="flex gap-2">
          {/* Only show management buttons if NOT read-only */}
          {!isReadOnly && (
            <>
              <button
                onClick={() => setIsTemplateModalOpen(true)}
                className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors shadow-sm border border-gray-200"
              >
                <Settings className="w-4 h-4 mr-2" />
                管理檢核項目
              </button>
              <button
                onClick={handleOpenSubmission}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                填寫本月檢核
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-gray-500 block mb-1 font-bold">檢核月份</label>
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-full p-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1 font-bold">場站篩選</label>
          <select
            value={filterStation}
            onChange={(e) => setFilterStation(e.target.value)}
            disabled={currentUser.assignedStation !== 'ALL'}
            className="w-full p-2 border rounded-lg bg-white disabled:bg-gray-100"
          >
            <option value="ALL">所有場站</option>
            {STATIONS.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Submissions List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-600">檢核月份</th>
                <th className="px-6 py-4 font-semibold text-gray-600">場站</th>
                <th className="px-6 py-4 font-semibold text-gray-600">填表人</th>
                <th className="px-6 py-4 font-semibold text-gray-600">填表時間</th>
                <th className="px-6 py-4 font-semibold text-gray-600">異常項目數</th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    此月份尚無檢核紀錄
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => {
                  const issueCount = sub.results.filter(r => r.status === CheckStatus.ISSUE).length;
                  return (
                    <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-gray-700">
                        {sub.yearMonth}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {sub.stationName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{sub.submittedBy}</td>
                      <td className="px-6 py-4 text-gray-500 text-xs">
                        {new Date(sub.submittedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        {issueCount > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {issueCount} 項異常
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">
                            <FileCheck className="w-3 h-3 mr-1" />
                            全數正常
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setViewingSubmission(sub)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-xs flex items-center justify-end w-full"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          檢視詳情
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Template Modal - Only render if not read-only to be safe, though button is hidden */}
      {!isReadOnly && (
        <ChecklistTemplateModal 
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          initialItems={template}
          onSave={onSaveTemplate}
        />
      )}

      {/* Submission Modal (Fill Out) - Only render if not read-only */}
      {!isReadOnly && (
        <ChecklistSubmissionModal
          isOpen={isSubmissionModalOpen}
          onClose={() => setIsSubmissionModalOpen(false)}
          currentUser={currentUser}
          template={template}
          onSubmit={onSubmitChecklist}
          onManageTemplate={() => setIsTemplateModalOpen(true)}
        />
      )}

      {/* View Details Modal - Accessible to everyone */}
      {viewingSubmission && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in">
             <div className="p-5 border-b bg-gray-50 rounded-t-xl flex justify-between items-center">
                <div>
                   <h3 className="text-xl font-bold text-gray-800">
                     {viewingSubmission.yearMonth} 場館檢核詳情
                   </h3>
                   <p className="text-sm text-gray-500 mt-1">
                     {viewingSubmission.stationName} - 填表人: {viewingSubmission.submittedBy}
                   </p>
                </div>
                <button onClick={() => setViewingSubmission(null)}><div className="p-2 hover:bg-gray-200 rounded-full"><Plus className="w-6 h-6 rotate-45 text-gray-500" /></div></button>
             </div>
             <div className="p-6 overflow-y-auto">
                <table className="w-full text-sm border-collapse">
                   <thead>
                      <tr className="bg-gray-100 text-gray-600">
                         <th className="p-2 text-left w-1/4">類別</th>
                         <th className="p-2 text-left w-1/3">檢查項目</th>
                         <th className="p-2 text-center w-24">結果</th>
                         <th className="p-2 text-left">備註說明</th>
                      </tr>
                   </thead>
                   <tbody>
                      {viewingSubmission.results.map((res, idx) => {
                         const itemDef = template.find(t => t.id === res.itemId);
                         // Use Snapshot if available, fallback to template definition
                         const displayCategory = res.category || itemDef?.category || '未分類';
                         const displayContent = res.content || itemDef?.content || '未知項目';
                         
                         return (
                            <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                               <td className="p-2 font-medium text-gray-500">{displayCategory}</td>
                               <td className="p-2 text-gray-800">{displayContent}</td>
                               <td className="p-2 text-center">
                                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                     res.status === CheckStatus.ISSUE ? 'bg-red-100 text-red-700' : 
                                     res.status === CheckStatus.NA ? 'bg-gray-100 text-gray-600' :
                                     'bg-green-100 text-green-700'
                                  }`}>
                                     {res.status}
                                  </span>
                               </td>
                               <td className="p-2 text-gray-600">{res.note || '-'}</td>
                            </tr>
                         );
                      })}
                   </tbody>
                </table>
             </div>
             <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-end">
                <button onClick={() => setViewingSubmission(null)} className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900">關閉</button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ChecklistDashboard;