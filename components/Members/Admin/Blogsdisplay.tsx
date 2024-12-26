import DOMPurify from 'dompurify';
import Image from 'next/image';

interface Block {
    id: string;
    type: 'text' | 'image' | 'header' | 'code' | 'quote' | 'list';
    content: string;
    order: number;
    language?: string; // For code blocks
    listType?: 'bullet' | 'number'; // For list blocks
  }
  
interface BlogDisplayProps {
  blog: {
    title: string;
    description?: string;
    content: Block[];
    metadata?: {
      readingTime?: { text: string };
    };
    dp?: string;
  };
}

export const BlogDisplay = ({ blog }: BlogDisplayProps) => {
  const renderBlock = (block: Block) => {
    try {
      switch (block.type) {
        case 'text':
        case 'header':
        case 'quote':
          const sanitizedContent = DOMPurify.sanitize(block.formattedContent);
          return (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
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
                <code className="font-mono text-sm">{block.formattedContent.code}</code>
              </pre>
            </div>
          );

        case 'list':
          const ListTag = block.formattedContent.type === 'bullet' ? 'ul' : 'ol';
          return (
            <ListTag className={block.formattedContent.type === 'bullet' ? 'list-disc' : 'list-decimal'}>
              {block.formattedContent.items.map((item, index) => (
                <li key={index} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item) }} />
              ))}
            </ListTag>
          );

        case 'image':
          return (
            <div className="relative w-full h-96">
              <Image
                src={block.formattedContent}
                alt="Blog content"
                layout="fill"
                objectFit="contain"
                className="rounded-lg"
                priority
              />
            </div>
          );

        default:
          console.warn(`Unhandled block type: ${block.type}`);
          return null;
      }
    } catch (error) {
      console.error(`Error rendering block:`, error);
      return null;
    }
  };

  return (
    <article className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <header className="mb-8">
        {blog.dp && (
          <div className="relative w-full h-96 mb-6">
            <Image
              src={blog.dp}
              alt={blog.title}
              layout="fill"
              objectFit="cover"
              className="rounded-lg"
              priority
            />
          </div>
        )}
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{blog.title}</h1>
        <p className="text-xl text-gray-600">{blog.description || 'No description available.'}</p>
        {blog.metadata?.readingTime?.text && (
          <p className="text-gray-500 mt-2">{blog.metadata.readingTime.text}</p>
        )}
      </header>

      <div className="space-y-6">
        {blog.content.map((block: Block) => (
          <div key={block.id}>{renderBlock(block)}</div>
        ))}
      </div>
    </article>
  );
};
