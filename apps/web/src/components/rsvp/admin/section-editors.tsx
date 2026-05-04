"use client";

import type {
  Activity,
  DepositInfo,
  DressBoard,
  EventContent,
  Hotel,
  NextStepsSection,
  OverviewDay,
  PaymentLink,
  PaymentPayee,
  RestaurantItem,
  RestaurantsSection,
  ScheduleRow,
  ScheduledDay,
  TravelTip,
} from "@/lib/rsvp/event-content";
import { RSVP_IMAGE_LIBRARY } from "@/lib/rsvp/form-data";

import {
  AdminField,
  AdminInput,
  AdminItemList,
  AdminSectionHeader,
  AdminTextarea,
  adminId,
} from "./fields";

type Patch<T> = (next: T) => void;

/* -------- Overview -------- */

export function OverviewEditor({
  value,
  onChange,
}: Readonly<{ value: EventContent["overview"]; onChange: Patch<EventContent["overview"]> }>) {
  const patch = (p: Partial<EventContent["overview"]>) =>
    onChange({ ...value, ...p });

  return (
    <section className="grid gap-6">
      <AdminSectionHeader
        title="Overview"
        description="Hero strip + the Day 1–6 narrative cards that appear on /rsvp/overview."
      />
      <AdminField label="Eyebrow">
        <AdminInput value={value.eyebrow} onChange={(v) => patch({ eyebrow: v })} />
      </AdminField>
      <AdminField label="Title">
        <AdminInput value={value.title} onChange={(v) => patch({ title: v })} />
      </AdminField>
      <AdminField label="Intro paragraph">
        <AdminTextarea rows={3} value={value.intro} onChange={(v) => patch({ intro: v })} />
      </AdminField>

      <div>
        <h3 className="mb-3 font-[var(--font-bebas-neue)] text-lg tracking-[0.22em] text-[var(--rsvp-pink-soft)]">
          Day cards
        </h3>
        <AdminItemList<OverviewDay>
          items={value.days}
          onItemsChange={(days) => patch({ days })}
          createItem={() => ({
            id: adminId("day"),
            label: `Day ${value.days.length + 1}`,
            dateLabel: "",
            title: "",
            body: "",
          })}
          addLabel="Add day card"
          renderItem={(item, update) => (
            <div className="grid gap-3">
              <AdminField label="Label (e.g. Day 1)">
                <AdminInput value={item.label} onChange={(v) => update({ label: v })} />
              </AdminField>
              <AdminField label="Date label">
                <AdminInput
                  value={item.dateLabel}
                  onChange={(v) => update({ dateLabel: v })}
                  placeholder="Thursday · July 30"
                />
              </AdminField>
              <AdminField label="Title">
                <AdminInput value={item.title} onChange={(v) => update({ title: v })} />
              </AdminField>
              <AdminField label="Body">
                <AdminTextarea rows={3} value={item.body} onChange={(v) => update({ body: v })} />
              </AdminField>
            </div>
          )}
        />
      </div>
    </section>
  );
}

/* -------- Hotel -------- */

