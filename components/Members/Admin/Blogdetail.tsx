import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Clock, Loader, Plus } from 'lucide-react';
import DOMPurify from 'dompurify';
import axios from 'axios';

// Create axios instance with default config
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

interface Blog {
  blogID: number;
  blogName: string | null;
  blogDescription: string | null;
  content: string;
  dpURL: string | null;
  imagePath: string | null;
  createdAt: {
    seconds: number;
    nanos: number;
  };
}

const renderBlock = (block: any) => {
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
          <div className="relative group">
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
        const listItems = block.content.split('\n').filter((item: string) => item.trim());
        const ListComponent = block.listType === 'bullet' ? 'ul' : 'ol';
        return (
          <ListComponent
            className={`ml-6 space-y-2 ${
              block.listType === 'bullet' ? 'list-disc' : 'list-decimal'
            }`}
          >
            {listItems.map((item: string, index: number) => (
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
          <div className="relative w-full h-96 my-8">
            <Image
              src={block.content}
              alt="Blog content"
              fill
              className="object-contain rounded-lg"
              priority
              unoptimized
            />
          </div>
        );

      default:
        console.warn(`Unhandled block type: ${block.type}`);
        return null;
    }
  } catch (error) {
    console.error(`Error rendering block:`, error, block);
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        Failed to render content block
      </div>
    );
  }
};

const SubBlogCard = ({ blog, onClick }: { blog: Blog; onClick: () => void }) => (
  <div 
    onClick={onClick}
    className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-500 transition-colors cursor-pointer"
  >
    <div className="flex items-start space-x-4">
      {blog.dpURL && (
        <div className="relative h-16 w-16 flex-shrink-0">
          <Image
            src={blog.dpURL}
            alt={blog.blogName || 'Sub-blog cover'}
            fill
            className="object-cover rounded-lg"
            unoptimized
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">
          {blog.blogName || 'Untitled Sub-blog'}
        </h3>
        {blog.blogDescription && (
          <p className="text-sm text-gray-600 line-clamp-2 mt-1">
            {blog.blogDescription}
          </p>
        )}
        <div className="flex items-center text-gray-500 text-xs mt-2">
          <Clock className="w-3 h-3 mr-1" />
          {new Date(blog.createdAt.seconds * 1000).toLocaleDateString()}
        </div>
      </div>
    </div>
  </div>
);

export const BlogDetail = () => {
  const router = useRouter();
  const [mainBlog, setMainBlog] = useState<Blog | null>(null);
  const [subBlogs, setSubBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { id: blogId } = router.query;

  useEffect(() => {
    const fetchBlogAndSubBlogs = async () => {
      if (!blogId) return;

      try {
        setIsLoading(true);
        setError(null);

        // Fetch main blog
        const mainBlogResponse = await api.get('/blog', {
          params: { id: blogId }
        });
        setMainBlog(mainBlogResponse.data.blogs[0]);

        // Fetch sub-blogs
        const subBlogsResponse = await api.get('/blog', {
          params: { parentBlog: blogId }
        });
        setSubBlogs(subBlogsResponse.data.blogs || []);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          setError(error.response?.data?.message || 'Failed to fetch blog data');
        } else {
          setError('Failed to fetch blog data');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlogAndSubBlogs();
  }, [blogId]);

  const handleCreateSubBlog = () => {
    router.push({
      pathname: '/create-blog',
      query: { parentBlogId: blogId },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!mainBlog) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 text-yellow-600 p-4 rounded-lg">
          Blog not found
        </div>
      </div>
    );
  }

  const ContentRenderer = ({ content }: { content: string }) => {
    try {
      const blocks = JSON.parse(content);
      return (
        <div className="space-y-6">
          {blocks.map((block: any, index: number) => (
            <div key={index}>
              {renderBlock(block)}
            </div>
          ))}
        </div>
      );
    } catch (error) {
      console.error('Error parsing content:', error);
      return (
        <div className="prose max-w-none">
          {content}
        </div>
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Blog Content */}
        <article className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {mainBlog.dpURL && (
              <div className="relative w-full h-64">
                <Image
                  src={mainBlog.dpURL}
                  alt={mainBlog.blogName || 'Blog image'}
                  fill
                  className="object-cover"
                  priority
                  unoptimized
                />
              </div>
            )}
            
            <div className="p-6 space-y-6">
              <header className="space-y-4">
                <h1 className="text-3xl font-bold text-gray-900">
                  {mainBlog.blogName || 'Untitled Blog'}
                </h1>
                {mainBlog.blogDescription && (
                  <p className="text-xl text-gray-600">{mainBlog.blogDescription}</p>
                )}
                <div className="flex items-center text-gray-500 text-sm">
                  <Clock className="w-4 h-4 mr-2" />
                  {new Date(mainBlog.createdAt.seconds * 1000).toLocaleDateString()}
                </div>
              </header>

              <ContentRenderer content={mainBlog.content} />
            </div>
          </div>
        </article>

        {/* Sidebar with Sub-blogs */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Related Blogs</h2>
              <button
                onClick={handleCreateSubBlog}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Sub-blog
              </button>
            </div>

            <div className="space-y-4">
              {subBlogs.length > 0 ? (
                subBlogs.map((subBlog) => (
                  <SubBlogCard
                    key={subBlog.blogID}
                    blog={subBlog}
                    onClick={() => router.push(`/blog/${subBlog.blogID}`)}
                  />
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No sub-blogs yet
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogDetail;