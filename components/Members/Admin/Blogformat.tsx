
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface Block {
    id: string;
    type: 'text' | 'image' | 'header' | 'code' | 'quote' | 'list';
    content: string;
    order: number;
    language?: string; // For code blocks
    listType?: 'bullet' | 'number'; // For list blocks
  }
export class BlogFormatter {
  formatContent(blocks: Block[]) {
    return blocks.map(block => {
      switch (block.type) {
        case 'text':
          return {
            ...block,
            formattedContent: this.formatTextBlock(block.content)
          };
        case 'header':
          return {
            ...block,
            formattedContent: this.formatHeaderBlock(block.content)
          };
        case 'code':
          return {
            ...block,
            formattedContent: this.formatCodeBlock(block.content, block.language)
          };
        case 'quote':
          return {
            ...block,
            formattedContent: this.formatQuoteBlock(block.content)
          };
        case 'list':
          return {
            ...block,
            formattedContent: this.formatListBlock(block.content, block.listType)
          };
        case 'image':
          return {
            ...block,
            formattedContent: block.content // Images don't need special formatting
          };
        default:
          return block;
      }
    });
  }

  private formatTextBlock(content: string) {
    return content.split('\n')
      .filter(line => line.trim())
      .map(line => DOMPurify.sanitize(marked(line)));
  }

  private formatHeaderBlock(content: string) {
    return DOMPurify.sanitize(marked(content));
  }

  private formatCodeBlock(content: string, language?: string) {
    return {
      code: content.trim(),
      language: language || 'plaintext'
    };
  }

  private formatQuoteBlock(content: string) {
    return DOMPurify.sanitize(marked(content));
  }

  private formatListBlock(content: string, listType: 'bullet' | 'number') {
    const items = content
      .split('\n')
      .filter(item => item.trim())
      .map(item => DOMPurify.sanitize(marked(item)));

    return {
      items,
      type: listType
    };
  }

  generateMetadata(blocks: Block[]) {
    return {
      wordCount: this.countWords(blocks),
      readingTime: this.calculateReadingTime(blocks),
      hasCode: blocks.some(block => block.type === 'code'),
      hasImages: blocks.some(block => block.type === 'image'),
      blockTypes: [...new Set(blocks.map(block => block.type))]
    };
  }

  private countWords(blocks: Block[]): number {
    return blocks.reduce((count, block) => {
      if (block.type === 'text' || block.type === 'header' || block.type === 'quote') {
        return count + block.content.split(/\s+/).length;
      }
      return count;
    }, 0);
  }

  private calculateReadingTime(blocks: Block[]) {
    const wordsPerMinute = 200;
    const wordCount = this.countWords(blocks);
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    
    return {
      minutes,
      text: `${minutes} min read`
    };
  }
}
