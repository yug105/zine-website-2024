import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Plus, Image as ImageIcon, GripVertical, Type, Heading, X } from 'lucide-react';
import { Code, Quote, List, ListOrdered } from 'lucide-react';
import { BlogFormatter } from './Blogformat';
import axios from 'axios';

// Updated Types and Interfaces
interface Block {
  id: string;
  type: 'text' | 'image' | 'header' | 'code' | 'quote' | 'list';
  content: string;
  order: number;
  language?: string;
  listType?: 'bullet' | 'number';
}

interface BlogFormData {
  blogID?: number;
  blogName: string;
  blogDescription: string;
  content: string;  // Changed from Block[] to string
  dpURL: string;
  imagePath?: string;
  parentBlog: number | null;
  createdAt?: {
    seconds: number;
    nanos: number;
  };
}

interface IBlogData {
  title?: string;
  description?: string;
  content?: Block[];
  existingBlogId?: string;
  url?: string;
  parentBlogId?: number | null;
}

const api = axios.create({
  baseURL: 'https://zine-backend.ip-ddns.com',
  headers: {
    'Content-Type': 'application/json',
    'stage': 'test'
  }
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Custom Hooks
const useBlockManager = (initialBlocks: Block[] = []) => {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);

  const addBlock = useCallback((type: Block['type'], index: number, options?: Partial<Block>) => {
    const newBlock = {
      id: generateId(),
      type,
      content: '',
      order: index + 1,
      ...options
    };

    setBlocks(prevBlocks => {
      const updatedBlocks = [
        ...prevBlocks.slice(0, index + 1),
        newBlock,
        ...prevBlocks.slice(index + 1)
      ];
      return updatedBlocks.map((block, i) => ({ ...block, order: i }));
    });
  }, []);

  const updateBlock = useCallback((index: number, updates: Partial<Block>) => {
    setBlocks(prevBlocks =>
      prevBlocks.map((block, i) =>
        i === index ? { ...block, ...updates } : block
      )
    );
  }, []);

  const removeBlock = useCallback((index: number) => {
    setBlocks(prevBlocks => {
      if (prevBlocks.length === 1) {
        return prevBlocks;
      }
      const newBlocks = prevBlocks.filter((_, i) => i !== index);
      return newBlocks.map((block, i) => ({ ...block, order: i }));
    });
  }, []);

  const reorderBlocks = useCallback((startIndex: number, endIndex: number) => {
    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks];
      const [removed] = newBlocks.splice(startIndex, 1);
      newBlocks.splice(endIndex, 0, removed);
      return newBlocks.map((block, i) => ({ ...block, order: i }));
    });
  }, []);

  return {
    blocks,
    addBlock,
    updateBlock,
    removeBlock,
    reorderBlocks,
    setBlocks
  };
};


const BlockMenu: React.FC<{
  onSelect: (type: Block['type'], options?: Partial<Block>) => void;
  onClose: () => void;
}> = ({ onSelect, onClose }) => {
  return (
    <div className="absolute z-50 left-6 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
      <div className="py-1" role="menu">
        <button
          onClick={() => {
            onSelect('text');
            onClose();
          }}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <Type className="w-4 h-4 mr-2" />
          Text Block
        </button>
        <button
          onClick={() => {
            onSelect('header');
            onClose();
          }}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <Heading className="w-4 h-4 mr-2" />
          Header
        </button>
        <button
          onClick={() => {
            onSelect('code');
            onClose();
          }}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <Code className="w-4 h-4 mr-2" />
          Code Block
        </button>
        <button
          onClick={() => {
            onSelect('quote');
            onClose();
          }}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <Quote className="w-4 h-4 mr-2" />
          Quote
        </button>
        <button
          onClick={() => {
            onSelect('list', { listType: 'bullet' });
            onClose();
          }}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <List className="w-4 h-4 mr-2" />
          Bullet List
        </button>
        <button
          onClick={() => {
            onSelect('list', { listType: 'number' });
            onClose();
          }}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <ListOrdered className="w-4 h-4 mr-2" />
          Numbered List
        </button>
        <button
          onClick={() => {
            onSelect('image');
            onClose();
          }}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          <ImageIcon className="w-4 h-4 mr-2" />
          Image URL
        </button>
      </div>
    </div>
  );
};

const LanguageSelector: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  const languages = ['javascript', 'python', 'typescript', 'html', 'css', 'java', 'c++', 'ruby', 'php'];
  
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="absolute top-2 right-2 px-2 py-1 text-sm bg-gray-100 rounded border border-gray-300"
    >
      {languages.map(lang => (
        <option key={lang} value={lang}>{lang}</option>
      ))}
    </select>
  );
};