export function HotelEditor({
  value,
  onChange,
}: Readonly<{ value: EventContent["hotel"]; onChange: Patch<EventContent["hotel"]> }>) {
  const patch = (p: Partial<EventContent["hotel"]>) => onChange({ ...value, ...p });

  const renderHotel = (hotel: Hotel, update: Patch<Hotel>) => (
    <div className="grid gap-3">
      <AdminField label="Name">
        <AdminInput value={hotel.name} onChange={(v) => update({ ...hotel, name: v })} />
      </AdminField>
      <AdminField label="Tagline">
        <AdminInput value={hotel.tagline} onChange={(v) => update({ ...hotel, tagline: v })} />
      </AdminField>
      <AdminField label="URL (optional)">
        <AdminInput value={hotel.url ?? ""} onChange={(v) => update({ ...hotel, url: v })} />
      </AdminField>
    </div>
  );

  return (
    <section className="grid gap-6">
      <AdminSectionHeader title="Hotel" description="What shows up on /rsvp/hotel." />
      <AdminField label="Eyebrow">
        <AdminInput value={value.eyebrow} onChange={(v) => patch({ eyebrow: v })} />
      </AdminField>
      <AdminField label="Script title (pink neon)">
        <AdminInput value={value.scriptTitle} onChange={(v) => patch({ scriptTitle: v })} />
      </AdminField>
      <AdminField label="Body">
        <AdminTextarea rows={3} value={value.body} onChange={(v) => patch({ body: v })} />
      </AdminField>
      <AdminField label="Nearby options title">
        <AdminInput
          value={value.nearbyTitle}
          onChange={(v) => patch({ nearbyTitle: v })}
        />
      </AdminField>
      <AdminField label="Nearby options body">
        <AdminTextarea
          rows={3}
          value={value.nearbyBody}
          onChange={(v) => patch({ nearbyBody: v })}
        />
      </AdminField>

      <div>
        <h3 className="mb-3 font-[var(--font-bebas-neue)] text-lg tracking-[0.22em] text-[var(--rsvp-pink-soft)]">
          Recommended
        </h3>
        <AdminItemList<Hotel>
          items={value.recommended}
          onItemsChange={(next) => patch({ recommended: next })}
          createItem={() => ({ id: adminId("hotel"), name: "", tagline: "" })}
          addLabel="Add recommended hotel"
          renderItem={(h, update) => renderHotel(h, update as Patch<Hotel>)}
        />
      </div>

      <div>
        <h3 className="mb-3 font-[var(--font-bebas-neue)] text-lg tracking-[0.22em] text-[var(--rsvp-teal)]">
          Other properties
        </h3>
        <AdminItemList<Hotel>
          items={value.other}
          onItemsChange={(next) => patch({ other: next })}
          createItem={() => ({ id: adminId("hotel"), name: "", tagline: "" })}
          addLabel="Add other hotel"
          renderItem={(h, update) => renderHotel(h, update as Patch<Hotel>)}
        />
      </div>

      <AdminField label="Closing note">
        <AdminTextarea
          rows={3}
          value={value.closing}
          onChange={(v) => patch({ closing: v })}
        />
      </AdminField>
    </section>
  );
}

/* -------- Travel tips -------- */

export function TravelTipsEditor({
  value,
  onChange,
}: Readonly<{
  value: EventContent["travelTips"];
  onChange: Patch<EventContent["travelTips"]>;
}>) {
  const patch = (p: Partial<EventContent["travelTips"]>) => onChange({ ...value, ...p });

  return (
    <section className="grid gap-6">
      <AdminSectionHeader title="Travel Tips" description="/rsvp/travel-tips cards and final callouts." />
      <AdminField label="Eyebrow">
        <AdminInput value={value.eyebrow} onChange={(v) => patch({ eyebrow: v })} />
      </AdminField>

      <AdminItemList<TravelTip>
        items={value.tips}
        onItemsChange={(tips) => patch({ tips })}
        createItem={() => ({ id: adminId("tip"), label: "", body: "" })}
        addLabel="Add travel tip"
        renderItem={(tip, update) => (
          <div className="grid gap-3">
            <AdminField label="Label (e.g. WEATHER)">
              <AdminInput value={tip.label} onChange={(v) => update({ ...tip, label: v })} />
            </AdminField>
            <AdminField label="Body">
              <AdminTextarea rows={3} value={tip.body} onChange={(v) => update({ ...tip, body: v })} />
            </AdminField>
          </div>
        )}
      />

      <AdminField label="Mandatory callout">
        <AdminTextarea
          rows={2}
          value={value.mandatoryTip}
          onChange={(v) => patch({ mandatoryTip: v })}
        />
      </AdminField>
      <AdminField label="Find-Dallas note">
        <AdminTextarea
          rows={2}
          value={value.findDallasNote}
          onChange={(v) => patch({ findDallasNote: v })}
        />
      </AdminField>
    </section>
  );
}

/* -------- Schedule days -------- */

export function ScheduleEditor({
  value,
  dressBoards,
  onChange,
}: Readonly<{
  value: EventContent["schedule"];
  dressBoards: EventContent["dressBoards"];
  onChange: Patch<EventContent["schedule"]>;
}>) {
  return (
    <section className="grid gap-6">
      <AdminSectionHeader
        title="Daily Schedules"
        description="/rsvp/day/[dayId] — one card per trip day with the schedule rows."
      />
      <AdminItemList<ScheduledDay>
        items={value.days}
        onItemsChange={(days) => onChange({ days })}
        createItem={() => ({
          id: adminId("day"),
          dayLabel: `Day ${value.days.length + 1}`,
          dayName: "",
          headline: "",
          intro: "",
          rows: [],
          tipTitle: "Travel Tip | Dress Code",
          tipBody: "",
        })}
        addLabel="Add day"
        renderItem={(day, update) => (
          <div className="grid gap-3">
            {/* Header photo + title group — sits at the top because this is
                exactly how the guest page shows them (photo with day label &
                name overlaid). */}
            <div className="rounded-2xl border border-[var(--rsvp-pink)]/25 bg-[rgba(255,61,154,0.05)] p-4">
              <p className="mb-3 font-[var(--font-bebas-neue)] text-sm tracking-[0.22em] text-[var(--rsvp-pink-soft)]">
                Header photo &amp; title
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <AdminField label="Day label">
                  <AdminInput
                    value={day.dayLabel}
                    onChange={(v) => update({ ...day, dayLabel: v })}
                  />
                </AdminField>
                <AdminField label="Day name">
                  <AdminInput
                    value={day.dayName}
                    onChange={(v) => update({ ...day, dayName: v })}
                  />
                </AdminField>
              </div>
              <div className="mt-3">
                <ImagePickerField
                  label="Header photo (appears above the schedule)"
                  value={day.heroImageUrl}
                  onChange={(url) => update({ ...day, heroImageUrl: url })}
                />
              </div>
              {day.heroImageUrl ? (
                <div className="mt-3">
                  <AdminField label="Header photo alt text (for screen readers)">
                    <AdminInput
                      value={day.heroImageAlt ?? ""}
                      onChange={(v) => update({ ...day, heroImageAlt: v })}
                    />
                  </AdminField>
                </div>
              ) : null}
            </div>

            <AdminField label="URL slug (lowercase, e.g. thursday)">
              <AdminInput value={day.id} onChange={(v) => update({ ...day, id: v })} />
            </AdminField>
            <AdminField label="Headline">
              <AdminInput value={day.headline} onChange={(v) => update({ ...day, headline: v })} />
            </AdminField>
            <AdminField label="Intro">
              <AdminTextarea rows={3} value={day.intro} onChange={(v) => update({ ...day, intro: v })} />
            </AdminField>

            <div>
              <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[var(--rsvp-ink-dim)]">
                Schedule rows
              </p>
              <AdminItemList<ScheduleRow>
                items={day.rows}
                onItemsChange={(rows) => update({ ...day, rows })}
                createItem={() => ({ id: adminId("row"), time: "", title: "" })}
                addLabel="Add row"
                renderItem={(row, updateRow) => (
                  <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                    <AdminField label="Time">
                      <AdminInput value={row.time} onChange={(v) => updateRow({ ...row, time: v })} />
                    </AdminField>
                    <AdminField label="Title">
                      <AdminInput value={row.title} onChange={(v) => updateRow({ ...row, title: v })} />
                    </AdminField>
                    <AdminField label="Note (optional)">
                      <AdminInput value={row.note ?? ""} onChange={(v) => updateRow({ ...row, note: v })} />
                    </AdminField>
                  </div>
                )}
              />
            </div>

            <AdminField label="Tip title">
              <AdminInput value={day.tipTitle} onChange={(v) => update({ ...day, tipTitle: v })} />
            </AdminField>
            <AdminField label="Tip body">
              <AdminTextarea
                rows={3}
                value={day.tipBody}
                onChange={(v) => update({ ...day, tipBody: v })}
              />
            </AdminField>

            <AdminField label="Dress board">
              <select
                className="rsvp-select"
                value={day.dressBoardId ?? ""}
                onChange={(e) =>
                  update({ ...day, dressBoardId: e.target.value || undefined })
                }
              >
                <option value="">— None —</option>
                {dressBoards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.eyebrow} — {b.title}
                  </option>
                ))}
              </select>
            </AdminField>
          </div>
        )}
      />
    </section>
  );
}

/* -------- Dress boards -------- */

export function DressBoardsEditor({
  value,
  onChange,
}: Readonly<{ value: DressBoard[]; onChange: Patch<DressBoard[]> }>) {
  return (
    <section className="grid gap-6">
      <AdminSectionHeader
        title="Dress Boards"
        description="Shown beneath Friday (Sinner Inspo) and Sunday (Last Supper Inspo)."
      />
      <AdminItemList<DressBoard>
        items={value}
        onItemsChange={onChange}
        createItem={() => ({
          id: adminId("board"),
          eyebrow: "",
          title: "",
          think: [],
          beatTheHeat: [],
        })}
        addLabel="Add dress board"
        renderItem={(board, update) => (
          <div className="grid gap-3">
            <AdminField label="Board ID (stable key)">
              <AdminInput value={board.id} onChange={(v) => update({ ...board, id: v })} />
            </AdminField>
            <AdminField label="Eyebrow">
              <AdminInput value={board.eyebrow} onChange={(v) => update({ ...board, eyebrow: v })} />
            </AdminField>
            <AdminField label="Title">
              <AdminInput value={board.title} onChange={(v) => update({ ...board, title: v })} />
            </AdminField>
            <AdminField label="Callout (optional)">
              <AdminTextarea
                rows={2}
                value={board.callout ?? ""}
                onChange={(v) => update({ ...board, callout: v })}
              />
            </AdminField>
            <AdminField label="Think — one per line">
              <AdminTextarea
                rows={6}
                value={board.think.join("\n")}
                onChange={(v) =>
                  update({ ...board, think: v.split("\n").map((s) => s.trim()).filter(Boolean) })
                }
              />
            </AdminField>
            <AdminField label="Beat the heat — one per line">
              <AdminTextarea
                rows={5}
                value={board.beatTheHeat.join("\n")}
                onChange={(v) =>
                  update({
                    ...board,
                    beatTheHeat: v.split("\n").map((s) => s.trim()).filter(Boolean),
                  })
                }
              />
            </AdminField>
          </div>
        )}
      />
    </section>
  );
}

/* -------- Activities -------- */

