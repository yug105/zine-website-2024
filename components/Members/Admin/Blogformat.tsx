
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface Block {
  id: string;
  type: 'text' | 'image' | 'header' | 'code' | 'quote' | 'list';
  content: string;
  order: number;
  language?: string;
  listType?: 'bullet' | 'number';
}

interface FormattedBlock {
  type: Block['type'];
  content: string;
  language?: string;
  listType?: 'bullet' | 'number';
}

export class BlogFormatter {
  formatContent(blocks: Block[]): FormattedBlock[] {
    return blocks.map(block => {
      const baseBlock: FormattedBlock = {
        type: block.type,
        content: this.formatBlockContent(block)
      };

      // Add additional properties based on block type
      if (block.type === 'code' && block.language) {
        baseBlock.language = block.language;
      }

      if (block.type === 'list' && block.listType) {
        baseBlock.listType = block.listType;
      }

      return baseBlock;
    });
  }

  private formatBlockContent(block: Block): string {
    switch (block.type) {
      case 'text':
        return DOMPurify.sanitize(marked(block.content));

      case 'header':
        return DOMPurify.sanitize(marked(block.content));

      case 'code':
        return block.content.trim();

      case 'quote':
        return DOMPurify.sanitize(marked(block.content));

      case 'list':
        return block.content.split('\n')
          .filter(item => item.trim())
          .map(item => DOMPurify.sanitize(marked(item)))
          .join('\n');

      case 'image':
        return block.content;

      default:
        return block.content;
    }
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