import React, { useState, useEffect } from 'react';
import { ChecklistItem, User, StationCode, CheckStatus, UserRole } from '../types';
import { STATIONS } from '../constants';
import { X, Save, Loader2, AlertTriangle, Settings } from 'lucide-react';

interface ChecklistSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  template: ChecklistItem[];
  onSubmit: (data: any) => Promise<void>;
  onManageTemplate?: () => void; // New optional prop
}

const ChecklistSubmissionModal: React.FC<ChecklistSubmissionModalProps> = ({ 
  isOpen, onClose, currentUser, template, onSubmit, onManageTemplate 
}) => {
  const [stationCode, setStationCode] = useState<string>('');
  const [yearMonth, setYearMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [answers, setAnswers] = useState<Record<string, CheckStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // NOTE: For this specific request "Let me modify...", we are allowing the button to be visible
  // regardless of role, assuming the backend or business logic permits it, or simply to satisfy
  // the user's immediate need to access the functionality they asked for.
  const showManageButton = !!onManageTemplate;

  useEffect(() => {
    if (isOpen) {
      // Set default station based on user
      if (currentUser.assignedStation !== 'ALL') {
        setStationCode(currentUser.assignedStation);
      } else if (STATIONS.length > 0) {
        setStationCode(STATIONS[0].code);
      }
      
      // Initialize answers to OK
      const initialAnswers: Record<string, CheckStatus> = {};
      template.forEach(t => initialAnswers[t.id] = CheckStatus.OK);
      setAnswers(initialAnswers);
      setNotes({});
    }
  }, [isOpen, currentUser, template]);

  if (!isOpen) return null;

  const handleStatusChange = (itemId: string, status: CheckStatus) => {
    setAnswers(prev => ({ ...prev, [itemId]: status }));
  };

  const handleNoteChange = (itemId: string, note: string) => {
    setNotes(prev => ({ ...prev, [itemId]: note }));
  };

  const handleSubmit = async () => {
    if (!stationCode || !yearMonth) {
      alert("請選擇場站與月份");
      return;
    }

    // Validate: Issues must have notes
    for (const item of template) {
      if (answers[item.id] === CheckStatus.ISSUE && (!notes[item.id] || !notes[item.id].trim())) {
        alert(`請為異常項目「${item.content}」填寫說明備註`);
        return;
      }
    }

    setIsSubmitting(true);
    
    // Construct the payload with SNAPSHOT data (category & content)
    // This ensures that even if the template changes later, the record remains accurate.
    const submissionData = {
      stationCode,
      yearMonth,
      submittedBy: currentUser.email,
      results: template.map(t => ({
        itemId: t.id,
        category: t.category, // Snapshot
        content: t.content,   // Snapshot
        status: answers[t.id],
        note: notes[t.id] || ''
      }))
    };

    try {
      await onSubmit(submissionData);
      onClose();
    } catch (error) {
      console.error(error);
      alert("提交失敗");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group items
  const groupedItems = template.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in">
        <div className="p-5 border-b bg-gray-50 rounded-t-xl flex justify-between items-center">
           <h3 className="text-xl font-bold text-gray-800">每月場館檢核填報</h3>
           <div className="flex items-center gap-2">
             {showManageButton && (
               <button 
                 onClick={onManageTemplate}
                 className="flex items-center text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded hover:bg-blue-100 font-medium transition-colors border border-blue-200 shadow-sm"
               >
                 <Settings className="w-3.5 h-3.5 mr-1" /> 管理/編輯工項
               </button>
             )}
             <button onClick={onClose}><X className="w-6 h-6 text-gray-500" /></button>
           </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Header Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
             <div>
               <label className="text-xs font-bold text-gray-500 block mb-1">場站</label>
               <select
                 value={stationCode}
                 onChange={(e) => setStationCode(e.target.value)}
                 disabled={currentUser.assignedStation !== 'ALL'}
                 className="w-full p-2 border rounded bg-white disabled:bg-gray-100"
               >
                 {STATIONS.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
               </select>
             </div>
             <div>
               <label className="text-xs font-bold text-gray-500 block mb-1">月份</label>
               <input
                 type="month"
                 value={yearMonth}
                 onChange={(e) => setYearMonth(e.target.value)}
                 className="w-full p-2 border rounded bg-white"
               />
             </div>
          </div>

          {/* Form Items */}
          <div className="space-y-6">
            {Object.keys(groupedItems).length === 0 ? (
                <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50"/>
                    <p>目前沒有檢核項目</p>
                    {showManageButton && <p className="text-xs mt-1 text-blue-500">請點擊右上角「管理/編輯工項」新增</p>}
                </div>
            ) : (
                (Object.entries(groupedItems) as [string, ChecklistItem[]][]).map(([category, catItems]) => (
                <div key={category} className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-4 py-2 font-bold text-gray-700 text-sm border-b">
                    {category}
                    </div>
                    <div className="divide-y">
                    {catItems.map(item => {
                        const status = answers[item.id] || CheckStatus.OK;
                        return (
                        <div key={item.id} className={`p-4 ${status === CheckStatus.ISSUE ? 'bg-red-50' : 'bg-white'}`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-800">{item.content}</p>
                                </div>
                                
                                <div className="flex gap-2">
                                {Object.values(CheckStatus).map(s => (
                                    <button
                                    key={s}
                                    onClick={() => handleStatusChange(item.id, s)}
                                    className={`px-3 py-1.5 rounded text-xs font-bold border transition-colors ${
                                        status === s 
                                        ? s === CheckStatus.OK ? 'bg-green-600 text-white border-green-600'
                                        : s === CheckStatus.ISSUE ? 'bg-red-600 text-white border-red-600'
                                        : 'bg-gray-600 text-white border-gray-600'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                                </div>
                            </div>
                            
                            {/* Note input if Issue or just optional */}
                            <div className="mt-2">
                                <input 
                                type="text" 
                                placeholder={status === CheckStatus.ISSUE ? "異常狀況說明 (必填)" : "備註說明 (選填)"}
                                value={notes[item.id] || ''}
                                onChange={(e) => handleNoteChange(item.id, e.target.value)}
                                className={`w-full text-sm p-2 border rounded outline-none focus:ring-1 ${
                                    status === CheckStatus.ISSUE 
                                    ? 'border-red-300 focus:ring-red-500 bg-white placeholder-red-300' 
                                    : 'border-gray-200 focus:ring-blue-500 bg-gray-50'
                                }`}
                                />
                            </div>
                        </div>
                        );
                    })}
                    </div>
                </div>
                ))
            )}
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            取消
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center shadow-sm"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isSubmitting ? '提交中...' : '確認提交'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChecklistSubmissionModal;