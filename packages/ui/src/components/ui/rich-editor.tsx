import * as React from 'react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils'
import { Button } from './button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'

const editorClassName = cn(
  'min-h-[160px] px-4 py-3 font-sans text-base leading-6 text-ink focus:outline-none',
  '[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
  '[&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-semibold',
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6',
  '[&_li>p]:my-0 [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:text-ink-muted'
)

type ToolbarButtonProps = {
  label: string
  icon: React.ReactNode
  active?: boolean
  disabled?: boolean
  onClick: () => void
}

function ToolbarButton({ label, icon, active, disabled, onClick }: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={active ? 'secondary' : 'ghost'}
          size="sm"
          className="size-9 px-0"
          disabled={disabled}
          aria-label={label}
          aria-pressed={active === undefined ? undefined : active}
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

export interface RichEditorProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'defaultValue' | 'onChange'
> {
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  disabled?: boolean
  error?: string
  editorAriaLabel?: string
  scrollable?: boolean
}

function RichEditor({
  value,
  defaultValue = '',
  onChange,
  disabled = false,
  error,
  editorAriaLabel,
  scrollable = false,
  className,
  id,
  ...props
}: RichEditorProps) {
  const { t } = useTranslation('common')
  const generatedId = React.useId()
  const editorId = id ?? generatedId
  const errorId = error ? `${editorId}-error` : undefined
  const hasError = Boolean(error)
  const initialContent = value ?? defaultValue
  const onChangeRef = React.useRef(onChange)

  React.useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id: editorId,
        class: editorClassName,
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': editorAriaLabel ?? t('richEditor.inputLabel'),
        'aria-invalid': hasError ? 'true' : 'false',
        ...(errorId ? { 'aria-describedby': errorId } : {}),
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChangeRef.current?.(currentEditor.getHTML())
    },
  })

  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (!currentEditor) return null

      return {
        bold: currentEditor.isActive('bold'),
        italic: currentEditor.isActive('italic'),
        strike: currentEditor.isActive('strike'),
        heading: currentEditor.isActive('heading', { level: 2 }),
        bulletList: currentEditor.isActive('bulletList'),
        orderedList: currentEditor.isActive('orderedList'),
        blockquote: currentEditor.isActive('blockquote'),
        canUndo: currentEditor.can().chain().focus().undo().run(),
        canRedo: currentEditor.can().chain().focus().redo().run(),
      }
    },
  })

  React.useEffect(() => {
    if (!editor || value === undefined || editor.getHTML() === value) return
    editor.commands.setContent(value, { emitUpdate: false })
  }, [editor, value])

  React.useEffect(() => {
    if (!editor) return

    editor.setEditable(!disabled)
    editor.setOptions({
      editorProps: {
        attributes: {
          id: editorId,
          class: editorClassName,
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-label': editorAriaLabel ?? t('richEditor.inputLabel'),
          'aria-invalid': hasError ? 'true' : 'false',
          ...(errorId ? { 'aria-describedby': errorId } : {}),
        },
      },
    })
  }, [disabled, editor, editorAriaLabel, editorId, errorId, hasError, t])

  const toolbarDisabled = disabled || !editor

  return (
    <div
      className={cn('flex flex-col gap-1.5', scrollable && 'h-[min(22rem,55vh)]', className)}
      {...props}
    >
      <div
        className={cn(
          'cn-gradient-border cn-gradient-border--field overflow-hidden rounded-app transition-[box-shadow] focus-within:ring-2 focus-within:ring-primary/25',
          hasError && 'focus-within:ring-error/40',
          disabled && 'cursor-not-allowed opacity-60',
          scrollable && 'flex min-h-0 flex-1 flex-col'
        )}
        aria-invalid={hasError || undefined}
      >
        <TooltipProvider>
          <div
            role="toolbar"
            aria-label={t('richEditor.toolbarLabel')}
            className="flex shrink-0 flex-wrap items-center gap-1 border-b border-hairline px-2 py-1.5"
          >
            <ToolbarButton
              label={t('richEditor.bold')}
              icon={<Bold aria-hidden />}
              active={toolbarState?.bold ?? false}
              disabled={toolbarDisabled}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            />
            <ToolbarButton
              label={t('richEditor.italic')}
              icon={<Italic aria-hidden />}
              active={toolbarState?.italic ?? false}
              disabled={toolbarDisabled}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            />
            <ToolbarButton
              label={t('richEditor.strike')}
              icon={<Strikethrough aria-hidden />}
              active={toolbarState?.strike ?? false}
              disabled={toolbarDisabled}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
            />
            <ToolbarButton
              label={t('richEditor.heading')}
              icon={<Heading2 aria-hidden />}
              active={toolbarState?.heading ?? false}
              disabled={toolbarDisabled}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            />
            <ToolbarButton
              label={t('richEditor.bulletList')}
              icon={<List aria-hidden />}
              active={toolbarState?.bulletList ?? false}
              disabled={toolbarDisabled}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            />
            <ToolbarButton
              label={t('richEditor.orderedList')}
              icon={<ListOrdered aria-hidden />}
              active={toolbarState?.orderedList ?? false}
              disabled={toolbarDisabled}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            />
            <ToolbarButton
              label={t('richEditor.blockquote')}
              icon={<Quote aria-hidden />}
              active={toolbarState?.blockquote ?? false}
              disabled={toolbarDisabled}
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            />
            <span className="mx-1 h-6 w-px bg-hairline" aria-hidden />
            <ToolbarButton
              label={t('richEditor.undo')}
              icon={<Undo2 aria-hidden />}
              disabled={toolbarDisabled || !toolbarState?.canUndo}
              onClick={() => editor?.chain().focus().undo().run()}
            />
            <ToolbarButton
              label={t('richEditor.redo')}
              icon={<Redo2 aria-hidden />}
              disabled={toolbarDisabled || !toolbarState?.canRedo}
              onClick={() => editor?.chain().focus().redo().run()}
            />
          </div>
        </TooltipProvider>
        <EditorContent
          editor={editor}
          className={cn(scrollable && 'min-h-0 flex-1 overflow-y-auto overscroll-contain')}
        />
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-error">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export { RichEditor }
