import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from 'react';

export interface AboutEditorValues {
  title: string;
  content: string;
  imageUrl: string;
  imagePosition: 'left' | 'right';
}

interface Props {
  initial: AboutEditorValues;
  publicPath: string;
}

function serialize(values: AboutEditorValues) {
  return JSON.stringify({
    title: values.title.trim(),
    content: values.content.trim(),
    imageUrl: values.imageUrl.trim() || undefined,
    imagePosition: values.imagePosition,
  });
}

export default function AboutEditor({ initial, publicPath }: Props) {
  const formId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<AboutEditorValues>(initial);
  const [savedSnapshot, setSavedSnapshot] = useState(() => serialize(initial));
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const isDirty = serialize(values) !== savedSnapshot;

  function updateField<K extends keyof AboutEditorValues>(key: K, value: AboutEditorValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setStatus('idle');
    setErrorMessage('');
  }

  async function uploadFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStatus('error');
      setErrorMessage('Please choose an image file (JPEG, PNG, WebP, or GIF).');
      return;
    }

    setUploading(true);
    setErrorMessage('');
    setStatus('idle');

    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/admin/upload', { method: 'POST', body });
      const payload = (await response.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error ?? 'Upload failed');
      }

      updateField('imageUrl', payload.url);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setUploading(false);
    }
  }

  function onFileInput(event: ChangeEvent<HTMLInputElement>) {
    void uploadFile(event.target.files?.[0]);
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragOver(false);
    void uploadFile(event.dataTransfer.files?.[0]);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus('saving');
    setErrorMessage('');

    const payload = {
      title: values.title.trim(),
      content: values.content.trim(),
      imagePosition: values.imagePosition,
      ...(values.imageUrl.trim() ? { imageUrl: values.imageUrl.trim() } : {}),
    };

    try {
      const response = await fetch('/api/admin/about', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => null)) as
        | { error?: string; about?: AboutEditorValues }
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? 'Failed to save about section.');
      }

      const next: AboutEditorValues = {
        title: body?.about?.title ?? payload.title,
        content: body?.about?.content ?? payload.content,
        imageUrl: body?.about?.imageUrl ?? payload.imageUrl ?? '',
        imagePosition: body?.about?.imagePosition ?? payload.imagePosition,
      };

      setValues(next);
      setSavedSnapshot(serialize(next));
      setStatus('saved');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save about section.');
    }
  }

  return (
    <form className="mt-4 flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
      <label className="block text-sm font-medium" htmlFor={`${formId}-title`}>
        Title
        <input
          id={`${formId}-title`}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
          value={values.title}
          onChange={(event) => updateField('title', event.target.value)}
          placeholder="About us"
        />
      </label>

      <label className="block text-sm font-medium" htmlFor={`${formId}-content`}>
        Content
        <textarea
          id={`${formId}-content`}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
          rows={6}
          value={values.content}
          onChange={(event) => updateField('content', event.target.value)}
          placeholder="Tell visitors who you are…"
        />
      </label>

      <div>
        <span className="block text-sm font-medium text-zinc-900">Image (optional)</span>
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`mt-1 flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition ${
            dragOver
              ? 'border-zinc-900 bg-zinc-100'
              : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400'
          } disabled:opacity-60`}
        >
          {uploading ? (
            <span className="text-sm font-medium text-zinc-700">Uploading…</span>
          ) : values.imageUrl ? (
            <>
              <img
                src={values.imageUrl}
                alt="About section preview"
                className="mb-3 max-h-32 rounded-md object-contain"
              />
              <span className="text-sm font-medium text-zinc-800">Replace image</span>
            </>
          ) : (
            <>
              <span className="text-sm font-medium text-zinc-800">Drop an image here</span>
              <span className="mt-1 text-xs text-zinc-500">or click to choose</span>
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={uploading}
          onChange={onFileInput}
        />
        {values.imageUrl && (
          <button
            type="button"
            className="mt-2 text-xs font-medium text-red-700 underline underline-offset-2"
            onClick={() => updateField('imageUrl', '')}
          >
            Remove image
          </button>
        )}
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-zinc-900">Image position</legend>
        <div className="mt-2 flex gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={`${formId}-position`}
              checked={values.imagePosition === 'left'}
              onChange={() => updateField('imagePosition', 'left')}
            />
            Left
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={`${formId}-position`}
              checked={values.imagePosition === 'right'}
              onChange={() => updateField('imagePosition', 'right')}
            />
            Right
          </label>
        </div>
        <p className="mt-1 text-xs text-zinc-500">Desktop layout only; stacks on mobile.</p>
      </fieldset>

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          disabled={status === 'saving' || uploading || !isDirty}
        >
          {status === 'saving' ? 'Saving…' : 'Save about'}
        </button>

        {status === 'saved' && !isDirty && (
          <p className="text-sm text-green-700">
            About saved.{' '}
            <a
              className="font-medium underline underline-offset-2"
              href={publicPath}
              target="_blank"
              rel="noreferrer"
            >
              View public site →
            </a>
          </p>
        )}

        {isDirty && status !== 'saving' && (
          <p className="text-sm text-zinc-600">You have unsaved about changes.</p>
        )}

        {status === 'error' && errorMessage && (
          <p className="text-sm text-red-700" role="alert">
            {errorMessage}
          </p>
        )}
      </div>
    </form>
  );
}
