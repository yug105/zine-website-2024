import { useState, useCallback, useEffect } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../../../firebase";
import { writeBatch, doc } from "firebase/firestore";
import { useRouter } from "next/router";
import Image from "next/image";
import { Plus, Image as ImageIcon, GripVertical, Type, Heading, X } from 'lucide-react';
import { Code, Quote, List, ListOrdered } from 'lucide-react';
import { BlogFormatter } from "./Blogformat";

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

interface Block {
  id: string;
  type: 'text' | 'image' | 'header' | 'code' | 'quote' | 'list';
  content: string;
  order: number;
  language?: string; // For code blocks
  listType?: 'bullet' | 'number'; // For list blocks
}


interface IBlogData {
  title?: string;
  description?: string;
  content?: any;
  existingBlogId?: string;
  url?: string;
}

const BlockMenu = ({ onSelect, onClose }: { 
  onSelect: (type: Block['type'], options?: any) => void;
  onClose: () => void;
}) => {
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
          Image
        </button>
      </div>
    </div>
  );
};

const LanguageSelector = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
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

const CreateNewBlog = ({ title, description, content, existingBlogId, url }: IBlogData) => {
  const router = useRouter();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedBlock, setDraggedBlock] = useState<number | null>(null);
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [addBlockIndex, setAddBlockIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: title || '',
    description: description || '',
    content: content || [],
    dp: url || '',
    parent_blog: existingBlogId || '',
  });

  // Update formData when blocks change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      content: blocks
    }));
  }, [blocks]);

  // Initialize with default block if empty
  useEffect(() => {
    if (!blocks.length) {
      setBlocks([{
        id: generateId(),
        type: 'text',
        content: '',
        order: 0
      }]);
    }
  }, []);

  // Error handling effect
  useEffect(() => {
    const handleError = (error: Error) => {
      console.error('Blog editor error:', error);
      setError('An error occurred while loading the blog editor. Please refresh the page.');
    };

    window.addEventListener('error', handleError);
    return () => {
      window.removeEventListener('error', handleError);
      setIsSubmitting(false);
    };
  }, []);

  const validateBlogData = (data: any): boolean => {
    if (!data.title?.trim()) {
      throw new Error('Title is required');
    }
    
    if (!data.content?.length) {
      throw new Error('Blog content cannot be empty');
    }
    
    if (!data.description?.trim()) {
      throw new Error('Description is required');
    }
    
    // Validate formatted content
    const hasValidContent = data.content.some(block => 
      block.formattedContent && 
      (typeof block.formattedContent === 'string' ? 
        block.formattedContent.trim().length > 0 : 
        true)
    );
    
    if (!hasValidContent) {
      throw new Error('Blog must contain some formatted content');
    }
    
    return true;
  };

  const handleBlockChange = (index: number, newContent: string) => {
    setBlocks(prevBlocks => 
      prevBlocks.map((block, i) => 
        i === index ? { ...block, content: newContent } : block
      )
    );
  };

  const handleBlockDelete = (index: number) => {
    if (blocks.length === 1) {
      alert('Cannot delete the last block');
      return;
    }
    
    setBlocks(prevBlocks => {
      const newBlocks = prevBlocks.filter((_, i) => i !== index);
      return newBlocks.map((block, i) => ({ ...block, order: i }));
    });
  };

  const handleImageUpload = async (index: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      try {
        const storage = getStorage();
        const storageRef = ref(storage, `blog-images/${file.name}-${Date.now()}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        
        handleBlockChange(index, url);
      } catch (error) {
        console.error('Error uploading image:', error);
        setError('Failed to upload image. Please try again.');
      }
    };
    input.click();
  };

  const handleDragStart = (event: React.DragEvent, index: number) => {
    setDraggedBlock(index);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedBlock(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (draggedBlock === null) return;

    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(draggedBlock, 1);
    newBlocks.splice(targetIndex, 0, movedBlock);
    
    setBlocks(newBlocks.map((block, index) => ({
      ...block,
      order: index
    })));
    setDraggedBlock(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const addNewBlock = (type: Block['type'], options?: any) => {
  const newBlock = {
    id: generateId(),
    type,
    content: '',
    order: addBlockIndex !== null ? addBlockIndex + 1 : blocks.length,
    ...options
  };

  setBlocks(prevBlocks => {
    const insertIndex = addBlockIndex !== null ? addBlockIndex + 1 : prevBlocks.length;
    const updatedBlocks = [
      ...prevBlocks.slice(0, insertIndex),
      newBlock,
      ...prevBlocks.slice(insertIndex)
    ];
    return updatedBlocks.map((block, i) => ({ ...block, order: i }));
  });

  setIsAddingBlock(false);
  setAddBlockIndex(null);
};
const formatter = new BlogFormatter();
const handleSubmit = async (e: React.FormEvent) => {

  e.preventDefault();
  setIsSubmitting(true);
  setError(null);
  
  try {
    // Format blocks and generate metadata
    const formatter = new BlogFormatter();
const formattedBlocks = formatter.formatContent(blocks);
const metadata = formatter.generateMetadata(blocks);

    console.log('formattedBlocks:', formattedBlocks);

    // Filter out empty blocks
    const processedContent = formattedBlocks.filter(block => {
      if (block.type === 'text' || block.type === 'header') {
        return block.content.trim().length > 0;
      }
      return block.type === 'image' && block.content;
    });

    // Create the complete blog object
    const blogData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      content: formattedBlocks,
      metadata,
      dp: formData.dp,
      updatedAt: new Date().toISOString(),
      status: 'published'
    };

    validateBlogData(blogData);

    let docRef;
    let blogId;
    
    if (existingBlogId) {
      blogId = existingBlogId;
      docRef = doc(db, "blogs", existingBlogId);
      blogData.parent_blog = formData.parent_blog;
    } else {
      blogId = generateId();
      docRef = doc(db, "blogs", blogId);
      blogData.id = blogId;
      blogData.createdAt = blogData.updatedAt;
    }

    const batch = writeBatch(db);
    batch.set(docRef, blogData, { merge: true });
    await batch.commit();
    
    console.log('Blog data:', blogData);
    alert('Blog saved successfully!');
    router.push('/admin/blogsdisplay');
    
  } catch (error: any) {
    console.error('Error saving blog:', error);
    setError(error.message || 'Failed to save blog. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
};




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
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Enter blog title..."
          className="w-full text-4xl font-bold border-none outline-none mb-8 placeholder-gray-300"
          required
        />

<div className="relative w-full h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 mb-8">
  {formData.dp ? (
    <div className="relative w-full h-full flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
      <div className="relative w-full h-full">
        <Image
          src={formData.dp}
          alt="Featured blog image"
          layout="fill"
          objectFit="contain"
          className="rounded-lg"
          priority
        />
      </div>
      <button
        type="button"
        onClick={() => setFormData(prev => ({ ...prev, dp: '' }))}
        className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-lg z-10"
      >
        <X className="w-4 h-4 text-gray-600" />
      </button>
    </div>
  ) : (
    <div className="flex items-center justify-center h-full">
      <button
        type="button"
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = async (e: any) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const storage = getStorage();
              const storageRef = ref(storage, `featured-images/${file.name}-${Date.now()}`);
              await uploadBytes(storageRef, file);
              const url = await getDownloadURL(storageRef);
              setFormData(prev => ({ ...prev, dp: url }));
            } catch (error) {
              console.error('Error uploading featured image:', error);
              setError('Failed to upload featured image. Please try again.');
            }
          };
          input.click();
        }}
        className="text-gray-600 hover:text-gray-800 text-center"
      >
        <ImageIcon className="w-8 h-8 mx-auto" />
        <span className="mt-2 block text-sm">Add Featured Image</span>
      </button>
    </div>
  )}
</div>

        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
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
                {block.type === 'text' && (
                  <textarea
                    value={block.content}
                    onChange={(e) => handleBlockChange(index, e.target.value)}
                    placeholder="Type your content here..."
                    className="w-full min-h-[100px] p-2 border-none outline-none resize-none"
                  />
                )}
                {block.type === 'header' && (
                  <input
                    type="text"
                    value={block.content}
                    onChange={(e) => handleBlockChange(index, e.target.value)}
                    placeholder="Enter heading..."
                    className="w-full text-2xl font-bold border-none outline-none"
                  />
                )}
                {block.type === 'code' && (
  <div className="relative w-full">
    <LanguageSelector 
      value={block.language || 'javascript'}
      onChange={(language) => {
        setBlocks(prevBlocks =>
          prevBlocks.map((b, i) =>
            i === index ? { ...b, language } : b
          )
        );
      }}
    />
    <textarea
      value={block.content}
      onChange={(e) => handleBlockChange(index, e.target.value)}
      placeholder={`Enter your ${block.language || 'javascript'} code here...`}
      className="w-full min-h-[200px] p-4 font-mono text-sm bg-gray-900 text-gray-100 rounded-lg"
      style={{ tabSize: 2 }}
    />
  </div>
)}

{block.type === 'quote' && (
  <div className="relative w-full border-l-4 border-gray-300 pl-4">
    <textarea
      value={block.content}
      onChange={(e) => handleBlockChange(index, e.target.value)}
      placeholder="Enter a quote..."
      className="w-full min-h-[100px] p-2 italic text-gray-600 border-none outline-none resize-none"
    />
  </div>
)}

{block.type === 'list' && (
  <div className="relative w-full">
    <textarea
      value={block.content}
      onChange={(e) => handleBlockChange(index, e.target.value)}
      placeholder={block.listType === 'bullet' ? '• Enter list items (one per line)' : '1. Enter list items (one per line)'}
      className="w-full min-h-[100px] p-2 border-none outline-none resize-none"
    />
  </div>
)}
                {block.type === 'image' && (
  <div className="relative w-full h-64">
    {block.content ? (
      <div className="relative w-full h-full flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
        <div className="relative w-full h-full">
          <Image
            src={block.content}
            alt="Blog content image"
            layout="fill"
            objectFit="contain"
            className="rounded-lg"
            priority
          />
        </div>
        <button
          type="button"
          onClick={() => handleBlockChange(index, '')}
          className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-lg z-10"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    ) : (
      <button
        type="button"
        onClick={() => handleImageUpload(index)}
        className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
      >
        <ImageIcon className="w-8 h-8 text-gray-400" />
      </button>
    )}
  </div>
)}

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
                  onClick={() => handleBlockDelete(index)}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {isAddingBlock && addBlockIndex === index && (
                <BlockMenu 
                  onSelect={(type) => addNewBlock(type, index)}
                  onClose={() => {
                    setIsAddingBlock(false);
                    setAddBlockIndex(null);
                  }}
                />
              )}
            </div>
          ))}
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
                }

export default CreateNewBlog;
                        