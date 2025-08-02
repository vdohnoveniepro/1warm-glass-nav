import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import {
  FaBold,
  FaItalic,
  FaUnderline,
  FaHeading,
  FaListUl,
  FaListOl,
  FaLink,
  FaUnlink,
  FaImage,
  FaCode,
  FaQuoteRight
} from 'react-icons/fa';

// Пользовательское расширение для обработки HTML
const CustomHTML = Node.create({
  name: 'customHTML',
  group: 'block',
  content: 'inline*',
  parseHTML() {
    return [{ tag: 'div.custom-html' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'custom-html' }), 0];
  },
});

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  rows?: number;
  className?: string;
  onInsertImage?: (url: string) => void;
}

// Добавляем интерфейс для ref редактора
export interface RichTextEditorRef {
  insertContentAtCursor: (content: string) => void;
  getHTML: () => string;
  insertImage: (url: string) => void;
  format: (type: string) => void;
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({
  value,
  onChange,
  placeholder = 'Введите текст...',
  error,
  rows = 5,
  className = '',
  onInsertImage,
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const imageUrlInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Включаем расширенную поддержку HTML
        codeBlock: {
          HTMLAttributes: {
            class: 'bg-gray-100 rounded-md p-2 font-mono text-sm',
          },
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline',
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full mx-auto my-4 rounded-md',
        },
      }),
      Underline,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none min-h-[120px] text-base ${className}`,
      },
      // Улучшенная обработка вставляемого HTML
      handlePaste: (view, event) => {
        if (!event.clipboardData) return false;
        
        // Если вставляется HTML (как из ИИ-доп.(VPN)), обрабатываем его особым образом
        const html = event.clipboardData.getData('text/html');
        if (html && html.includes('<img')) {
          // Используем insertContent напрямую
          setTimeout(() => {
            editor?.commands.insertContent(html);
          }, 0);
          return true;
        }
        
        return false;
      },
    },
  });

  // Экспортируем методы для использования через ref
  useImperativeHandle(ref, () => ({
    insertContentAtCursor: (content: string) => {
      if (editor) {
        // Фокусируемся на редакторе перед вставкой
        editor.commands.focus();
        // Вставляем контент в текущую позицию курсора
        editor.commands.insertContent(content);
      }
    },
    getHTML: () => {
      return editor ? editor.getHTML() : '';
    },
    insertImage: (url: string) => {
      if (editor && url) {
        editor
          .chain()
          .focus()
          .insertContent(`<img src="${url}" alt="Изображение" />`)
          .run();
      }
    },
    format: (type: string) => {
      if (!editor) return;
      
      editor.commands.focus();
      
      switch (type) {
        case 'bold':
          editor.chain().toggleBold().run();
          break;
        case 'italic':
          editor.chain().toggleItalic().run();
          break;
        case 'underline':
          editor.chain().toggleUnderline().run();
          break;
        case 'heading':
          editor.chain().toggleHeading({ level: 2 }).run();
          break;
        case 'bulletList':
          editor.chain().toggleBulletList().run();
          break;
        case 'orderedList':
          editor.chain().toggleOrderedList().run();
          break;
        case 'blockquote':
          editor.chain().toggleBlockquote().run();
          break;
        case 'code':
          editor.chain().toggleCodeBlock().run();
          break;
        case 'link':
          const url = prompt('Введите URL:');
          if (url) {
            editor.chain().setLink({ href: url }).run();
          }
          break;
        default:
          break;
      }
    }
  }));

  // Слежение за изменением внешнего значения и обновление содержимого редактора
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  useEffect(() => {
    if (showImageDialog && imageUrlInputRef.current) {
      imageUrlInputRef.current.focus();
    }
  }, [showImageDialog]);

  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = prompt('Введите URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };
  
  const addImage = () => {
    setShowImageDialog(true);
  };

  const handleImageUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (imageUrl) {
      editor
        .chain()
        .focus()
        .insertContent(`<img src="${imageUrl}" alt="Изображение" />`)
        .run();
      
      if (onInsertImage) {
        onInsertImage(imageUrl);
      }
      
      setImageUrl('');
      setShowImageDialog(false);
    }
  };

  const handleImageUrlCancel = () => {
    setImageUrl('');
    setShowImageDialog(false);
  };

  return (
    <div className={`rich-text-editor w-full ${error ? 'has-error' : ''}`}>
      <div className="toolbar flex flex-wrap gap-1 p-1 bg-gray-100 border border-gray-300 rounded-t-lg">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
          title="Жирный (Ctrl+B)"
        >
          <FaBold size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
          title="Курсив (Ctrl+I)"
        >
          <FaItalic size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('underline') ? 'bg-gray-200' : ''}`}
          title="Подчеркнутый"
        >
          <FaUnderline size={16} />
        </button>
        
        <div className="border-l border-gray-300 mx-1"></div>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}`}
          title="Заголовок H2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''}`}
          title="Заголовок H3"
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 4 }) ? 'bg-gray-200' : ''}`}
          title="Заголовок H4"
        >
          H4
        </button>
        
        <div className="border-l border-gray-300 mx-1"></div>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
          title="Маркированный список"
        >
          <FaListUl size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
          title="Нумерованный список"
        >
          <FaListOl size={16} />
        </button>
        
        <div className="border-l border-gray-300 mx-1"></div>
        
        <button
          type="button"
          onClick={addLink}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('link') ? 'bg-gray-200' : ''}`}
          title="Вставить ссылку"
        >
          <FaLink size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetLink().run()}
          className="p-2 rounded hover:bg-gray-200"
          title="Удалить ссылку"
        >
          <FaUnlink size={16} />
        </button>
        
        <button
          type="button"
          onClick={addImage}
          className="p-2 rounded hover:bg-gray-200"
          title="Вставить изображение"
        >
          <FaImage size={16} />
        </button>
        
        <div className="border-l border-gray-300 mx-1"></div>
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('blockquote') ? 'bg-gray-200' : ''}`}
          title="Цитата"
        >
          <FaQuoteRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-2 rounded hover:bg-gray-200 ${editor.isActive('codeBlock') ? 'bg-gray-200' : ''}`}
          title="Блок кода"
        >
          <FaCode size={16} />
        </button>
      </div>
      
      {showImageDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-md w-full">
            <h3 className="font-semibold text-lg mb-3">Вставить изображение</h3>
            
            <form onSubmit={handleImageUrlSubmit}>
              <div className="mb-3">
                <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  URL изображения
                </label>
                <input
                  ref={imageUrlInputRef}
                  type="text"
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleImageUrlCancel}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md"
                  disabled={!imageUrl}
                >
                  Вставить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Контекстное меню, которое появляется при выделении текста */}
      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100 }}
          className="bg-white shadow-lg rounded-lg border border-gray-200 flex items-center p-1"
        >
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive('bold') ? 'bg-gray-100' : ''}`}
          >
            <FaBold size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive('italic') ? 'bg-gray-100' : ''}`}
          >
            <FaItalic size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive('underline') ? 'bg-gray-100' : ''}`}
          >
            <FaUnderline size={14} />
          </button>
          <div className="border-l border-gray-200 mx-0.5 h-5"></div>
          <button
            type="button"
            onClick={addLink}
            className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive('link') ? 'bg-gray-100' : ''}`}
          >
            <FaLink size={14} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded hover:bg-gray-100 text-xs font-bold ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-100' : ''}`}
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded hover:bg-gray-100 text-xs font-bold ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-100' : ''}`}
          >
            H3
          </button>
        </BubbleMenu>
      )}
      
      <div 
        className={`editor-content border border-t-0 border-gray-300 rounded-b-lg px-4 py-2 ${
          isFocused ? 'focus-within:ring-2 focus-within:ring-blue-300 focus-within:border-transparent' : ''
        }`}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        <EditorContent editor={editor} />
      </div>
      
      {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
    </div>
  );
});

export default RichTextEditor; 