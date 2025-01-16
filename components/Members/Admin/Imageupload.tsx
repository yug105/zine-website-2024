import React, { useState, useCallback } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';

interface ImageUploadBlockProps {
  block: {
    id: string;
    type: 'image';
    content: string;
    order: number;
  };
  index: number;
  updateBlock: (index: number, updates: Partial<Block>) => void;
  removeBlock: (index: number) => void;
}

const ImageUploadBlock: React.FC<ImageUploadBlockProps> = ({
  block,
  index,
  updateBlock,
  removeBlock
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleBlockChange = useCallback((index: number, content: string) => {
    updateBlock(index, { content });
  }, [updateBlock]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', 'Blog image upload');
    
    const response = await fetch('https://zine-backend.ip-ddns.com/file/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'stage': 'prod'
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    
    const data = await response.json();
    return data;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File size must be less than 5MB');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError('');
      
      const response = await uploadFile(file);
      handleBlockChange(index, response.url);
    } catch (error) {
      setUploadError('Failed to upload image. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (block.content) {
      try {
        const publicKey = block.content.split('/').pop() || '';
        const response = await fetch(`https://zine-backend.ip-ddns.com/file/delete?publicKey=${publicKey}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'stage': 'prod'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete image');
        }
        
        handleBlockChange(index, '');
      } catch (error) {
        console.error('Error deleting file:', error);
        // Optionally show an error toast here
      }
    }

    // Remove the block if requested
    removeBlock(index);
  };

  return (
    <div className="w-full space-y-4">
      {!block.content && (
        <div className="relative">
          <input
            type="file"
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            id={`image-upload-${block.id}`}
          />
          <label
            htmlFor={`image-upload-${block.id}`}
            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer
              ${isUploading ? 'bg-gray-50 border-gray-300' : 'hover:bg-gray-50 border-gray-300 hover:border-gray-400'}
              ${uploadError ? 'border-red-300' : ''}`}
          >
            {isUploading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                <span className="text-sm text-gray-500">Uploading...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="mt-2 text-sm text-gray-500">Click to upload an image</span>
                <span className="mt-1 text-xs text-gray-400">Maximum size: 5MB</span>
              </div>
            )}
          </label>
          {uploadError && (
            <p className="mt-2 text-sm text-red-500">{uploadError}</p>
          )}
        </div>
      )}

      {block.content && (
        <div className="relative group">
          <img
            src={block.content}
            alt="Uploaded content"
            className="w-full rounded-lg"
          />
          <button
            onClick={handleDelete}
            className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
            type="button"
            aria-label="Delete image"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUploadBlock;