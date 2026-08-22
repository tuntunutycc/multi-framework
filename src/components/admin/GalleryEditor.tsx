import { useState } from 'react';

export interface GalleryEditorItem {
  imageUrl: string;
  caption: string;
}

interface Props {
  title: string;
  items: GalleryEditorItem[];
}

export default function GalleryEditor({ title, items }: Props) {
  const [sectionTitle, setSectionTitle] = useState(title);
  const [rows, setRows] = useState<GalleryEditorItem[]>(
    items.length > 0 ? items : [{ imageUrl: '', caption: '' }],
  );

  function addRow() {
    setRows((current) => [...current, { imageUrl: '', caption: '' }]);
  }

  function removeRow(index: number) {
    setRows((current) => (current.length === 1 ? current : current.filter((_, i) => i !== index)));
  }

  function updateRow(index: number, patch: Partial<GalleryEditorItem>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function onFile(index: number, file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateRow(index, { imageUrl: String(reader.result ?? '') });
    };
    reader.readAsDataURL(file);
  }

  return (
    <form className="mt-4 flex flex-col gap-4" method="post" action="/api/admin/gallery">
      <label className="block text-sm font-medium">
        Section title
        <input
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
          name="title"
          value={sectionTitle}
          onChange={(event) => setSectionTitle(event.target.value)}
          placeholder="Activities, Events, Gallery…"
        />
      </label>

      {rows.map((row, index) => (
        <fieldset key={index} className="rounded-lg border border-zinc-200 p-4">
          <legend className="px-1 text-sm font-medium">Image {index + 1}</legend>
          <label className="mt-2 block text-sm font-medium">
            Image URL
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
              name="imageUrl"
              value={row.imageUrl}
              onChange={(event) => updateRow(index, { imageUrl: event.target.value })}
              placeholder="/images/activity.jpg"
            />
          </label>
          <label className="mt-3 block text-sm font-medium">
            Upload (stored as a data URL for this demo)
            <input
              className="mt-1 block w-full text-sm"
              type="file"
              accept="image/*"
              onChange={(event) => onFile(index, event.target.files?.[0])}
            />
          </label>
          <label className="mt-3 block text-sm font-medium">
            Caption
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
              name="caption"
              value={row.caption}
              onChange={(event) => updateRow(index, { caption: event.target.value })}
            />
          </label>
          <button
            className="mt-3 text-sm text-zinc-600 underline"
            type="button"
            onClick={() => removeRow(index)}
          >
            Remove
          </button>
        </fieldset>
      ))}

      <button className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium" type="button" onClick={addRow}>
        Add image
      </button>
      <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white" type="submit">
        Save gallery
      </button>
    </form>
  );
}