export function ActivitiesEditor({
  value,
  onChange,
}: Readonly<{
  value: EventContent["activities"];
  onChange: Patch<EventContent["activities"]>;
}>) {
  const patch = (p: Partial<EventContent["activities"]>) => onChange({ ...value, ...p });

  return (
    <section className="grid gap-6">
      <AdminSectionHeader title="Activities & Shows" description="/rsvp/activities cards." />
      <AdminField label="Eyebrow">
        <AdminInput value={value.eyebrow} onChange={(v) => patch({ eyebrow: v })} />
      </AdminField>
      <AdminField label="Intro">
        <AdminTextarea rows={3} value={value.intro} onChange={(v) => patch({ intro: v })} />
      </AdminField>
      <AdminItemList<Activity>
        items={value.items}
        onItemsChange={(items) => patch({ items })}
        createItem={() => ({
          id: adminId("activity"),
          dayLabel: "",
          dayDate: "",
          name: "",
          time: "",
          venue: "",
          priceLabel: "",
          description: "",
          icon: "🎟",
        })}
        addLabel="Add activity"
        renderItem={(a, update) => (
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Day label">
                <AdminInput value={a.dayLabel} onChange={(v) => update({ ...a, dayLabel: v })} />
              </AdminField>
              <AdminField label="Day date">
                <AdminInput value={a.dayDate} onChange={(v) => update({ ...a, dayDate: v })} />
              </AdminField>
            </div>
            <AdminField label="Name">
              <AdminInput value={a.name} onChange={(v) => update({ ...a, name: v })} />
            </AdminField>
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Time">
                <AdminInput value={a.time} onChange={(v) => update({ ...a, time: v })} />
              </AdminField>
              <AdminField label="Venue">
                <AdminInput value={a.venue} onChange={(v) => update({ ...a, venue: v })} />
              </AdminField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Price per person (numeric)">
                <AdminInput
                  type="number"
                  value={a.pricePerPerson ?? ""}
                  onChange={(v) =>
                    update({
                      ...a,
                      pricePerPerson: v === "" ? undefined : Number(v),
                    })
                  }
                />
              </AdminField>
              <AdminField label="Price label (human)">
                <AdminInput value={a.priceLabel} onChange={(v) => update({ ...a, priceLabel: v })} />
              </AdminField>
            </div>
            <AdminField label="Description">
              <AdminTextarea rows={3} value={a.description} onChange={(v) => update({ ...a, description: v })} />
            </AdminField>

            {/* Header photo picker — overrides the emoji icon when set. */}
            <div className="rounded-2xl border border-[var(--rsvp-teal)]/25 bg-[rgba(77,225,255,0.05)] p-4">
              <p className="mb-3 font-[var(--font-bebas-neue)] text-sm tracking-[0.22em] text-[var(--rsvp-teal)]">
                Header photo
              </p>
              <ImagePickerField
                label="Card image (overrides the emoji when set)"
                value={a.imageUrl}
                onChange={(url) => update({ ...a, imageUrl: url })}
              />
              {a.imageUrl ? (
                <div className="mt-3">
                  <AdminField label="Image alt text (for screen readers)">
                    <AdminInput
                      value={a.imageAlt ?? ""}
                      onChange={(v) => update({ ...a, imageAlt: v })}
                    />
                  </AdminField>
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Icon (emoji — fallback when no image set)">
                <AdminInput value={a.icon} onChange={(v) => update({ ...a, icon: v })} />
              </AdminField>
              <AdminField label="Deposits due by">
                <AdminInput
                  value={a.depositsDueBy ?? ""}
                  onChange={(v) => update({ ...a, depositsDueBy: v || undefined })}
                />
              </AdminField>
            </div>
            <AdminField label="RSVP question slug (links to a wizard question)">
              <AdminInput
                value={a.rsvpQuestionSlug ?? ""}
                onChange={(v) =>
                  update({ ...a, rsvpQuestionSlug: v || undefined })
                }
              />
            </AdminField>
            <AdminField label="Options — one per line (used for multi-option activities)">
              <AdminTextarea
                rows={3}
                value={(a.options ?? []).join("\n")}
                onChange={(v) =>
                  update({
                    ...a,
                    options: v
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </AdminField>
          </div>
        )}
      />
      <AdminField label="Closing note">
        <AdminTextarea
          rows={2}
          value={value.closingNote}
          onChange={(v) => patch({ closingNote: v })}
        />
      </AdminField>
    </section>
  );
}

/* -------- Restaurants -------- */

export function RestaurantsEditor({
  value,
  onChange,
}: Readonly<{
  value: EventContent["restaurants"];
  onChange: Patch<EventContent["restaurants"]>;
}>) {
  const patch = (p: Partial<RestaurantsSection & { eyebrow: string; intro: string }>) =>
    onChange({ ...value, ...p });

  const renderRow = (r: RestaurantItem, update: Patch<RestaurantItem>) => (
    <div className="grid gap-3">
      <AdminField label="Day label">
        <AdminInput value={r.dayLabel} onChange={(v) => update({ ...r, dayLabel: v })} />
      </AdminField>
      <AdminField label="Name">
        <AdminInput value={r.name} onChange={(v) => update({ ...r, name: v })} />
      </AdminField>
      <div className="grid gap-3 sm:grid-cols-2">
        <AdminField label="Venue">
          <AdminInput value={r.venue} onChange={(v) => update({ ...r, venue: v })} />
        </AdminField>
        <AdminField label="Time">
          <AdminInput value={r.time} onChange={(v) => update({ ...r, time: v })} />
        </AdminField>
      </div>
      <AdminField label="Price range">
        <AdminInput value={r.priceRange} onChange={(v) => update({ ...r, priceRange: v })} />
      </AdminField>
      <AdminField label="Theme (optional)">
        <AdminInput
          value={r.theme ?? ""}
          onChange={(v) => update({ ...r, theme: v || undefined })}
        />
      </AdminField>
      <AdminField label="RSVP question slug">
        <AdminInput
          value={r.rsvpQuestionSlug ?? ""}
          onChange={(v) => update({ ...r, rsvpQuestionSlug: v || undefined })}
        />
      </AdminField>

      {/* Header photo */}
      <div className="rounded-2xl border border-[var(--rsvp-teal)]/25 bg-[rgba(77,225,255,0.05)] p-3">
        <p className="mb-3 font-[var(--font-bebas-neue)] text-sm tracking-[0.22em] text-[var(--rsvp-teal)]">
          Header photo
        </p>
        <ImagePickerField
          label="Card image"
          value={r.imageUrl}
          onChange={(url) => update({ ...r, imageUrl: url })}
        />
        {r.imageUrl ? (
          <div className="mt-3">
            <AdminField label="Image alt text">
              <AdminInput
                value={r.imageAlt ?? ""}
                onChange={(v) => update({ ...r, imageAlt: v })}
              />
            </AdminField>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <section className="grid gap-6">
      <AdminSectionHeader title="Restaurants" description="/rsvp/restaurants brunch + dinner lists." />
      <AdminField label="Eyebrow">
        <AdminInput value={value.eyebrow} onChange={(v) => patch({ eyebrow: v })} />
      </AdminField>
      <AdminField label="Intro">
        <AdminTextarea rows={3} value={value.intro} onChange={(v) => patch({ intro: v })} />
      </AdminField>

      <div>
        <h3 className="mb-3 font-[var(--font-bebas-neue)] text-lg tracking-[0.22em] text-[var(--rsvp-teal)]">
          Brunch
        </h3>
        <AdminItemList<RestaurantItem>
          items={value.brunch}
          onItemsChange={(brunch) => patch({ brunch })}
          createItem={() => ({
            id: adminId("brunch"),
            dayLabel: "",
            name: "",
            venue: "",
            time: "",
            priceRange: "",
          })}
          addLabel="Add brunch"
          renderItem={(r, update) => renderRow(r, update as Patch<RestaurantItem>)}
        />
      </div>

      <div>
        <h3 className="mb-3 font-[var(--font-bebas-neue)] text-lg tracking-[0.22em] text-[var(--rsvp-pink-soft)]">
          Dinner
        </h3>
        <AdminItemList<RestaurantItem>
          items={value.dinner}
          onItemsChange={(dinner) => patch({ dinner })}
          createItem={() => ({
            id: adminId("dinner"),
            dayLabel: "",
            name: "",
            venue: "",
            time: "",
            priceRange: "",
          })}
          addLabel="Add dinner"
          renderItem={(r, update) => renderRow(r, update as Patch<RestaurantItem>)}
        />
      </div>

      <AdminField label="Footer note">
        <AdminTextarea rows={2} value={value.note} onChange={(v) => patch({ note: v })} />
      </AdminField>
    </section>
  );
}

/* -------- Deposits -------- */

export function DepositsEditor({
  value,
  onChange,
}: Readonly<{ value: DepositInfo; onChange: Patch<DepositInfo> }>) {
  const patch = (p: Partial<DepositInfo>) => onChange({ ...value, ...p });

  return (
    <section className="grid gap-6">
      <AdminSectionHeader title="Deposits & Payment Info" description="/rsvp/deposits deadline + payee handles." />
      <AdminField label="Due date (display text)">
        <AdminInput value={value.dueDate} onChange={(v) => patch({ dueDate: v })} />
      </AdminField>
      <AdminField label="Why RSVP title">
        <AdminInput value={value.whyTitle} onChange={(v) => patch({ whyTitle: v })} />
      </AdminField>
      <AdminField label="Why RSVP body">
        <AdminTextarea rows={3} value={value.whyBody} onChange={(v) => patch({ whyBody: v })} />
      </AdminField>
      <AdminField label="Payment info title">
        <AdminInput value={value.paymentTitle} onChange={(v) => patch({ paymentTitle: v })} />
      </AdminField>
      <AdminField label="Payment info body">
        <AdminTextarea rows={3} value={value.paymentBody} onChange={(v) => patch({ paymentBody: v })} />
      </AdminField>

      <div>
        <h3 className="mb-3 font-[var(--font-bebas-neue)] text-lg tracking-[0.22em] text-[var(--rsvp-pink-soft)]">
          Payees
        </h3>
        <AdminItemList<DepositInfo["payees"][number]>
          items={value.payees}
          onItemsChange={(payees) => patch({ payees })}
          createItem={() => ({
            id: adminId("payee") as PaymentPayee,
            name: "",
            paymentLinks: [],
          })}
          addLabel="Add payee"
          renderItem={(payee, update) => (
            <div className="grid gap-3">
              <AdminField label="Name">
                <AdminInput value={payee.name} onChange={(v) => update({ ...payee, name: v })} />
              </AdminField>
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[var(--rsvp-ink-dim)]">
                Payment links
              </p>
              <AdminItemList<PaymentLink & { id: string }>
                items={payee.paymentLinks.map((l, idx) => ({
                  ...l,
                  id: `${payee.id}-${idx}`,
                }))}
                onItemsChange={(next) =>
                  update({
                    ...payee,
                    paymentLinks: next.map((n) => ({
                      payee: payee.id,
                      label: n.label,
                      url: n.url,
                    })),
                  })
                }
                createItem={() => ({
                  payee: payee.id,
                  label: "",
                  url: "",
                  id: adminId("link"),
                })}
                addLabel="Add payment link"
                renderItem={(link, updateLink) => (
                  <div className="grid gap-3">
                    <AdminField label="Label (e.g. Venmo @scott)">
                      <AdminInput
                        value={link.label}
                        onChange={(v) => updateLink({ ...link, label: v })}
                      />
                    </AdminField>
                    <AdminField label="URL (venmo://, https://paypal.me/..., mailto:)">
                      <AdminInput
                        value={link.url}
                        onChange={(v) => updateLink({ ...link, url: v })}
                      />
                    </AdminField>
                  </div>
                )}
              />
            </div>
          )}
        />
      </div>

      <AdminField label="Closing callout">
        <AdminTextarea
          rows={2}
          value={value.closingCallout}
          onChange={(v) => patch({ closingCallout: v })}
        />
      </AdminField>
    </section>
  );
}

/* -------- Next Steps -------- */

export function NextStepsEditor({
  value,
  onChange,
}: Readonly<{ value: NextStepsSection; onChange: Patch<NextStepsSection> }>) {
  const patch = (p: Partial<NextStepsSection>) => onChange({ ...value, ...p });
  return (
    <section className="grid gap-6">
      <AdminSectionHeader title="Next Steps" description="Footer teaser block." />
      <AdminField label="Headline">
        <AdminInput value={value.headline} onChange={(v) => patch({ headline: v })} />
      </AdminField>
      <AdminField label="CTA text">
        <AdminInput value={value.cta} onChange={(v) => patch({ cta: v })} />
      </AdminField>
      <AdminField label="Body">
        <AdminTextarea rows={3} value={value.body} onChange={(v) => patch({ body: v })} />
      </AdminField>
    </section>
  );
}

/* -------- Image picker helper used by schedule/editor -------- */

function ImagePickerField({
  label,
  value,
  onChange,
}: Readonly<{
  label: string;
  value: string | undefined;
  onChange: (url: string | undefined) => void;
}>) {
  return (
    <AdminField label={label}>
      <div className="grid gap-3">
        {value ? (
          <div className="overflow-hidden rounded-xl border border-[var(--rsvp-border-soft)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="h-32 w-full object-cover" />
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className={`rounded-xl border px-2 py-3 text-xs font-semibold uppercase tracking-[0.15em] transition ${
              !value
                ? "border-[var(--rsvp-pink)] bg-[var(--rsvp-pink)]/10 text-[var(--rsvp-pink-soft)]"
                : "border-[var(--rsvp-border-soft)] bg-black/30 text-[var(--rsvp-ink-dim)] hover:border-[var(--rsvp-border)]"
            }`}
          >
            None
          </button>
          {RSVP_IMAGE_LIBRARY.map((asset) => {
            const active = value === asset.url;
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => onChange(asset.url)}
                className={`group flex flex-col overflow-hidden rounded-xl border text-left transition ${
                  active
                    ? "border-[var(--rsvp-pink)] shadow-[0_0_18px_rgba(255,61,154,0.35)]"
                    : "border-[var(--rsvp-border-soft)] hover:border-[var(--rsvp-teal)]/60"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={asset.url}
                  alt={asset.label}
                  className="h-16 w-full object-cover"
                />
                <span className="px-2 py-1 text-[0.6rem] font-mono uppercase tracking-[0.15em] text-[var(--rsvp-ink-dim)] group-hover:text-[var(--rsvp-ink)]">
                  {asset.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </AdminField>
  );
}
