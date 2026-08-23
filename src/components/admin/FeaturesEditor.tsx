import { useId, useState, type FormEvent } from 'react';

export interface FeatureEditorItem {
  id: string;
  title: string;
  description: string;
  iconOrImageUrl: string;
}

export interface FeaturesEditorValues {
  title: string;
  subtitle: string;
  features: FeatureEditorItem[];
}

interface Props {
  initial: FeaturesEditorValues;
  publicPath: string;
}

function newFeatureId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `feat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyFeature(): FeatureEditorItem {
  return { id: newFeatureId(), title: '', description: '', iconOrImageUrl: '' };
}

function serialize(values: FeaturesEditorValues) {
  return JSON.stringify({
    title: values.title.trim(),
    subtitle: values.subtitle.trim() || undefined,
    features: values.features.map((item) => ({
      id: item.id,
      title: item.title.trim(),
      description: item.description.trim(),
      iconOrImageUrl: item.iconOrImageUrl.trim() || undefined,
    })),
  });
}

export default function FeaturesEditor({ initial, publicPath }: Props) {
  const formId = useId();
  const [values, setValues] = useState<FeaturesEditorValues>(initial);
  const [savedSnapshot, setSavedSnapshot] = useState(() => serialize(initial));
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const isDirty = serialize(values) !== savedSnapshot;

  function updateMeta<K extends 'title' | 'subtitle'>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setStatus('idle');
    setErrorMessage('');
  }

  function updateFeature(index: number, patch: Partial<FeatureEditorItem>) {
    setValues((current) => ({
      ...current,
      features: current.features.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
    setStatus('idle');
    setErrorMessage('');
  }

  function addFeature() {
    setValues((current) => ({
      ...current,
      features: [...current.features, emptyFeature()],
    }));
    setStatus('idle');
  }

  function removeFeature(index: number) {
    setValues((current) => ({
      ...current,
      features: current.features.filter((_, i) => i !== index),
    }));
    setStatus('idle');
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus('saving');
    setErrorMessage('');

    const payload = {
      title: values.title.trim(),
      ...(values.subtitle.trim() ? { subtitle: values.subtitle.trim() } : {}),
      features: values.features.map((item) => ({
        id: item.id,
        title: item.title.trim(),
        description: item.description.trim(),
        ...(item.iconOrImageUrl.trim()
          ? { iconOrImageUrl: item.iconOrImageUrl.trim() }
          : {}),
      })),
    };

    try {
      const response = await fetch('/api/admin/features', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => null)) as
        | {
            error?: string;
            features?: {
              title: string;
              subtitle?: string;
              features: FeatureEditorItem[];
            };
          }
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? 'Failed to save features.');
      }

      const next: FeaturesEditorValues = {
        title: body?.features?.title ?? payload.title,
        subtitle: body?.features?.subtitle ?? payload.subtitle ?? '',
        features: (body?.features?.features ?? payload.features).map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          iconOrImageUrl: item.iconOrImageUrl ?? '',
        })),
      };

      setValues(next);
      setSavedSnapshot(serialize(next));
      setStatus('saved');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save features.');
    }
  }

  return (
    <form className="mt-4 flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
      <label className="block text-sm font-medium" htmlFor={`${formId}-title`}>
        Section title
        <input
          id={`${formId}-title`}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
          value={values.title}
          onChange={(event) => updateMeta('title', event.target.value)}
          placeholder="Services"
        />
      </label>

      <label className="block text-sm font-medium" htmlFor={`${formId}-subtitle`}>
        Subtitle (optional)
        <input
          id={`${formId}-subtitle`}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
          value={values.subtitle}
          onChange={(event) => updateMeta('subtitle', event.target.value)}
          placeholder="A short supporting line"
        />
      </label>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-zinc-900">
            Features ({values.features.length})
          </h3>
          <button
            type="button"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium"
            onClick={addFeature}
          >
            Add New Feature
          </button>
        </div>

        {values.features.length === 0 ? (
          <p className="text-sm text-zinc-600">No features yet. Add one to get started.</p>
        ) : (
          <ul className="space-y-4">
            {values.features.map((item, index) => (
              <li
                key={item.id}
                className="rounded-lg border border-zinc-200 bg-white p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Feature {index + 1}
                  </span>
                  <button
                    type="button"
                    className="text-xs font-medium text-red-700 underline underline-offset-2"
                    onClick={() => removeFeature(index)}
                  >
                    Remove
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <label className="block text-sm font-medium">
                    Title
                    <input
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                      value={item.title}
                      onChange={(event) => updateFeature(index, { title: event.target.value })}
                      placeholder="Feature title"
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Description
                    <textarea
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
                      rows={3}
                      value={item.description}
                      onChange={(event) =>
                        updateFeature(index, { description: event.target.value })
                      }
                      placeholder="Short description"
                    />
                  </label>
                  <label className="block text-sm font-medium">
                    Icon / image URL (optional)
                    <input
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm"
                      value={item.iconOrImageUrl}
                      onChange={(event) =>
                        updateFeature(index, { iconOrImageUrl: event.target.value })
                      }
                      placeholder="/uploads/… or https://…"
                    />
                  </label>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          disabled={status === 'saving' || !isDirty}
        >
          {status === 'saving' ? 'Saving…' : 'Save features'}
        </button>

        {status === 'saved' && !isDirty && (
          <p className="text-sm text-green-700">
            Features saved.{' '}
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
          <p className="text-sm text-zinc-600">You have unsaved feature changes.</p>
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
