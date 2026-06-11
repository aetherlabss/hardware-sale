import { useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const SEP = '|||';

interface SortableImageStripProps {
  /** '|||'-joined image URLs (the admin form's storage format). */
  value: string;
  onChange: (next: string) => void;
  onPreview?: (url: string) => void;
}

/**
 * Thumbnail strip for the admin product forms with reordering: drag & drop on
 * desktop, ◀/▶ arrows on touch (HTML5 DnD doesn't fire on most mobile
 * browsers). The FIRST image is the product cover (images[0] everywhere in the
 * storefront), flagged with a "Capa" badge.
 */
export function SortableImageStrip({ value, onChange, onPreview }: SortableImageStripProps) {
  const list = value.split(SEP).map((s) => s.trim()).filter(Boolean);
  const dragFrom = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= list.length || from === to) return;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next.join(SEP));
  };

  const removeAt = (i: number) => onChange(list.filter((_, idx) => idx !== i).join(SEP));

  if (list.length === 0) return null;

  return (
    <div>
      <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[132px] custom-scrollbar" style={{ scrollbarWidth: 'thin' }}>
        {list.map((img, i) => (
          <div
            key={`${img}-${i}`}
            draggable
            onDragStart={(e) => { dragFrom.current = i; e.dataTransfer.effectAllowed = 'move'; }}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOver !== i) setDragOver(i); }}
            onDragLeave={() => setDragOver((d) => (d === i ? null : d))}
            onDrop={(e) => {
              e.preventDefault();
              if (dragFrom.current != null) move(dragFrom.current, i);
              dragFrom.current = null;
              setDragOver(null);
            }}
            onDragEnd={() => { dragFrom.current = null; setDragOver(null); }}
            onClick={() => onPreview?.(img)}
            className={`relative w-14 h-14 rounded-md border bg-black/50 overflow-hidden group shrink-0 cursor-grab active:cursor-grabbing transition-all duration-200 ${
              dragOver === i ? 'border-brand-neon scale-110 shadow-[0_0_12px_rgba(168,85,247,0.5)]' : i === 0 ? 'border-brand-neon/50' : 'border-white/10'
            }`}
          >
            {i === 0 && (
              <span className="absolute top-0.5 left-0.5 z-10 bg-brand-neon text-black text-[7px] font-black uppercase tracking-wider px-1 py-px rounded pointer-events-none">Capa</span>
            )}
            <button
              type="button"
              aria-label="Remover imagem"
              onClick={(e) => { e.stopPropagation(); removeAt(i); }}
              className="absolute top-0.5 right-0.5 bg-red-500 rounded text-white z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            >
              <X size={10} />
            </button>
            {i > 0 && (
              <button
                type="button"
                aria-label="Mover para a esquerda"
                onClick={(e) => { e.stopPropagation(); move(i, i - 1); }}
                className="absolute bottom-0.5 left-0.5 z-10 w-4 h-4 flex items-center justify-center rounded bg-black/80 border border-white/20 text-white hover:bg-brand-neon hover:text-black opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
              >
                <ChevronLeft size={10} strokeWidth={3} />
              </button>
            )}
            {i < list.length - 1 && (
              <button
                type="button"
                aria-label="Mover para a direita"
                onClick={(e) => { e.stopPropagation(); move(i, i + 1); }}
                className="absolute bottom-0.5 right-0.5 z-10 w-4 h-4 flex items-center justify-center rounded bg-black/80 border border-white/20 text-white hover:bg-brand-neon hover:text-black opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
              >
                <ChevronRight size={10} strokeWidth={3} />
              </button>
            )}
            <img
              src={img}
              alt=""
              draggable={false}
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=50&q=80'; }}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            />
          </div>
        ))}
      </div>
      {list.length > 1 && (
        <p className="text-[9px] text-gray-500 mt-1.5 font-medium">Arrasta (ou usa as setas) para reordenar — a 1ª imagem é a capa do produto.</p>
      )}
    </div>
  );
}
