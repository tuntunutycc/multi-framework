import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from 'react';

export interface GalleryEditorItem {
  imageUrl: string;
  caption: string;
}

interface Props {
  title: string;
  items: GalleryEditorItem[];
  /** Public site path, e.g. /riverside */
  publicPath: string;
}

const emptyDraft = (): GalleryEditorItem => ({ imageUrl: '', caption: '' });

function serialize(title: string, items: GalleryEditorItem[]) {
  return JSON.stringify({
    title: title.trim(),
    items: items.map((item) => ({
      imageUrl: item.imageUrl.trim(),
      caption: item.caption.trim(),
    })),
  });
}

export default function GalleryEditor({ title, items, publicPath }: Props) {
  const formId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sectionTitle, setSectionTitle] = useState(title);
  const [rows, setRows] = useState<GalleryEditorItem[]>(items);
  const [draft, setDraft] = useState<GalleryEditorItem>(emptyDraft());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState(() => serialize(title, items));

  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const isEditing = editingIndex !== null;
  const isDirty = serialize(sectionTitle, rows) !== savedSnapshot;
  const hasItems = rows.length > 0;

  function resetDraft() {
    setDraft(emptyDraft());
    setEditingIndex(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function startEdit(index: number) {
    const item = rows[index];
    if (!item) return;
    setDraft({ imageUrl: item.imageUrl, caption: item.caption });
    setEditingIndex(index);
    setStatus('idle');
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function deleteItem(index: number) {
    setRows((current) => current.filter((_, i) => i !== index));
    if (editingIndex === index) {
      resetDraft();
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
    setStatus('idle');
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

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body,
      });

      const payload = (await response.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error ?? 'Upload failed');
      }

      const stagingImageUrl = payload.url;

      // Stage in the composer only — do not append to the gallery until "Add to Gallery".
      setDraft((current) => ({ ...current, imageUrl: stagingImageUrl }));
      if (fileInputRef.current) fileInputRef.current.value = '';
      setStatus('idle');
      setErrorMessage('');
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
    const file = event.dataTransfer.files?.[0];
    void uploadFile(file);
  }

  function submitDraft(event: FormEvent) {
    event.preventDefault();
    const imageUrl = draft.imageUrl.trim();
    if (!imageUrl) {
      setErrorMessage(
        isEditing
          ? 'Image is required.'
          : 'Upload an image first, add an optional caption, then click Add to Gallery.',
      );
      setStatus('error');
      return;
    }

    const nextItem: GalleryEditorItem = {
      imageUrl,
      caption: draft.caption.trim(),
    };

    if (editingIndex === null) {
      setRows((current) => [...current, nextItem]);
    } else {
      setRows((current) => current.map((row, i) => (i === editingIndex ? nextItem : row)));
    }

    resetDraft();
    setErrorMessage('');
    setStatus('idle');
  }

  async function publishGallery() {
    setStatus('saving');
    setErrorMessage('');

    const payload = {
      title: sectionTitle.trim() || undefined,
      items: rows
        .map((row) => ({
          imageUrl: row.imageUrl.trim(),
          caption: row.caption.trim() || undefined,
        }))
        .filter((row) => row.imageUrl.length > 0),
    };

    try {
      const response = await fetch('/api/admin/gallery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(body?.error ?? 'Failed to publish gallery.');
      }

      setSavedSnapshot(serialize(sectionTitle, rows));
      setStatus('saved');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to publish gallery.');
    }
  }

  const composer = (
    <section
      aria-labelledby={`${formId}-form-heading`}
      className="rounded-lg border border-zinc-200 bg-white p-4"
    >
      <h3 id={`${formId}-form-heading`} className="text-sm font-semibold text-zinc-900">
        {isEditing ? `Edit item ${editingIndex + 1}` : 'Add a photo'}
      </h3>
      {!isEditing && (
        <p className="mt-1 text-sm text-zinc-600">
          Upload a photo to preview it here, add a caption, then click Add to Gallery. Publish when
          ready.
        </p>
      )}

      <form className="mt-4 flex flex-col gap-4" onSubmit={submitDraft}>
        <div>
          <span className="block text-sm font-medium text-zinc-900">Image</span>
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
            className={`mt-1 flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition ${
              dragOver
                ? 'border-zinc-900 bg-zinc-100'
                : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400'
            } disabled:opacity-60`}
          >
            {uploading ? (
              <span className="text-sm font-medium text-zinc-700">Uploading…</span>
            ) : draft.imageUrl ? (
              <>
                <img
                  src={draft.imageUrl}
                  alt="Staged upload preview"
                  className="mb-3 max-h-36 rounded-md object-contain"
                />
                <span className="text-sm font-medium text-zinc-800">Replace image</span>
                <span className="mt-1 text-xs text-zinc-500">Drop a new file or click to choose</span>
              </>
            ) : (
              <>
                <span className="text-sm font-medium text-zinc-800">Drop an image here</span>
                <span className="mt-1 text-xs text-zinc-500">or click to choose · JPEG, PNG, WebP, GIF · max 5 MB</span>
              </>
            )}
          </button>
          <input
            id={`${formId}-file`}
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={uploading}
            onChange={onFileInput}
          />
          {!isEditing && draft.imageUrl && (
            <p className="mt-2 text-xs text-zinc-500">
              Image staged — add a caption below, then Add to Gallery.
            </p>
          )}
        </div>

        <label className="block text-sm font-medium" htmlFor={`${formId}-caption`}>
          Caption / Product name
          <input
            id={`${formId}-caption`}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
            value={draft.caption}
            onChange={(event) =>
              setDraft((current) => ({ ...current, caption: event.target.value }))
            }
            placeholder="Optional caption"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={uploading || !draft.imageUrl}
          >
            {isEditing ? 'Update item' : 'Add to Gallery'}
          </button>
          {(isEditing || draft.imageUrl || draft.caption) && (
            <button
              type="button"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium"
              onClick={resetDraft}
              disabled={uploading}
            >
              {isEditing ? 'Cancel' : 'Clear'}
            </button>
          )}
        </div>
      </form>
    </section>
  );

  const itemGrid = hasItems ? (
    <section aria-labelledby={`${formId}-list-heading`}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={`${formId}-list-heading`} className="text-sm font-semibold text-zinc-900">
          On your site ({rows.length})
        </h3>
        {isDirty && (
          <span className="text-xs font-medium text-amber-700">Unpublished changes</span>
        )}
      </div>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {rows.map((row, index) => (
          <li
            key={`${row.imageUrl}-${index}`}
            className={`overflow-hidden rounded-lg border bg-white ${
              editingIndex === index ? 'border-zinc-900 ring-1 ring-zinc-900' : 'border-zinc-200'
            }`}
          >
            <div className="aspect-[4/3] bg-zinc-100">
              <img
                src={row.imageUrl}
                alt={row.caption || `Gallery image ${index + 1}`}
                className="size-full object-cover"
              />
            </div>
            <div className="space-y-2 p-3">
              <p className="truncate text-sm font-medium text-zinc-900">
                {row.caption || `Untitled ${index + 1}`}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium"
                  onClick={() => startEdit(index)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700"
                  onClick={() => deleteItem(index)}
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  ) : null;

  return (
    <div className="mt-4 flex flex-col gap-6">
      <label className="block text-sm font-medium" htmlFor={`${formId}-title`}>
        Section title
        <input
          id={`${formId}-title`}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
          value={sectionTitle}
          onChange={(event) => {
            setSectionTitle(event.target.value);
            setStatus('idle');
          }}
          placeholder="Activities, Events, Products…"
        />
      </label>

      {/* Empty: composer first. With items: grid first, then composer. */}
      {hasItems ? (
        <>
          {itemGrid}
          {composer}
        </>
      ) : (
        <>
          {composer}
          <p className="text-sm text-zinc-600">
            No photos yet. Stage an image above, click{' '}
            <span className="font-medium text-zinc-800">Add to Gallery</span>, then{' '}
            <span className="font-medium text-zinc-800">Publish gallery</span>.
          </p>
        </>
      )}

      <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4">
        <button
          type="button"
          className={`rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
            isDirty
              ? 'bg-zinc-900 text-white'
              : 'border border-zinc-300 bg-white text-zinc-800'
          }`}
          onClick={() => void publishGallery()}
          disabled={status === 'saving' || uploading || !isDirty}
        >
          {status === 'saving' ? 'Publishing…' : isDirty ? 'Publish gallery' : 'Published'}
        </button>

        {status === 'saved' && !isDirty && (
          <p className="text-sm text-green-700">
            Gallery published.{' '}
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
          <p className="text-sm text-zinc-600">
            You have unpublished edits. Publish to update {publicPath}.
          </p>
        )}

        {status === 'error' && errorMessage && (
          <p className="text-sm text-red-700" role="alert">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
