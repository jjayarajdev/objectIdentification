import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image, FolderOpen } from 'lucide-react';

const ImageUpload = ({ onUpload, multiple = false }) => {
  const onDrop = useCallback((acceptedFiles) => {
    onUpload(acceptedFiles);
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    multiple
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        transition-colors duration-200
        ${isDragActive
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }
      `}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center space-y-4">
        {isDragActive ? (
          <>
            <Upload className="w-12 h-12 text-blue-500" />
            <p className="text-lg font-medium text-blue-600">
              Drop the images here...
            </p>
          </>
        ) : (
          <>
            <div className="flex space-x-4">
              <Image className="w-12 h-12 text-gray-400" />
              {multiple && <FolderOpen className="w-12 h-12 text-gray-400" />}
            </div>
            <div>
              <p className="text-lg font-medium text-gray-700">
                {multiple
                  ? 'Drag & drop images or folders here'
                  : 'Drag & drop an image here'
                }
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or click to browse
              </p>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Supported formats: JPG, JPEG, PNG, WebP (Max 20MB per image)
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;