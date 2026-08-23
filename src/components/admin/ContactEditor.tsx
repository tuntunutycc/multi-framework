import { useId, useState, type FormEvent } from 'react';

export interface ContactEditorValues {
  address: string;
  phone: string;
  email: string;
  openingHours: string;
  googleMapsUrl: string;
}

interface Props {
  initial: ContactEditorValues;
  publicPath: string;
}

function serialize(values: ContactEditorValues) {
  return JSON.stringify({
    address: values.address.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    openingHours: values.openingHours.trim(),
    googleMapsUrl: values.googleMapsUrl.trim() || undefined,
  });
}

export default function ContactEditor({ initial, publicPath }: Props) {
  const formId = useId();
  const [values, setValues] = useState<ContactEditorValues>(initial);
  const [savedSnapshot, setSavedSnapshot] = useState(() => serialize(initial));
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const isDirty = serialize(values) !== savedSnapshot;

  function updateField<K extends keyof ContactEditorValues>(key: K, value: ContactEditorValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setStatus('idle');
    setErrorMessage('');
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus('saving');
    setErrorMessage('');

    const payload = {
      address: values.address.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
      openingHours: values.openingHours.trim(),
      ...(values.googleMapsUrl.trim()
        ? { googleMapsUrl: values.googleMapsUrl.trim() }
        : {}),
    };

    try {
      const response = await fetch('/api/admin/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => null)) as
        | { error?: string; contact?: ContactEditorValues }
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? 'Failed to save contact details.');
      }

      const next: ContactEditorValues = {
        address: body?.contact?.address ?? payload.address,
        phone: body?.contact?.phone ?? payload.phone,
        email: body?.contact?.email ?? payload.email,
        openingHours: body?.contact?.openingHours ?? payload.openingHours,
        googleMapsUrl: body?.contact?.googleMapsUrl ?? payload.googleMapsUrl ?? '',
      };

      setValues(next);
      setSavedSnapshot(serialize(next));
      setStatus('saved');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save contact details.');
    }
  }

  return (
    <form className="mt-4 flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
      <label className="block text-sm font-medium" htmlFor={`${formId}-address`}>
        Address
        <textarea
          id={`${formId}-address`}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
          rows={3}
          value={values.address}
          onChange={(event) => updateField('address', event.target.value)}
          placeholder="Street, city, postal code"
        />
      </label>

      <label className="block text-sm font-medium" htmlFor={`${formId}-phone`}>
        Phone
        <input
          id={`${formId}-phone`}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
          type="tel"
          value={values.phone}
          onChange={(event) => updateField('phone', event.target.value)}
          placeholder="(555) 123-4567"
        />
      </label>

      <label className="block text-sm font-medium" htmlFor={`${formId}-email`}>
        Email
        <input
          id={`${formId}-email`}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
          type="email"
          value={values.email}
          onChange={(event) => updateField('email', event.target.value)}
          placeholder="hello@example.com"
        />
      </label>

      <label className="block text-sm font-medium" htmlFor={`${formId}-hours`}>
        Opening hours
        <textarea
          id={`${formId}-hours`}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2"
          rows={3}
          value={values.openingHours}
          onChange={(event) => updateField('openingHours', event.target.value)}
          placeholder={'Monday–Friday 9:00–17:00\nSaturday 10:00–14:00'}
        />
      </label>

      <label className="block text-sm font-medium" htmlFor={`${formId}-maps`}>
        Google Maps embed URL
        <input
          id={`${formId}-maps`}
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm"
          type="url"
          value={values.googleMapsUrl}
          onChange={(event) => updateField('googleMapsUrl', event.target.value)}
          placeholder="https://www.google.com/maps/embed?pb=…"
        />
        <span className="mt-1 block text-xs font-normal text-zinc-500">
          Paste any Google Maps link (share, place, or embed). Share links are converted to an
          embedded map automatically when possible. For best results, use Google Maps → Share →
          Embed a map (<code>https://www.google.com/maps/embed…</code>) or ensure your{' '}
          <strong>Address</strong> field is filled for fallback geocoding.
        </span>
      </label>

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          disabled={status === 'saving' || !isDirty}
        >
          {status === 'saving' ? 'Saving…' : 'Save contact'}
        </button>

        {status === 'saved' && !isDirty && (
          <p className="text-sm text-green-700">
            Contact saved.{' '}
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
          <p className="text-sm text-zinc-600">You have unsaved contact changes.</p>
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
