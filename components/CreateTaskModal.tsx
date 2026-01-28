import React, { useState } from 'react';
import { StationCode, TaskStatus } from '../types';
import { STATIONS } from '../constants';
import { X, Globe, AlertCircle } from 'lucide-react';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: { 
    itemName: string; 
    deadline: string; 
    stationCodes: StationCode[]; 
    isCommon: boolean;
  }) => void;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [itemName, setItemName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isCommon, setIsCommon] = useState(false);
  const [selectedStations, setSelectedStations] = useState<StationCode[]>([]);

  if (!isOpen) return null;

  const handleStationToggle = (code: StationCode) => {
    if (selectedStations.includes(code)) {
      setSelectedStations(selectedStations.filter(s => s !== code));
    } else {
      setSelectedStations([...selectedStations, code]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let targetStations: StationCode[] = [];
    
    if (isCommon) {
      targetStations = STATIONS.map(s => s.code);
    } else {
      if (selectedStations.length === 0) {
        alert("請至少選擇一個場站");
        return;
      }
      targetStations = selectedStations;
    }

    onSubmit({
      itemName,
      deadline,
      stationCodes: targetStations,
      isCommon
    });
    
    // Reset form
    setItemName('');
    setDeadline('');
    setIsCommon(false);
    setSelectedStations([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-lg">
          <h3 className="text-lg font-bold text-gray-800 flex items-center">
             新增任務 / 發佈工項
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Common Task Toggle */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <div className="flex items-start">
               <div className="flex items-center h-5">
                 <input
                   id="isCommon"
                   type="checkbox"
                   checked={isCommon}
                   onChange={(e) => setIsCommon(e.target.checked)}
                   className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                 />
               </div>
               <div className="ml-3 text-sm">
                 <label htmlFor="isCommon" className="font-bold text-gray-800 flex items-center">
                    <Globe className="w-4 h-4 mr-1 text-blue-600"/>
                    共同工項一鍵分派
                 </label>
                 <p className="text-gray-500 mt-1">
                   勾選後，系統將自動針對「四個停車場」分別生成 4 筆獨立追蹤的任務。
                 </p>
               </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">工項名稱</label>
            <input
              type="text"
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="例如：113年度第二季履約會議"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">截止日期</label>
            <input
              type="date"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Station Selector (Disabled if Common) */}
          <div className={`transition-opacity ${isCommon ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              選擇場站 (個別發佈)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {STATIONS.map((station) => (
                <div 
                  key={station.code}
                  onClick={() => !isCommon && handleStationToggle(station.code)}
                  className={`p-3 border rounded-lg cursor-pointer flex items-center transition-all ${
                    selectedStations.includes(station.code) 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : 'bg-white border-gray-200 text-gray-600 hover:border-blue-400'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border mr-2 flex items-center justify-center ${
                    selectedStations.includes(station.code) ? 'border-white bg-white' : 'border-gray-400'
                  }`}>
                    {selectedStations.includes(station.code) && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                  </div>
                  <span className="text-sm font-medium">{station.name}</span>
                </div>
              ))}
            </div>
             {isCommon && (
                <p className="text-xs text-blue-600 mt-2 flex items-center">
                   <AlertCircle className="w-3 h-3 mr-1"/>
                   已啟用共同分派，將自動選取所有場站。
                </p>
             )}
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium shadow-sm"
            >
              {isCommon ? '確認發佈 (產生4筆)' : `確認發佈 (產生${selectedStations.length}筆)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;