import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Plus, Image as ImageIcon, GripVertical, Type, Heading, X, Eye, Edit2 } from 'lucide-react';
import { Code, Quote, List, ListOrdered } from 'lucide-react';
import axios from 'axios';
import ProtectedRoute from "./ProtectedRoute";
import { ToastContainer, toast } from "react-toastify";
import SideNav from "../sidenav";

// Types
export type BlockType = 'text' | 'image' | 'header' | 'code' | 'quote' | 'list';
export type ListType = 'bullet' | 'number';

interface BlockOptions {
  language?: string;
  listType?: ListType;
}

interface Block {
  id: string;
  type: BlockType;
  content: string;
  order: number;
  language?: string;
  listType?: ListType;
}

interface BlogFormData {
  blogID: number | null;
  blogName: string;
  blogDescription: string;
  content: string;
  dpURL: string;
  imagePath?: string;
  parentBlog: number | null;
}

// API Configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://zine-backend.ip-ddns.com',
  headers: {
    'Content-Type': 'application/json',
    'stage': process.env.NEXT_PUBLIC_API_STAGE || 'prod'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Utility Functions
const generateId = () => crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Component for selecting programming language in code blocks
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

// Block Menu Component
const BlockMenu: React.FC<{
  onSelect: (type: BlockType, options?: BlockOptions) => void;
  onClose: () => void;
}> = ({ onSelect, onClose }) => {
  const menuItems = [
    { type: 'text', icon: Type, label: 'Text Block' },
    { type: 'header', icon: Heading, label: 'Header' },
    { type: 'code', icon: Code, label: 'Code Block' },
    { type: 'quote', icon: Quote, label: 'Quote' },
    { type: 'list', icon: List, label: 'Bullet List', options: { listType: 'bullet' } },
    { type: 'list', icon: ListOrdered, label: 'Numbered List', options: { listType: 'number' } },
    { type: 'image', icon: ImageIcon, label: 'Image URL' }
  ];

  return (
    <div className="absolute z-50 left-6 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
      <div className="py-1" role="menu">
        {menuItems.map(({ type, icon: Icon, label, options }) => (
          <button
            key={`${type}-${label}`}
            onClick={() => {
              onSelect(type as BlockType, options);
              onClose();
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <Icon className="w-4 h-4 mr-2" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

// Block Component
const BlockComponent: React.FC<{
  block: Block;
  onChange: (content: string, language?: string) => void;
  onDelete: () => void;
}> = ({ block, onChange, onDelete }) => {
  if (!block?.type) return null;

  const blockComponents = {
    text: () => (
      <textarea
        value={block.content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your content here..."
        className="w-full min-h-[100px] p-2 border-none outline-none resize-none focus:ring-2 focus:ring-blue-500"
      />
    ),
    header: () => (
      <input
        type="text"
        value={block.content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter heading..."
        className="w-full text-2xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500"
      />
    ),
    code: () => (
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
        />
      </div>
    ),
    quote: () => (
      <div className="relative w-full border-l-4 border-gray-300 pl-4">
        <textarea
          value={block.content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter a quote..."
          className="w-full min-h-[100px] p-2 italic text-gray-600 border-none outline-none resize-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    ),
    list: () => (
      <textarea
        value={block.content}
        onChange={(e) => onChange(e.target.value)}
        placeholder={block.listType === 'bullet' ? '• Enter list items (one per line)' : '1. Enter list items (one per line)'}
        className="w-full min-h-[100px] p-2 border-none outline-none resize-none focus:ring-2 focus:ring-blue-500"
      />
    ),
    image: () => (
      <input
        type="text"
        value={block.content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter image URL..."
        className="w-full p-2 border-none outline-none focus:ring-2 focus:ring-blue-500"
      />
    )
  };

  const Component = blockComponents[block.type];
  return Component ? <Component /> : null;
};

// Main UpdateBlog Component
const UpdateBlog: React.FC = () => {
  const router = useRouter();
  const { parentId, blogId } = router.query;

  const [formData, setFormData] = useState<BlogFormData>({
    blogID: null,
    blogName: '',
    blogDescription: '',
    content: '',
    dpURL: '',
    parentBlog: null,
    imagePath: ''
  });

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedBlock, setDraggedBlock] = useState<number | null>(null);
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [addBlockIndex, setAddBlockIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    const fetchBlogData = async () => {
      if (!blogId) return;

      try {
        const queryId = parentId ? Number(parentId) : -1;
        const response = await api.get('/blog', { params: { id: queryId } });
        
        const targetBlog = response.data.blogs.find(
          (blog: any) => blog.blogID === Number(blogId)
        );

        if (targetBlog) {
          let parsedContent: Block[] = [];
          try {
            parsedContent = JSON.parse(targetBlog.content);
          } catch {
            parsedContent = [{
              id: generateId(),
              type: 'text',
              content: '',
              order: 0
            }];
          }

          const formattedBlocks = parsedContent.map((block, index) => ({
            id: block.id || generateId(),
            type: block.type || 'text',
            content: block.content || '',
            order: index,
            language: block.language,
            listType: block.listType
          }));

          setBlocks(formattedBlocks);
          setFormData({
            blogID: Number(blogId),
            blogName: targetBlog.blogName,
            blogDescription: targetBlog.blogDescription,
            content: JSON.stringify(formattedBlocks),
            dpURL: targetBlog.dpURL,
            parentBlog: parentId ? Number(parentId) : null,
            imagePath: targetBlog.imagePath || ""
          });
        }
      } catch (error) {
        console.error('Error fetching blog:', error);
        toast.error('Failed to fetch blog data');
      }
    };

    fetchBlogData();
  }, [blogId, parentId]);

  const handleBlockChange = useCallback((index: number, content: string, language?: string) => {
    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks];
      newBlocks[index] = {
        ...newBlocks[index],
        content,
        ...(language && { language })
      };
      return newBlocks;
    });
  }, []);

  const addBlock = useCallback((type: BlockType, index: number, options?: BlockOptions) => {
    setBlocks(prevBlocks => {
      const newBlock: Block = {
        id: generateId(),
        type,
        content: '',
        order: index + 1,
        ...(type === 'code' && { language: options?.language || 'javascript' }),
        ...(type === 'list' && { listType: options?.listType || 'bullet' })
      };

      return [
        ...prevBlocks.slice(0, index + 1),
        newBlock,
        ...prevBlocks.slice(index + 1)
      ].map((block, idx) => ({ ...block, order: idx }));
    });
  }, []);

  const removeBlock = useCallback((index: number) => {
    setBlocks(prevBlocks => {
      if (prevBlocks.length <= 1) {
        return [{
          id: generateId(),
          type: 'text',
          content: '',
          order: 0
        }];
      }
      return prevBlocks
        .filter((_, idx) => idx !== index)
        .map((block, idx) => ({ ...block, order: idx }));
    });
  }, []);

  const reorderBlocks = useCallback((startIndex: number, endIndex: number) => {
    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks];
      const [movedBlock] = newBlocks.splice(startIndex, 1);
      newBlocks.splice(endIndex, 0, movedBlock);
      return newBlocks.map((block, idx) => ({ ...block, order: idx }));
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const updatePayload = {
        ...formData,
        content: JSON.stringify(blocks)
      };

      const response = await api.put(`/blog/${blogId}`, updatePayload);
      if (response.status === 200) {
        toast.success('Blog updated successfully');
        router.push('/admin/blogsadmin');
      }
    } catch (error: any) {
      console.error('Update error:', error);
      setError(error.response?.data?.message || 'Failed to update blog');
      toast.error(error.response?.data?.message || 'Failed to update blog');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <ToastContainer />
      <div className="grid grid-cols-12 h-screen" style={{ background: "#EFEFEF" }}>
        <div className="col-span-2">
          <SideNav />
        </div>
        <div className="col-span-10 h-screen overflow-y-auto">
          <div className="max-w-6xl w-full mx-auto p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6 mb-8">
              <input
                type="text"
                value={formData.blogName}
                onChange={(e) => setFormData(prev => ({ ...prev, blogName: e.target.value }))}
                placeholder="Enter blog title..."
                className="w-full text-4xl font-bold border-none outline-none mb-8 placeholder-gray-300 bg-transparent"
                required
              />

              <div className="relative w-full mb-8">
                <input
                  type="text"
                  value={formData.dpURL}
                  onChange={(e) => setFormData(prev => ({ ...prev, dpURL: e.target.value }))}
                  placeholder="Enter featured image URL..."
                  className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                rows={3}
                required
              />

              <div className="flex justify-end mb-4">
                <button
                  type="button"
                  onClick={() => setPreviewMode(!previewMode)}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 rounded-lg"
                >
                  {previewMode ? (
                    <>
                      <Edit2 className="w-4 h-4" />
                      Edit Mode
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Preview Mode
                    </>
                  )}
                </button>
              </div>

              {!previewMode ? (
                <div className="space-y-4">
                  {blocks.map((block, index) => (
                    <div
                      key={block.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggedBlock(index);
                        setIsDragging(true);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => {
                        setIsDragging(false);
                        setDraggedBlock(null);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedBlock !== null && draggedBlock !== index) {
                          reorderBlocks(draggedBlock, index);
                        }
                      }}
                      className={`group relative flex items-start gap-2 p-2 rounded-lg bg-white ${
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
                          title="Add block"
                        >
                          <Plus className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeBlock(index)}
                          className="p-1 rounded-full hover:bg-gray-100"
                          title="Remove block"
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

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingBlock(true);
                        setAddBlockIndex(blocks.length - 1);
                      }}
                      className="flex items-center px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add New Block
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {blocks.map((block) => (
                    <div key={block.id} className="prose max-w-none">
                      {block.type === 'header' && <h2>{block.content}</h2>}
                      {block.type === 'text' && <p>{block.content}</p>}
                      {block.type === 'code' && (
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg">
                          <code>{block.content}</code>
                        </pre>
                      )}
                      {block.type === 'quote' && (
                        <blockquote className="border-l-4 border-gray-300 pl-4 italic">
                          {block.content}
                        </blockquote>
                      )}
                      {block.type === 'list' && (
                        block.listType === 'bullet' ? (
                          <ul className="list-disc pl-4">
                            {block.content.split('\n').map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <ol className="list-decimal pl-4">
                            {block.content.split('\n').map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ol>
                        )
                      )}
                      {block.type === 'image' && block.content && (
                        <div className="relative w-full h-64">
                          <Image
                            src={block.content}
                            alt="Block image"
                            layout="fill"
                            objectFit="contain"
                            className="rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

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
                  className={`px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 
                    ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? 'Updating...' : 'Update Blog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default UpdateBlog;