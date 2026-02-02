import React, { useState } from 'react';
import { Meeting } from '../types';
import { FileText, Plus, Download, Calendar, User, Search, Paperclip, X, Loader2 } from 'lucide-react';

interface MeetingRecordsProps {
  meetings: Meeting[];
  // Updated signature to accept file metadata
  onSave: (meeting: Partial<Meeting>, fileData?: { name: string, type: string, content: string }) => Promise<void>;
}

const MeetingRecords: React.FC<MeetingRecordsProps> = ({ meetings = [], onSave }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingMeeting, setViewingMeeting] = useState<Meeting | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [date, setDate] = useState('');
  const [subject, setSubject] = useState('');
  const [summary, setSummary] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fix: Ensure properties are strings before calling includes
  const filteredMeetings = (meetings || []).filter(m => 
    String(m.subject || "").includes(searchTerm) || String(m.summary || "").includes(searchTerm)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let fileData = undefined;
      
      // 處理檔案
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
             alert("檔案過大，請選擇 10MB 以下的檔案。");
             setIsLoading(false);
             return;
        }
        const base64Content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });

        fileData = {
            name: file.name,
            type: file.type,
            content: base64Content
        };
      }

      await onSave({
        date,
        subject,
        summary,
        // attachmentUrl is not needed here, backend will generate it
      }, fileData);

      setIsCreateModalOpen(false);
      // 重置表單
      setDate('');
      setSubject('');
      setSummary('');
      setFile(null);
    } catch (err) {
      alert("儲存失敗，請檢查網路連線或檔案大小");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Safe truncate function handling null/undefined/numbers
  const truncateText = (text: any, maxLength: number) => {
    const safeText = String(text || '');
    if (safeText.length <= maxLength) return safeText;
    return safeText.substring(0, maxLength) + '...';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 flex items-center">
             <FileText className="w-6 h-6 mr-2 text-blue-600" />
             會議與現勘紀錄
           </h2>
           <p className="text-gray-500 mt-1">管理會議記錄與現場會勘資料</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          新增紀錄
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="搜尋會議主旨或摘要..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredMeetings.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-lg border border-dashed">
            無相關紀錄
          </div>
        ) : (
          filteredMeetings.map((meeting) => (
            <div 
              key={meeting.id} 
              onClick={() => setViewingMeeting(meeting)}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                   <div className="flex items-center text-sm text-gray-500 mb-2">
                      <Calendar className="w-4 h-4 mr-1" />
                      {meeting.date}
                      <span className="mx-2">|</span>
                      <User className="w-4 h-4 mr-1" />
                      {meeting.createdBy}
                   </div>
                   <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
                     {meeting.subject}
                   </h3>
                   <p className="text-gray-500 text-sm break-all line-clamp-2">
                     {truncateText(meeting.summary, 50)}
                   </p>
                </div>
                {meeting.attachmentUrl && (
                  <div className="flex flex-col items-center justify-center pl-2 border-l border-gray-100">
                     <div className="p-2 bg-gray-50 rounded-full text-blue-500" title="包含附件">
                       <Paperclip className="w-5 h-5" />
                     </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg animate-fade-in">
             <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
               <h3 className="font-bold text-gray-800">新增會議/現勘紀錄</h3>
               <button onClick={() => !isLoading && setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
             </div>
             <form onSubmit={handleSubmit} className="p-6 space-y-4">
               <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">日期</label>
                 <input 
                   type="date" required value={date} 
                   onChange={e => setDate(e.target.value)}
                   className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                 />
               </div>
               <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">主旨</label>
                 <input 
                   type="text" required value={subject} 
                   onChange={e => setSubject(e.target.value)}
                   className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                   placeholder="例：113年第一季履約會議"
                 />
               </div>
               <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">摘要內容</label>
                 <textarea 
                   required rows={4} value={summary} 
                   onChange={e => setSummary(e.target.value)}
                   className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                   placeholder="重點摘要..."
                 />
               </div>
               <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">附件上傳 (選填)</label>
                 <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Paperclip className={`w-8 h-8 mb-2 ${file ? 'text-blue-500' : 'text-gray-400'}`} />
                        <p className="text-sm text-gray-500 font-medium">{file ? file.name : '點擊選取檔案'}</p>
                        <p className="text-xs text-gray-400 mt-1">PDF, Word, 或圖片 (Max 10MB)</p>
                    </div>
                    <input 
                       type="file" 
                       className="hidden" 
                       accept="image/*,.pdf,.doc,.docx"
                       onChange={(e) => setFile(e.target.files?.[0] || null)} 
                    />
                 </label>
               </div>
               <div className="pt-4 flex justify-end space-x-2">
                 <button type="button" disabled={isLoading} onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded text-gray-700">取消</button>
                 <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center">
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {isLoading ? '處理中...' : '確認新增'}
                 </button>
               </div>
             </form>
          </div>
        </div>
      )}

      {viewingMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in">
             <div className="p-5 border-b flex justify-between items-start bg-gray-50 rounded-t-xl">
               <div>
                  <h3 className="text-xl font-bold text-gray-900">{viewingMeeting.subject}</h3>
                  <div className="flex items-center text-sm text-gray-500 mt-2">
                      <Calendar className="w-4 h-4 mr-1" /> {viewingMeeting.date}
                      <span className="mx-3 text-gray-300">|</span>
                      <User className="w-4 h-4 mr-1" /> {viewingMeeting.createdBy}
                  </div>
               </div>
               <button onClick={() => setViewingMeeting(null)} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X className="w-6 h-6 text-gray-500" /></button>
             </div>
             <div className="p-6 overflow-y-auto flex-1">
               <h4 className="text-sm font-bold text-gray-500 uppercase mb-2">會議/現勘摘要</h4>
               <div className="text-gray-800 whitespace-pre-wrap break-words leading-relaxed text-base bg-gray-50 p-4 rounded-lg border border-gray-100">
                 {viewingMeeting.summary}
               </div>
             </div>
             <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-between items-center">
               <div>
                  {viewingMeeting.attachmentUrl ? (
                    <a 
                      href={viewingMeeting.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium text-sm"
                    >
                      <Download className="w-4 h-4 mr-2" /> 下載佐證附件
                    </a>
                  ) : (
                    <span className="text-sm text-gray-400 flex items-center">
                      <Paperclip className="w-4 h-4 mr-2" /> 無附件資料
                    </span>
                  )}
               </div>
               <button onClick={() => setViewingMeeting(null)} className="px-5 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium">關閉</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingRecords;