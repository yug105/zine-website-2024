import React from 'react';
import Image from 'next/image';
import { Clock, ChevronRight } from 'lucide-react';

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

export const BlogCard = ({ blog, onClick }: { blog: Blog; onClick: () => void }) => (
  <div 
    onClick={onClick}
    className="bg-white rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer"
  >
    <div className="relative">
      {blog.dpURL ? (
        <div className="relative h-48 w-full">
          <Image
            src={blog.dpURL}
            alt={blog.blogName || 'Blog cover'}
            layout="fill"
            objectFit="cover"
            unoptimized
            className="transition-transform duration-300 hover:scale-105"
          />
        </div>
      ) : (
        <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-500" />
      )}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
    </div>
    
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
        {blog.blogName || 'Untitled Blog'}
      </h2>
      {blog.blogDescription && (
        <p className="text-gray-600 mb-4 line-clamp-2 text-sm">
          {blog.blogDescription}
        </p>
      )}
      <div className="flex justify-between items-center">
        <div className="flex items-center text-gray-500 text-sm">
          <Clock className="w-4 h-4 mr-2" />
          {new Date(blog.createdAt.seconds * 1000).toLocaleDateString()}
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>
    </div>
  </div>
);