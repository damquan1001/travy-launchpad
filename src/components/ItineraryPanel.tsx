import { useEffect, useRef, useState } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Flag, GripVertical, MapPin, Plus, Save, Sparkles, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlacePicker } from "./PlacePicker";
import { t } from "@/lib/i18n";
import { useLocale } from "@/hooks/use-locale";
import type { Itinerary, ItineraryDay, ItineraryPlace } from "@/lib/itinerary";

type Props = {
  itinerary: Itinerary | null;
  onChange?: (it: Itinerary) => void;
  onSave?: () => void;
  saving?: boolean;
  saved?: boolean;
  onFlag?: (placeName: string) => void;
};

export function ItineraryPanel({ itinerary, onChange, onSave, saving, saved, onFlag }: Props) {
  const [locale] = useLocale();
  const tr = t(locale);
  const editable = !!onChange;

  if (!itinerary || !itinerary.days?.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        <Sparkles className="h-8 w-8 text-lacquer/40" />
        <h2 className="font-display text-2xl">{tr.itineraryEmpty.title}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">{tr.itineraryEmpty.body}</p>
      </div>
    );
  }

  const update = (patch: Partial<Itinerary>) => onChange?.({ ...itinerary, ...patch });
  const updateDays = (days: ItineraryDay[]) => update({ days });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
        <div className="min-w-0 flex-1">
          {editable ? (
            <InlineText
              value={itinerary.title || itinerary.destination}
              onChange={(v) => update({ title: v })}
              className="font-display text-2xl leading-tight"
              placeholder="Trip title"
            />
          ) : (
            <h2 className="font-display text-2xl leading-tight">{itinerary.title || itinerary.destination}</h2>
          )}
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {itinerary.destination}
            {itinerary.party && <span>· {itinerary.party}</span>}
            {itinerary.budget_usd != null && <span>· ~${itinerary.budget_usd}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editable && saving && <span className="text-xs text-muted-foreground">Saving…</span>}
          {editable && !saving && saved && <span className="text-xs text-muted-foreground">Saved</span>}
          {onSave && (
            <Button size="sm" variant={saved ? "secondary" : "default"} disabled={saving} onClick={onSave}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {saved ? tr.saved : tr.saveTrip}
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {itinerary.summary && (
          <p className="mb-6 border-l-2 border-lacquer pl-3 font-display text-base italic text-foreground/80">
            {itinerary.summary}
          </p>
        )}

        <DaysList
          days={itinerary.days}
          editable={editable}
          tr={tr}
          province={itinerary.destination}
          onFlag={onFlag}
          onDaysChange={updateDays}
        />

        {editable && (
          <div className="mt-6 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const nextDay = (itinerary.days.at(-1)?.day ?? 0) + 1;
                updateDays([...itinerary.days, { day: nextDay, title: `Day ${nextDay}`, places: [] }]);
              }}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add day
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function DaysList({
  days, editable, tr, province, onFlag, onDaysChange,
}: {
  days: ItineraryDay[];
  editable: boolean;
  tr: ReturnType<typeof t>;
  province?: string;
  onFlag?: (name: string) => void;
  onDaysChange: (days: ItineraryDay[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = days.findIndex((d) => String(d.day) === String(active.id));
    const newIdx = days.findIndex((d) => String(d.day) === String(over.id));
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(days, oldIdx, newIdx).map((d, i) => ({ ...d, day: i + 1 }));
    onDaysChange(reordered);
  };

  const updateDay = (index: number, patch: Partial<ItineraryDay>) => {
    const next = days.map((d, i) => (i === index ? { ...d, ...patch } : d));
    onDaysChange(next);
  };

  const removeDay = (index: number) => {
    const next = days.filter((_, i) => i !== index).map((d, i) => ({ ...d, day: i + 1 }));
    onDaysChange(next);
  };

  if (!editable) {
    return (
      <ol className="space-y-7">
        {days.map((d, i) => (
          <DayBlock
            key={i}
            day={d}
            editable={false}
            tr={tr}
            province={province}
            onFlag={onFlag}
            onUpdate={() => {}}
            onRemove={() => {}}
          />
        ))}
      </ol>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={days.map((d) => String(d.day))} strategy={verticalListSortingStrategy}>
        <ol className="space-y-7">
          {days.map((d, i) => (
            <SortableDay key={d.day} id={String(d.day)}>
              <DayBlock
                day={d}
                editable
                tr={tr}
                province={province}
                onFlag={onFlag}
                onUpdate={(patch) => updateDay(i, patch)}
                onRemove={() => removeDay(i)}
              />
            </SortableDay>
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableDay({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <li ref={setNodeRef} style={style} className="animate-reveal">
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Drag day"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </li>
  );
}

function DayBlock({
  day, editable, tr, province, onFlag, onUpdate, onRemove,
}: {
  day: ItineraryDay;
  editable: boolean;
  tr: ReturnType<typeof t>;
  province?: string;
  onFlag?: (name: string) => void;
  onUpdate: (patch: Partial<ItineraryDay>) => void;
  onRemove: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handlePlaceDrag = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = day.places.findIndex((_, i) => `${day.day}:${i}` === active.id);
    const newIdx = day.places.findIndex((_, i) => `${day.day}:${i}` === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    onUpdate({ places: arrayMove(day.places, oldIdx, newIdx) });
  };

  const updatePlace = (idx: number, patch: Partial<ItineraryPlace>) => {
    onUpdate({ places: day.places.map((p, i) => (i === idx ? { ...p, ...patch } : p)) });
  };
  const removePlace = (idx: number) => onUpdate({ places: day.places.filter((_, i) => i !== idx) });
  const addPlace = (p: ItineraryPlace) => onUpdate({ places: [...day.places, p] });

  return (
    <>
      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-mono text-xs uppercase tracking-widest text-lacquer">
          {tr.day} {day.day}
        </span>
        {editable ? (
          <InlineText
            value={day.title}
            onChange={(v) => onUpdate({ title: v })}
            className="flex-1 font-display text-xl"
            placeholder="Day title"
          />
        ) : (
          <h3 className="font-display text-xl">{day.title}</h3>
        )}
        {editable && (
          <button onClick={onRemove} className="text-muted-foreground hover:text-destructive" title="Remove day">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {editable ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePlaceDrag}>
          <SortableContext
            items={day.places.map((_, i) => `${day.day}:${i}`)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-3">
              {day.places.map((p, i) => (
                <SortablePlace key={`${day.day}:${i}`} id={`${day.day}:${i}`}>
                  <PlaceCard
                    place={p}
                    editable
                    tr={tr}
                    onFlag={onFlag}
                    onChange={(patch) => updatePlace(i, patch)}
                    onRemove={() => removePlace(i)}
                  />
                </SortablePlace>
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <ul className="space-y-3">
          {day.places.map((p, i) => (
            <li key={i}>
              <PlaceCard place={p} editable={false} tr={tr} onFlag={onFlag} onChange={() => {}} onRemove={() => {}} />
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <div className="mt-3">
          <Button variant="ghost" size="sm" onClick={() => setPickerOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add place
          </Button>
        </div>
      )}

      {editable && (
        <PlacePicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          province={province ?? null}
          defaultQuery={day.title}
          onPick={addPlace}
        />
      )}
    </>
  );
}

function SortablePlace({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <li ref={setNodeRef} style={style} className="flex items-start gap-2">
      <button
        {...attributes}
        {...listeners}
        className="mt-3 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Drag place"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

function PlaceCard({
  place, editable, tr, onFlag, onChange, onRemove,
}: {
  place: ItineraryPlace;
  editable: boolean;
  tr: ReturnType<typeof t>;
  onFlag?: (name: string) => void;
  onChange: (patch: Partial<ItineraryPlace>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editable ? (
            <InlineText
              value={place.name}
              onChange={(v) => onChange({ name: v })}
              className="font-medium"
              placeholder="Place name"
            />
          ) : (
            <h4 className="font-medium">
              {place.name}
              {place.name_vn && <span className="ml-2 text-sm text-muted-foreground">{place.name_vn}</span>}
            </h4>
          )}
          {editable ? (
            <InlineTextarea
              value={place.blurb}
              onChange={(v) => onChange({ blurb: v })}
              className="mt-1 text-sm text-foreground/80"
              placeholder="What makes it special…"
            />
          ) : (
            <p className="mt-1 text-sm text-foreground/80">{place.blurb}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {place.community_flag && <Badge variant="secondary" className="text-xs">{tr.communityFav}</Badge>}
          {place.source_kind === "web" && <Badge variant="outline" className="text-xs">AI</Badge>}
          {editable && (
            <button onClick={onRemove} className="text-muted-foreground hover:text-destructive" title="Remove">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          {onFlag && !editable && (
            <button
              onClick={() => onFlag(place.name)}
              className="text-xs text-muted-foreground hover:text-destructive"
              title={tr.flagInaccuracy}
            >
              <Flag className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {place.cultural_context && (
        <p className="mt-2 text-xs italic text-muted-foreground">{place.cultural_context}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {editable ? (
          <InlineMeta
            label={tr.bestTime}
            value={place.best_time ?? ""}
            onChange={(v) => onChange({ best_time: v || null })}
          />
        ) : place.best_time ? (
          <span>{tr.bestTime}: {place.best_time}</span>
        ) : null}
        {editable ? (
          <InlineMeta
            label={tr.estCost}
            value={place.est_cost_usd != null ? String(place.est_cost_usd) : ""}
            onChange={(v) => {
              const n = v.trim() === "" ? null : Number(v);
              onChange({ est_cost_usd: Number.isFinite(n as number) ? n : null });
            }}
            prefix="$"
          />
        ) : place.est_cost_usd != null ? (
          <span>{tr.estCost}: {place.est_cost_usd === 0 ? tr.free : `$${place.est_cost_usd}`}</span>
        ) : null}
        {place.transport && <span>{place.transport}</span>}
      </div>
      {editable ? (
        <div className="mt-2">
          <InlineTextarea
            value={place.tip ?? ""}
            onChange={(v) => onChange({ tip: v || null })}
            className="rounded-md bg-secondary px-3 py-2 text-xs"
            placeholder={`${tr.tip}…`}
          />
        </div>
      ) : place.tip ? (
        <p className="mt-2 rounded-md bg-secondary px-3 py-2 text-xs">
          <span className="font-mono uppercase tracking-wider text-lacquer">{tr.tip}: </span>
          {place.tip}
        </p>
      ) : null}
    </div>
  );
}

function InlineText({
  value, onChange, className, placeholder,
}: { value: string; onChange: (v: string) => void; className?: string; placeholder?: string }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { setV(value); }, [value]);
  if (editing) {
    return (
      <Input
        ref={ref}
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => { setEditing(false); if (v !== value) onChange(v); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
          if (e.key === "Escape") { setV(value); setEditing(false); }
        }}
        className={`h-auto border-dashed bg-transparent px-1 py-0.5 ${className ?? ""}`}
        placeholder={placeholder}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`block w-full cursor-text rounded text-left hover:bg-secondary/50 ${className ?? ""}`}
    >
      {value || <span className="text-muted-foreground">{placeholder}</span>}
    </button>
  );
}

function InlineTextarea({
  value, onChange, className, placeholder,
}: { value: string; onChange: (v: string) => void; className?: string; placeholder?: string }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  useEffect(() => { setV(value); }, [value]);
  if (editing) {
    return (
      <Textarea
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => { setEditing(false); if (v !== value) onChange(v); }}
        rows={2}
        className={`min-h-[60px] border-dashed bg-transparent ${className ?? ""}`}
        placeholder={placeholder}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`block w-full cursor-text rounded text-left hover:bg-secondary/50 ${className ?? ""}`}
    >
      {value || <span className="text-muted-foreground">{placeholder}</span>}
    </button>
  );
}

function InlineMeta({
  label, value, onChange, prefix,
}: { label: string; value: string; onChange: (v: string) => void; prefix?: string }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  useEffect(() => { setV(value); }, [value]);
  if (editing) {
    return (
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => { setEditing(false); if (v !== value) onChange(v); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
          if (e.key === "Escape") { setV(value); setEditing(false); }
        }}
        className="w-24 rounded border border-dashed border-border bg-transparent px-1 text-[11px]"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="rounded hover:bg-secondary/50"
    >
      {label}: {value ? (prefix ?? "") + value : <span className="opacity-60">add</span>}
    </button>
  );
}