const BlockComponent: React.FC<{
  block: Block;
  onChange: (content: string, language?: string) => void;
  onDelete: () => void;
}> = ({ block, onChange, onDelete }) => {
  switch (block.type) {
    case 'text':
      return (
        <textarea
          value={block.content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your content here..."
          className="w-full min-h-[100px] p-2 border-none outline-none resize-none focus:ring-2 focus:ring-blue-500"
        />
      );

    case 'header':
      return (
        <input
          type="text"
          value={block.content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter heading..."
          className="w-full text-2xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500"
        />
      );

    case 'code':
      return (
        <div className="relative w-full">
          <LanguageSelector
            value={block.language || 'javascript'}
            onChange={(language) => onChange(block.content, language)}
          />
          <textarea
            value={block.content}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter your ${block.language || 'javascript'} code here...`}
            className="w-full min-h-[200px] p-4 font-mono text-sm bg-gray-900 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500"
            style={{ tabSize: 2 }}
          />
        </div>
      );

    case 'image':
      return (
        <div className="relative w-full">
          <input
            type="text"
            value={block.content}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter image URL..."
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          {block.content && (
            <div className="mt-2 relative w-full h-64">
              <Image
                src={block.content}
                alt="Content image preview"
                layout="fill"
                objectFit="contain"
                className="rounded-lg"
              />
            </div>
          )}
        </div>
      );

    case 'quote':
      return (
        <div className="relative w-full border-l-4 border-gray-300 pl-4">
          <textarea
            value={block.content}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter a quote..."
            className="w-full min-h-[100px] p-2 italic text-gray-600 border-none outline-none resize-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      );

    case 'list':
      return (
        <div className="relative w-full">
          <textarea
            value={block.content}
            onChange={(e) => onChange(e.target.value)}
            placeholder={block.listType === 'bullet' ? '• Enter list items (one per line)' : '1. Enter list items (one per line)'}
            className="w-full min-h-[100px] p-2 border-none outline-none resize-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      );

    default:
      return null;
  }
};

const CreateNewBlog: React.FC<IBlogData> = ({
  title = '',
  description = '',
  content = [],
  existingBlogId = '',
  url = '',
  parentBlogId = null
}) => {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [draggedBlock, setDraggedBlock] = useState<number | null>(null);
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [addBlockIndex, setAddBlockIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<BlogFormData>({
    blogName: title,
    blogDescription: description,
    content: '',
    dpURL: url,
    parentBlog: parentBlogId,
    imagePath: ""
  });

  const {
    blocks,
    addBlock,
    updateBlock,
    removeBlock,
    reorderBlocks
  } = useBlockManager(content.length ? content : [{
    id: generateId(),
    type: 'text',
    content: '',
    order: 0
  }]);

  useEffect(() => {
    const formatter = new BlogFormatter();
    const formattedContent = formatter.formatContent(blocks);
    const contentString = JSON.stringify(formattedContent);
    
    setFormData(prev => ({
      ...prev,
      content: contentString
    }));
  }, [blocks]);

  const handleDragStart = (event: React.DragEvent, index: number) => {
    setDraggedBlock(index);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedBlock(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedBlock === null) return;
    reorderBlocks(draggedBlock, targetIndex);
    setIsDragging(false);
    setDraggedBlock(null);
  };

  const saveBlog = async (blogData: BlogFormData) => {
    try {
      const response = await api.post('/blog', blogData);
      return { success: true, data: response.data };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to save blog');
    }
  };

  const updateBlog = async (blogId: string, blogData: BlogFormData) => {
    try {
      const response = await api.put(`/blog/${blogId}`, blogData);
      return { success: true, data: response.data };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update blog');
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.blogName.trim()) {
      setError('Blog title is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const now = new Date();
      const seconds = Math.floor(now.getTime() / 1000);
      const nanos = (now.getTime() % 1000) * 1000000;

      const blogData = {
        ...formData,
        createdAt: { seconds, nanos }
      };

      if (existingBlogId) {
        await updateBlog(existingBlogId, blogData);
      } else {
        await saveBlog(blogData);
      }

      router.push('/admin/blogsdisplay');
    } catch (error: any) {
      console.error('Error saving blog:', error);
      setError(error.message || 'Failed to save blog. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleBlockChange = useCallback((index: number, content: string, language?: string) => {
    updateBlock(index, language ? { content, language } : { content });
  }, [updateBlock]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <input
          type="text"
          value={formData.blogName}
          onChange={(e) => setFormData(prev => ({ ...prev, blogName: e.target.value }))}
          placeholder="Enter blog title..."
          className="w-full text-4xl font-bold border-none outline-none mb-8 placeholder-gray-300"
          required
        />

        <div className="relative w-full mb-8">
          <input
            type="text"
            value={formData.dpURL}
            onChange={(e) => setFormData(prev => ({ ...prev, dpURL: e.target.value }))}
            placeholder="Enter featured image URL..."
            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {formData.dpURL && (
            <div className="mt-4 relative w-full h-64">
              <Image
                src={formData.dpURL}
                alt="Featured image preview"
                layout="fill"
                objectFit="contain"
                className="rounded-lg"
              />
            </div>
          )}
        </div>

        <textarea
          value={formData.blogDescription}
          onChange={(e) => setFormData(prev => ({ ...prev, blogDescription: e.target.value }))}
          placeholder="Enter blog description..."
          className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          required
        />

        <div className="space-y-4">
          {blocks.map((block, index) => (
            <div
              key={block.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, index)}
              onDragOver={handleDragOver}
              className={`group relative flex items-start gap-2 p-2 rounded-lg ${
                isDragging ? 'border-2 border-dashed border-gray-300' : ''
              }`}
            >
              <div className="opacity-0 group-hover:opacity-100 cursor-move">
                <GripVertical className="w-6 h-6 text-gray-400" />
              </div>

              <div className="flex-grow">
                <BlockComponent
                  block={block}
                  onChange={(content, language) => handleBlockChange(index, content, language)}
                  onDelete={() => removeBlock(index)}
                />
              </div>

              <div className="opacity-0 group-hover:opacity-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingBlock(true);
                    setAddBlockIndex(index);
                  }}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <Plus className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  type="button"
                  onClick={() => removeBlock(index)}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {isAddingBlock && addBlockIndex === index && (
                <BlockMenu 
                  onSelect={(type, options) => {
                    addBlock(type, index, options);
                    setIsAddingBlock(false);
                    setAddBlockIndex(null);
                  }}
                  onClose={() => {
                    setIsAddingBlock(false);
                    setAddBlockIndex(null);
                  }}
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              setIsAddingBlock(true);
              setAddBlockIndex(blocks.length - 1);
            }}
            className="flex items-center px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Block
          </button>
        </div>

        <div className="flex justify-between items-center mt-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
              ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? 'Saving...' : 'Save Blog'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateNewBlog;