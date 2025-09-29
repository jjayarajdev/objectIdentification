import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Image Upload
export const uploadSingleImage = async (file, processImmediately = true) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('process_immediately', processImmediately);

  return api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const uploadBatchImages = async (files, processImmediately = true) => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });
  formData.append('process_immediately', processImmediately);

  return api.post('/upload-batch', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// EXIF Metadata
export const getImageExif = async (imageId, fileExtension = '.jpg') => {
  return api.get(`/exif/${imageId}`, {
    params: { file_extension: fileExtension }
  });
};

// Object Detection
export const detectObjects = async (imageId, fileExtension = '.jpg') => {
  return api.post(`/detect/${imageId}`, null, {
    params: { file_extension: fileExtension }
  });
};

// Export
export const exportResults = async (imageId, format = 'json', imageData) => {
  const response = await api.post(`/export/${imageId}?format=${format}`, imageData, {
    responseType: 'blob',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;

  // Set filename based on format
  const extension = format === 'json' ? 'json' :
                   format === 'yolo' ? 'txt' :
                   format === 'coco' ? 'json' :
                   format === 'csv' ? 'csv' : 'txt';

  link.setAttribute('download', `${imageId}_detection.${extension}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  return response;
};

export const exportBatchResults = async (batchId, format = 'json') => {
  return api.get(`/export/batch/${batchId}`, {
    params: { format }
  });
};

export default api;