import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageResize from "tiptap-extension-resize-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import { TextB as Bold, TextItalic as Italic, TextUnderline as UnderlineIcon, TextStrikethrough as Strikethrough, CaretDown as SubscriptIcon, CaretUp as SuperscriptIcon, TextAlignLeft as AlignLeft, TextAlignCenter as AlignCenter, TextAlignRight as AlignRight, ListBullets as List, ListNumbers as ListOrdered, Link as LinkIcon, Image as ImageIcon, IconContext } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "./dialog";
import { Button } from "./button";
import { Input } from "./input";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  allowClozeBlanks?: boolean;
  onInsertBlank?: (id: string) => void;
}

export function RichTextEditor({ value, onChange, placeholder, className, allowClozeBlanks, onInsertBlank }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageResize.configure({
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Underline,
      Subscript,
      Superscript,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none w-full outline-none p-4 break-words",
          className
        ),
      },
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData('text/plain');
        
        // Browsers like Edge copy URLs as rich text (Title + Link). 
        // If the plain text is EXACTLY a URL, we force paste it as text so it doesn't paste as 'Page Title'.
        const isUrl = text && /^(https?:\/\/[^\s]+)$/.test(text.trim());
        
        if (isUrl) {
          event.preventDefault();
          view.dispatch(view.state.tr.insertText(text.trim()));
          return true;
        }

        const items = Array.from(event.clipboardData?.items || []);
        const imageItem = items.find(item => item.type.startsWith('image/'));
        
        // Handle raw image pastes (like from Snipping Tool) robustly
        if (imageItem && (!text || text.trim() === "")) {
          const file = imageItem.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const result = e.target?.result as string;
              if (result) {
                const imageNode = view.state.schema.nodes.image || view.state.schema.nodes.imageResize;
                if (imageNode) {
                  const node = imageNode.create({ src: result });
                  view.dispatch(view.state.tr.replaceSelectionWith(node));
                }
              }
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        
        return false;
      }
    },
  });

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  if (!editor) {
    return null;
  }

  const openLinkDialog = () => {
    const previousUrl = editor.getAttributes("link").href;
    setUrlInput(previousUrl || "");
    setLinkDialogOpen(true);
  };

  const submitLink = () => {
    const url = urlInput.trim();
    setLinkDialogOpen(false);
    setUrlInput("");
    
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    // update link
    if (editor.state.selection.empty) {
      // If nothing is selected, insert the URL as text with a link mark, and add a space outside the link
      editor.chain().focus().insertContent(`<a href="${url}">${url}</a> `).unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  const openImageDialog = () => {
    setUrlInput("");
    setImageDialogOpen(true);
  };

  const submitImage = () => {
    const url = urlInput.trim();
    setImageDialogOpen(false);
    setUrlInput("");
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-border bg-background focus-within:border-primary overflow-hidden">
      <IconContext.Provider value={{ weight: "regular" }}>
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/50 p-1.5">
        <div className="flex items-center gap-1 border-r border-border pr-1 mr-1">
          <select
            className="h-8 rounded-md bg-transparent px-2 py-1 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted focus:bg-muted focus:text-foreground"
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'p') {
                editor.chain().focus().setParagraph().run();
              } else {
                editor.chain().focus().toggleHeading({ level: parseInt(val) as any }).run();
              }
            }}
            value={
              editor.isActive('heading', { level: 1 }) ? '1' :
              editor.isActive('heading', { level: 2 }) ? '2' :
              editor.isActive('heading', { level: 3 }) ? '3' :
              'p'
            }
          >
            <option value="p">Paragraph</option>
            <option value="1">Heading 1</option>
            <option value="2">Heading 2</option>
            <option value="3">Heading 3</option>
          </select>
        </div>

        {allowClozeBlanks && (
          <div className="flex items-center gap-1 border-r border-border pr-1 mr-1">
            <button
              type="button"
              onClick={() => {
                const text = editor.getText();
                const matches = [...text.matchAll(/{(\d+)}/g)];
                const ids = matches.map(m => parseInt(m[1], 10)).filter(n => !isNaN(n));
                const nextId = String(Math.max(0, ...ids) + 1);
                editor.chain().focus().insertContent(`{${nextId}} `).run();
                if (onInsertBlank) onInsertBlank(nextId);
              }}
              className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              Insert Blank {'{ }'}
            </button>
          </div>
        )}

        <div className="flex items-center gap-1 border-r border-border pr-1 mr-1">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(
              "grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground",
              editor.isActive("bold") && "bg-muted text-foreground"
            )}
          >
            <Bold className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(
              "grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground",
              editor.isActive("italic") && "bg-muted text-foreground"
            )}
          >
            <Italic className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={cn(
              "grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground",
              editor.isActive("underline") && "bg-muted text-foreground"
            )}
          >
            <UnderlineIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={cn(
              "grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground",
              editor.isActive("strike") && "bg-muted text-foreground"
            )}
          >
            <Strikethrough className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 border-r border-border pr-1 mr-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            className={cn(
              "grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground",
              editor.isActive("subscript") && "bg-muted text-foreground"
            )}
          >
            <SubscriptIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            className={cn(
              "grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground",
              editor.isActive("superscript") && "bg-muted text-foreground"
            )}
          >
            <SuperscriptIcon className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 border-r border-border pr-1 mr-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={cn(
              "grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground",
              editor.isActive({ textAlign: 'left' }) && "bg-muted text-foreground"
            )}
          >
            <AlignLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={cn(
              "grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground",
              editor.isActive({ textAlign: 'center' }) && "bg-muted text-foreground"
            )}
          >
            <AlignCenter className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={cn(
              "grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground",
              editor.isActive({ textAlign: 'right' }) && "bg-muted text-foreground"
            )}
          >
            <AlignRight className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 border-r border-border pr-1 mr-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn(
              "grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground",
              editor.isActive("bulletList") && "bg-muted text-foreground"
            )}
          >
            <List className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn(
              "grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground",
              editor.isActive("orderedList") && "bg-muted text-foreground"
            )}
          >
            <ListOrdered className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={openLinkDialog}
            className={cn(
              "grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground",
              editor.isActive("link") && "bg-muted text-foreground"
            )}
          >
            <LinkIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={openImageDialog}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ImageIcon className="size-4" />
          </button>
        </div>
      </div>
      </IconContext.Provider>
      <EditorContent editor={editor} className="max-h-[400px] overflow-y-auto" />

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input 
              value={urlInput} 
              onChange={(e) => setUrlInput(e.target.value)} 
              placeholder="https://example.com" 
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitLink();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitLink}>Insert Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input 
              value={urlInput} 
              onChange={(e) => setUrlInput(e.target.value)} 
              placeholder="https://example.com/image.png" 
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitImage();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImageDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitImage}>Insert Image</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
