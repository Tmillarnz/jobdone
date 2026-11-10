import { useEffect, useState } from 'preact/hooks';
import { uid } from '../../core/id';
import type { PhotoRef } from '../../core/types';
import { useApp } from '../app';
import type { JobSlotProps } from '../slots';

const MAX_EDGE = 1600;

/** Shrink a camera photo so a job with many photos does not fill the device. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 600_000) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.82));
    return blob ?? file;
  } catch {
    return file;
  }
}

export function Photos({ job, save }: JobSlotProps) {
  const { db } = useApp();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [viewing, setViewing] = useState<PhotoRef | null>(null);
  const ids = job.photos.map((p) => p.id).join(',');

  useEffect(() => {
    let live = true;
    const made: string[] = [];
    void (async () => {
      const next: Record<string, string> = {};
      for (const p of job.photos) {
        const blob = await db.getPhoto(p.id);
        if (blob) made.push((next[p.id] = URL.createObjectURL(blob)));
      }
      if (live) setUrls(next);
    })();
    return () => {
      live = false;
      made.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [ids]);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    const refs: PhotoRef[] = [];
    for (const file of Array.from(files)) {
      const ref = { id: uid(), name: file.name || 'Photo', addedAt: new Date().toISOString() };
      await db.putPhoto(ref.id, await shrink(file));
      refs.push(ref);
    }
    await save({ ...job, photos: [...job.photos, ...refs] });
  };
  const remove = async (p: PhotoRef) => {
    if (!confirm('Remove this photo?')) return;
    setViewing(null);
    await db.deletePhoto(p.id);
    await save({ ...job, photos: job.photos.filter((x) => x.id !== p.id) });
  };

  return (
    <section>
      <h2>Photos</h2>
      <p class="help">For reference only. Photos are never measured and do not print on the quote.</p>
      <div class="photos">
        {job.photos.map((p, i) => (
          <button key={p.id} class="photo" onClick={() => setViewing(p)} aria-label={`Photo ${i + 1}`}>
            {urls[p.id] && <img src={urls[p.id]} alt="" />}
          </button>
        ))}
        <label class="photo add">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const input = e.currentTarget;
              void add(input.files).then(() => (input.value = ''));
            }}
          />
          <span>+ Add photo</span>
        </label>
      </div>
      {viewing && (
        <div class="overlay dark" role="dialog" aria-modal="true" aria-label="Photo">
          <div class="overlay-body">
            {urls[viewing.id] && <img class="photo-full" src={urls[viewing.id]} alt={`Site photo, ${viewing.name}`} />}
            <div class="actions">
              <button class="btn danger" onClick={() => void remove(viewing)}>
                Remove
              </button>
              <button class="btn" onClick={() => setViewing(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
