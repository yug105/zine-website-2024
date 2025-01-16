import React, { useState, useEffect, useCallback,useRef } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Plus, Image as ImageIcon, GripVertical, Type, Heading, X ,Eye,Edit2} from 'lucide-react';
import { Code, Quote, List, ListOrdered } from 'lucide-react';
import { BlogFormatter } from './Blogformat';
import axios from 'axios';
import ImageUploadBlock from './Imageupload';
import ProtectedRoute from "./ProtectedRoute";
import apiimg from '../../../api/axios';
import { uploadFile,deleteFile } from '../../../apis/room';
import { ToastContainer, toast } from "react-toastify";
import SideNav from "../sidenav";
import { set } from 'mongoose';
export type BlockType = 'text' | 'image' | 'header' | 'code' | 'quote' | 'list';
export type ListType = 'bullet' | 'number';
export interface BlockOptions {
  language?: string;
  listType?: ListType;
  content?: string;
}
interface FileState {
  file?: File;
  description?: string;
  publicId?: string;
  content?: string;
  url?: string;
  status?: 'idle' | 'uploading' | 'uploaded' | 'failed';
}

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



const ContentRenderer = ({ content, className = "" }) => {
  const renderBlock = (block) => {
    try {
      switch (block.type) {
        case 'text':
          return (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(block.content)
              }}
            />
          );

        case 'header':
          return (
            <h2
              className="text-2xl font-bold mt-6 mb-4"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(block.content)
              }}
            />
          );

        case 'quote':
          return (
            <blockquote
              className="border-l-4 border-gray-300 pl-4 italic my-4"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(block.content)
              }}
            />
          );

        case 'code':
          return (
            <div className="relative">
              {block.language && (
                <div className="absolute top-2 right-2 px-2 py-1 text-sm bg-gray-800 text-gray-300 rounded">
                  {block.language}
                </div>
              )}
              <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
                <code className="font-mono text-sm whitespace-pre-wrap break-words">
                  {block.content}
                </code>
              </pre>
            </div>
          );

        case 'list':
          const listItems = block.content.split('\n').filter(item => item.trim());
          const ListComponent = block.listType === 'bullet' ? 'ul' : 'ol';
          return (
            <ListComponent
              className={`ml-6 space-y-2 ${
                block.listType === 'bullet' ? 'list-disc' : 'list-decimal'
              }`}
            >
              {listItems.map((item, index) => (
                <li
                  key={index}
                  className="text-gray-700"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(item)
                  }}
                />
              ))}
            </ListComponent>
          );

          case 'image':
      return (
        <div className="relative w-full space-y-4">
          <div className="flex items-center space-x-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
              className="cursor-pointer px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {isUploading && <span>Uploading...</span>}
          </div>

          {previewUrl && (
            <div className="relative w-full h-64">
              <Image
                src={previewUrl}
                alt="Content image"
                layout="fill"
                objectFit="contain"
                className="rounded-lg"
              />
            </div>
          )}
        </div>
      );

        default:
          return null;
      }
    } catch (error) {
      console.error('Error rendering block:', error);
      return null;
    }
  };

  try {
    let blocks;
    if (typeof content === 'string') {
      blocks = JSON.parse(content);
    } else if (Array.isArray(content)) {
      blocks = content;
    } else {
      throw new Error('Invalid content format');
    }

    return (
      <div className={`space-y-6 ${className}`}>
        {blocks.map((block, index) => (
          <div key={block.id || index}>{renderBlock(block)}</div>
        ))}
      </div>
    );
  } catch (error) {
    console.error('Error parsing content:', error);
    return (
      <div className={className}>
        <div className="prose max-w-none">{String(content)}</div>
      </div>
    );
  }
};

