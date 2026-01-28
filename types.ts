export enum TaskStatus {
  PENDING = '待處理',
  IN_PROGRESS = '執行中',
  COMPLETED = '已完成',
  OVERDUE = '逾期',
}

export enum StationCode {
  BAIFU = 'BAIFU',       // 百福立體停車場
  CHENG = 'CHENG',       // 成功立體停車場
  XINYI = 'XINYI',       // 信義國小地下停車場
  SHELIAO = 'SHELIAO',   // 社寮橋平面停車場
}

export interface Station {
  code: StationCode;
  name: string;
}

export interface Task {
  uid: string;
  stationCode: StationCode;
  stationName: string; 
  itemCode: string; 
  itemName: string;
  deadline: string; 
  status: TaskStatus;
  executorEmail: string;
  lastUpdated: string; 
  attachmentUrl?: string;
}

export enum UserRole {
  ADMIN = '管理員',
  MANAGER = '經理',
  USER = '一般人員',
  PENDING = '待審核', 
}

export interface User {
  name: string;
  email: string;
  password?: string;        // 存儲雜湊後的密碼
  organization?: string;    // 任職單位/所屬公司
  role: UserRole;
  assignedStation: StationCode | 'ALL';
  isActive: boolean;
  forceChangePassword?: boolean; // 是否需要強制修改密碼
}

export enum LogAction {
  LOGIN = '登入',
  REGISTER = '註冊申請',
  APPROVE_USER = '核准用戶',
  CREATE_TASK = '新增工項',
  UPDATE_STATUS = '變更狀態',
  DELETE_TASK = '刪除項目',
  UPLOAD_FILE = '上傳檔案',
  RESET_PASSWORD = '重設密碼請求',
  CHANGE_PASSWORD = '修改密碼', 
  ADD_MEETING = '新增會議紀錄',
  ADD_CONTACT = '新增通訊錄',
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userEmail: string;
  action: LogAction;
  taskUid?: string;
  details: string;
}

export interface TaskStats {
  stationName: string;
  total: number;
  completed: number;
  rate: number;
  overdue: number;
}

export interface Meeting {
  id: string;
  date: string;
  subject: string;
  summary: string;
  attachmentUrl?: string; // Could be a real URL or base64 data URI for small files
  createdBy: string;
}

export interface Contact {
  id: string;
  organization: string;
  project: string;
  name: string;
  phone: string;
  email: string;
  station: string;
  note: string;
}

declare global {
  interface Window {
    google?: {
      script: {
        run: {
          withSuccessHandler: (callback: (data: any) => any) => any;
          withFailureHandler: (callback: (error: any) => any) => any;
          [key: string]: any;
        };
      };
    };
  }
}