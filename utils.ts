/**
 * 將字串轉換為 SHA-256 Hex 字串
 * 用於前端密碼加密，確保傳送給後端的是雜湊值
 */
export async function sha256(message: string): Promise<string> {
  // 1. 將字串編碼為 Uint8Array
  const msgBuffer = new TextEncoder().encode(message);
  
  // 2. 使用 Web Crypto API 計算雜湊
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  
  // 3. 將 ArrayBuffer 轉換為 Hex 字串
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * 產生指定長度的隨機密碼 (包含大小寫字母與數字)
 * 用於核准用戶時生成預設密碼
 */
export function generateRandomPassword(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}