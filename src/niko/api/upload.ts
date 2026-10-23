import { request } from '../request';

export interface UploadResult {
  url: string;
  path: string;
}

/** 上传文件（封面等）。uploadType=8 为直播封面 */
export function uploadFile(file: File, uploadType = '8'): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('uploadType', uploadType);
  return request.post('/api/upload/uploadFile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }) as unknown as Promise<UploadResult>;
}