const api = axios.create({
  baseURL: 'https://zine-backend.ip-ddns.com',
  headers: {
    'Content-Type': 'application/json',
    'stage': 'prod'
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
  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (initialBlocks.length === 0) {
      return [{
        id: generateId(),
        type: 'text',
        content: '',
        order: 0
      }];
    }
    return initialBlocks.map((block, index) => ({
      ...block,
      order: index,
      id: block.id || generateId()
    }));
  });

  const addBlock = useCallback((
    type: Block['type'],
    index: number,
    options?: { language?: string; listType?: 'bullet' | 'number' }
  ) => {
    // console.log('Adding block:', { type, index, options }); // Debug log

    setBlocks(prevBlocks => {
      const newBlock: Block = {
        id: generateId(),
        type,
        content: '',
        order: index + 1,
        ...(type === 'code' && { language: options?.language || 'javascript' }),
        ...(type === 'list' && { listType: options?.listType || 'bullet' })
      };

      const newBlocks = [
        ...prevBlocks.slice(0, index + 1),
        newBlock,
        ...prevBlocks.slice(index + 1)
      ].map((block, idx) => ({
        ...block,
        order: idx
      }));

      // console.log('New blocks array:', newBlocks); // Debug log
      return newBlocks;
    });
  }, []);

  const updateBlock = useCallback((index: number, updates: Partial<Block>) => {
    setBlocks(prevBlocks => {
      const updatedBlocks = prevBlocks.map((block, idx) => {
        if (idx !== index) return block;
        return { ...block, ...updates };
      });
      return updatedBlocks;
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
        .map((block, idx) => ({
          ...block,
          order: idx
        }));
    });
  }, []);

  const reorderBlocks = useCallback((startIndex: number, endIndex: number) => {
    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks];
      const [movedBlock] = newBlocks.splice(startIndex, 1);
      newBlocks.splice(endIndex, 0, movedBlock);
      return newBlocks.map((block, idx) => ({
        ...block,
        order: idx
      }));
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
  onChange: (content: string, imageUrl?: string) => void;
  onDelete: () => void;
  blogName: string;
  imageCount: number;
}> = ({ block, onChange, onDelete, blogName, imageCount }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(block.imageUrl || '');

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    try {
      // Create unique description for each content image
      const imageDescription = `contentimg:${blogName}_${imageCount}`;
      const response = await uploadFile(file, imageDescription);
      
      if (response.url) {
        setPreviewUrl(response.url);
        onChange(response.url); // Update block content with image URL
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };
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
          <div className="relative w-full space-y-4">
            <div className="flex items-center space-x-4">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
                className="cursor-pointer px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {isUploading && <span>Uploading...</span>}
            </div>
  
            {previewUrl && (
              <div className="relative w-full h-64">
                <Image
                  src={previewUrl}
                  alt="Content image"
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
  parentBlog = null
}) => {
  const router = useRouter();
  const { parentId, blogId , edit} = router.query;
  
  const [isDragging, setIsDragging] = useState(false);
  const [draggedBlock, setDraggedBlock] = useState<number | null>(null);
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [addBlockIndex, setAddBlockIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [fileState, setFileState] = useState<FileState | null>(null);
  const [imageCounter, setImageCounter] = useState(0);
  const[isUploading, setIsUploading] = useState(false);
  // const[PreviewUrl,setPreviewUrl]= useState('')
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileState({
        file: file,
        description: formData.blogName,
        status: 'idle',
      });
    }
  };
  const handleFileContent = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileState({
        file: file,
        content: "contentimg:"+formData.blogName,
        status: 'idle',
      });
    }
  };

  const handleDescriptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (fileState) {
      setFileState({
        ...fileState,
        description: event.target.value,
      });
    }
  };

  const handleUpload = async () => {
    if (fileState && fileState.status === 'idle') {
      setIsUploading(true);
      try {
        // console.log(fileState.file, fileState.description);
        let res = null
        if(fileState.file)
          res = await uploadFile(fileState.file, ((fileState.description)?fileState.description:''));
        setFormData(prev => ({ ...prev, dpURL: res.url }));
        // console.log(formData)

        // console.log(res);
        setFileState({
          ...fileState,
          publicId: res.publicId,
          url: res.url,
          status: 'uploaded',
        });
      } catch (error) {
        setFileState({ ...fileState, status: 'failed' });
        alert('Failed to upload file.');
      } finally {
        setIsUploading(false);
      }
    } 
    
    else if (fileState && fileState.status === 'uploaded') {
      alert('No file to upload or already uploaded.');
    }
  };
  const uploadimgcontent= async ()=>{
    if (fileState && fileState.content) {
      setIsUploading(true);
      try {
        let res=null
        if(fileState.content)
          res = await uploadFile(fileState.file, ((fileState.content)?fileState.content:''));
        setFormData(prev => ({ ...prev, imagePath: res.url }));
        // console.log(res);
        setFileState({
          ...fileState,
          publicId: res.publicId,
          url: res.url,
          status: 'uploaded',
        });
      } catch (error) {
        setFileState({ ...fileState, status: 'failed' });
        alert('Failed to upload file.');
      } finally {
        setIsUploading(false);
      }
    }
  }

  const removeFile = async () => {
    if (fileState && fileState.publicId) {
      setIsUploading(true);
      try {
        await deleteFile(fileState.publicId);
        setFileState(null);
      } catch (error) {
        alert('Failed to delete file.');
      } finally {
        setIsUploading(false);
      }
    } else {
      alert('No file to delete.');
    }
  };
  const handledelete = async () => {
    if (fileState?.url){
      try{
        console.log(fileState.url)
        await removeFile();
        setFileState(null);
        setFormData(prev => ({ ...prev, dpURL: '' }));
        console.log(formData)
      } catch (error) {
        alert('Failed to delete file.');
      } finally {
        setIsUploading(false);
      }
      }
    }
  

  const [formData, setFormData] = useState<BlogFormData>({
    blogName: title,
    blogDescription: description,
    content: '',
    dpURL: url,
    parentBlog: parentId ? Number(parentId) : null,
    imagePath: ""
  });
  // const parent = use
  const {
    blocks,
    addBlock,
    updateBlock,
    removeBlock,
    reorderBlocks,
    setBlocks  // Make sure this is included in the useBlockManager return value
  } = useBlockManager(content.length ? content : [{
    id: generateId(),
    type: 'text',
    content: '',
    order: 0
  }]);

  
 
  useEffect(() => {
    const fetchBlogData = async () => {
      if (edit === 'true') {
        try {
          // If parentId is empty, use -1 as the query parameter and search for blogId
          const queryId = parentId ? Number(parentId) : -1;
          const response = await api.get(`/blog`, {
            params: { id: queryId }
          });
          
          let targetBlog;
          if (parentId) {
            // If parentId exists, find blog by blogId in the parent's blogs
            targetBlog = response.data.blogs.find(
              (blog: any) => blog.blogID === Number(blogId)
            );
          } else {
            // If no parentId, find the blog directly by comparing with blogId
            targetBlog = response.data.blogs.find(
              (blog: any) => blog.blogID === Number(blogId)
            );
          }
  
          if (targetBlog) {
            try {
              let parsedContent = [];
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
  
              const formattedBlocks = parsedContent.map((block: any, index: number) => ({
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
                parentBlog: parentId ? Number(parentId) : null, // Set parentBlog to null if no parentId
                imagePath: targetBlog.imagePath || ""
              });
              
              setIsEditMode(true);
            } catch (error) {
              console.error('Error processing blog content:', error);
              toast.error('Error loading blog content');
            }
          }
        } catch (error) {
          console.error('Error fetching blog:', error);
          toast.error('Failed to fetch blog data');
        }
      }
    };
  
    fetchBlogData();
  }, [edit, parentId, blogId]);
  useEffect(() => {
    try {
      // Ensure blocks are properly formatted before stringifying
      const formattedBlocks = blocks.map((block, index) => ({
        id: block.id,
        type: block.type,
        content: block.content,
        order: index,
        language: block.type === 'code' ? block.language : undefined,
        listType: block.type === 'list' ? block.listType : undefined
      }));
  
      const contentString = JSON.stringify(formattedBlocks);
      
      setFormData(prev => ({
        ...prev,
        content: contentString
      }));
    } catch (error) {
      console.error('Error synchronizing blocks:', error);
      toast.error('Error saving content');
    }
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
      const finalBlogData = {
        ...blogData,
        parentBlog: Number(blogData.parentBlog) || null,  // Convert to number or null
      };
      
      console.log('Formatted blog data:', finalBlogData);
      const response = await api.post('/blog', finalBlogData);
      console.log('Save response:', response);
      if (response.status === 200) {
        toast.success('Blog created successfully');
        router.push('/admin/blogsadmin');
      }
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.response?.data?.message || 'Failed to save blog');
      throw error;
    }
  }
  const updateBlog = async (blogData: BlogFormData) => {
    try {
      if (!blogId) {
        throw new Error('Blog ID is required for update');
      }
  
      const updatePayload = {
        blogID: Number(blogId),
        blogName: blogData.blogName,
        blogDescription: blogData.blogDescription,
        content: JSON.stringify(blocks),
        dpURL: blogData.dpURL,
        parentBlog: Number(parentId),  // Maintain parent relationship
        imagePath: blogData.imagePath || ""
      };
  
      // console.log('Update payload:', updatePayload);
  
      const response = await api.put(`/blog/${blogId}`, updatePayload);
      if (response.status === 200) {
        toast.success('Blog updated successfully');
        router.push('/admin/blogsadmin');
      }
      return { success: true, data: response.data };
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update blog');
      throw error;
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
      const blogData = {
        ...formData,
        content: JSON.stringify(blocks),
        parentBlog: Number(parentId)  // Ensure parentId is included
      };
  
      if (isEditMode) {
        await updateBlog({...blogData,blogID: Number(blogId)});
      } else {
        await saveBlog(blogData);
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      setError(error.message || 'Failed to save blog. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleBlockChange = useCallback((index: number, content: string, language?: string) => {
    const block = blocks[index];
    // console.log(block);
    
    if (block.type === 'code' && language) {
      updateBlock(index, { content, language });
    } 
    else if (block.type === 'image') {
      updateBlock(index, { content });
    }
    else if (block.type === 'list' && block.listType) {
      updateBlock(index, { content, listType: block.listType });
    }
    else if (block.type === 'quote') {
      updateBlock(index, { content });
    }
    else if (block.type === 'header') {
      updateBlock(index, { content });
    }
    else {
      updateBlock(index, { content });
    }
  }, [blocks, updateBlock]);
  const handleBlockChangee = useCallback((index: number, content: string, language?: string) => {
    const block = blocks[index];
    
    if (block.type === 'image') {
      // Update formData.imagePath with the new image URL
      setFormData(prev => ({
        ...prev,
        imagePath: content // This is the image URL from the upload
      }));
      updateBlock(index, { content });
      console.log(formData)
      setImageCounter(prev => prev + 1);
    } else if (block.type === 'code' && language) {
      updateBlock(index, { content, language });
    } else {
      updateBlock(index, { content });
    }
  }, [blocks, updateBlock, setFormData]);

  // const handleImageUpload = async (file: File) => {
  //   if (!file) return;
  
  //   setIsUploading(true);
  //   try {
  //     // Create unique description for each content image
  //     const imageDescription = `contentimg:${formData.blogName}_${imageCounter}`;
  //     const response = await uploadFile(file, imageDescription);
  //     console.log(response)
      
  //     if (response.url) {
  //       setPreviewUrl(response.url);
  //       onChange(response.url); // Update block content with image URL
  //     }
  //   } catch (error) {
  //     console.error('Error uploading image:', error);
  //     toast.error('Failed to upload image');
  //   } finally {
  //     setIsUploading(false);
  //   }
  // };


  const togglePreviewMode = () => {
    setPreviewMode(!previewMode);
  };

  
  return (
    <ProtectedRoute>
      <ToastContainer
        position="top-left"
        autoClose={5000}
        hideProgressBar
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <div className="grid grid-cols-12 h-screen bg-gray-200">
        <div className="col-span-2 bg-gray-800">
          <SideNav />
        </div>
        <div className="col-span-10 h-screen overflow-y-auto">
          <div className="max-w-6xl mx-auto p-6">
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
                className="w-full text-4xl font-bold border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />

              <div className="relative w-full mb-8">
                <label className="block text-sm font-medium text-gray-700">
                  Featured Image
                </label>

                <div className="flex items-center space-x-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="cursor-pointer px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <button
                    type="button"
                    onClick={handleUpload}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Upload Image
                  </button>
                  <button 
                  type="button"
                  onClick={handledelete}>
                    Delete Image
                  </button>
                </div>

                {formData.dpURL && (
                  <div className="relative w-full h-96"> {/* Added fixed height to parent */}
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
                  onClick={togglePreviewMode}
                  className="flex items-center gap-2"
                  variant="outline"
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

              {previewMode ? (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h1 className="text-3xl font-bold mb-4">{formData.blogName}</h1>
                  {formData.blogDescription && (
                    <p className="text-gray-600 mb-6">{formData.blogDescription}</p>
                  )}
                  <ContentRenderer content={blocks} />
                </div>
              ) : (
                <div className="space-y-4">
                  {blocks.map((block, index) => (
                    <div
                      key={block.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragOver={handleDragOver}
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
                            onChange={(content, language) => handleBlockChangee(index, content, language)}
                            onDelete={() => removeBlock(index)}
                            blogName={formData.blogName}
                            imageCount={imageCounter}
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
              )}
  
              {!previewMode && (
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
              )}
  
              <div className="flex justify-between items-center mt-8">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <div className="flex gap-4">
                  {isEditMode ? (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 
                        ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isSubmitting ? 'Updating...' : 'Update Blog'}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                        ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isSubmitting ? 'Saving...' : 'Save Blog'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default CreateNewBlog;