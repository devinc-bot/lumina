'use client'

import type { StoredFile } from 'files-sdk'
import type { UseFilesResult } from 'files-sdk/react'
import { FileIcon, Loader2Icon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '../../lib/utils'

type FilePreviewMeta = {
  key: string
  name: string
  size: number
  type: string
  etag?: string
}

export interface FilePreviewProps {
  /** Required for remote keys — resolves metadata and bytes through it. */
  files?: UseFilesResult
  /** A storage key, `StoredFile`, or a local `File` (no upload). */
  file: string | StoredFile | File
  /** Endpoint for the gateway download-proxy fallback. Default `"/api/files"`. */
  endpoint?: string
  className?: string
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) {
    return '0 B'
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

const Body = ({
  alt,
  error,
  isLoading,
  src,
  text,
  type,
}: {
  alt: string
  error?: string
  isLoading: boolean
  src?: string
  text?: string
  type?: string
}) => {
  if (isLoading) {
    return <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
  }
  if (error) {
    return <p className="text-destructive text-sm">{error}</p>
  }
  if (src && type === 'application/pdf') {
    return (
      <object aria-label="PDF preview" className="h-72 w-full" data={src} type="application/pdf" />
    )
  }
  if (src) {
    return (
      // eslint-disable-next-line nextjs/no-img-element
      <img alt={alt} className="absolute inset-0 h-full w-full object-cover" src={src} />
    )
  }
  if (text !== undefined) {
    return <pre className="max-h-72 w-full overflow-auto whitespace-pre-wrap text-xs">{text}</pre>
  }
  return (
    <span className="flex flex-col items-center gap-1 text-muted-foreground text-sm">
      <FileIcon className="size-6" />
      No inline preview
    </span>
  )
}

/**
 * Preview of a stored file or a local `File`. Remote files load through
 * `files-sdk`; local files use an object URL (no network).
 */
export const FilePreview = ({
  files,
  file,
  endpoint = '/api/files',
  className,
}: FilePreviewProps) => {
  const isLocalFile = file instanceof File
  const key = isLocalFile ? file.name : typeof file === 'string' ? file : file.key
  const [meta, setMeta] = useState<FilePreviewMeta | undefined>(() => {
    if (file instanceof File) {
      return { key: file.name, name: file.name, size: file.size, type: file.type }
    }
    if (typeof file === 'string') {
      return undefined
    }
    return { key: file.key, name: file.name, size: file.size, type: file.type, etag: file.etag }
  })
  const [src, setSrc] = useState<string>()
  const [text, setText] = useState<string>()
  const [loadError, setLoadError] = useState<string>()
  const [isLoading, setIsLoading] = useState(!isLocalFile)

  const filesRef = useRef(files)

  useEffect(() => {
    filesRef.current = files
  }, [files])

  useEffect(() => {
    if (!(file instanceof File)) {
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setMeta({ key: file.name, name: file.name, size: file.size, type: file.type })
    setSrc(objectUrl)
    setLoadError(undefined)
    setIsLoading(false)

    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  useEffect(() => {
    if (file instanceof File) {
      return
    }

    const controller = new AbortController()

    const run = async () => {
      if (!filesRef.current) {
        setLoadError('Missing files client.')
        setIsLoading(false)
        return
      }

      setLoadError(undefined)
      setSrc(undefined)
      setText(undefined)
      setIsLoading(true)
      try {
        const resolved = typeof file === 'string' ? await filesRef.current.head(key) : file
        if (controller.signal.aborted) {
          return
        }
        setMeta({
          key: resolved.key,
          name: resolved.name,
          size: resolved.size,
          type: resolved.type,
          etag: resolved.etag,
        })

        if (resolved.type.startsWith('text/') || resolved.type === 'application/json') {
          const downloaded = await filesRef.current.download(key)
          const body = await downloaded.text()
          if (!controller.signal.aborted) {
            setText(body)
          }
        } else if (resolved.type.startsWith('image/') || resolved.type === 'application/pdf') {
          const proxy = `${endpoint}?op=download&key=${encodeURIComponent(key)}`
          let resolvedSrc = proxy
          const caps = await filesRef.current.capabilities()
          if (!controller.signal.aborted && caps.signedUrl.supported) {
            try {
              resolvedSrc = await filesRef.current.url(key)
            } catch {
              resolvedSrc = proxy
            }
          }
          if (!controller.signal.aborted) {
            setSrc(resolvedSrc)
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load file.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void run()
    return () => controller.abort()
  }, [endpoint, file, files, key])

  return (
    <figure className={cn('overflow-hidden rounded-lg border border-border bg-card', className)}>
      <div className="relative aspect-4/3 w-full overflow-hidden bg-muted/30">
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <Body
            alt={meta?.name ?? key}
            error={loadError}
            isLoading={isLoading}
            src={src}
            text={text}
            type={meta?.type ?? (file instanceof File ? file.type : undefined)}
          />
        </div>
      </div>
      <figcaption className="border-border border-t px-3 py-2">
        <p className="truncate font-medium text-sm">{meta?.name ?? key}</p>
        <p className="text-muted-foreground text-xs">
          {meta ? `${formatBytes(meta.size)} · ${meta.type || 'unknown'}` : '—'}
          {meta?.etag ? ` · ${meta.etag}` : ''}
        </p>
      </figcaption>
    </figure>
  )
}
