import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BackButton, BrandHeader } from "@/components/Brand";
import { fetchLatestEvent, formatDate } from "@/lib/kas";

export const Route = createFileRoute("/acara")({
  head: () => ({
    meta: [
      { title: "Informasi Acara — MT Jam'iyyah Simthuddurar Al-Istiqomah" },
      {
        name: "description",
        content:
          "Detail lengkap acara Majelis Ta'lim & Dzikir Jam'iyyah Simthuddurar Al-Istiqomah beserta pamflet pengumuman resmi dari admin.",
      },
      { property: "og:title", content: "Informasi Acara — MT Jam'iyyah Simthuddurar Al-Istiqomah" },
      {
        property: "og:description",
        content: "Deskripsi lengkap acara dan pamflet pengumuman terbaru.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AcaraPage,
});

function AcaraPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["public-event"],
    queryFn: () => fetchLatestEvent(supabase),
  });

  return (
    <div className="min-h-screen bg-background pb-16">
      <BrandHeader subtitle="Informasi Acara" />
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <BackButton to="/" />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat informasi acara…</p>
        ) : !data ? (
          <p className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground shadow-soft">
            Belum ada informasi acara terbaru.
          </p>
        ) : (
          <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            {data.pamphlet_url ? (
              <img
                src={data.pamphlet_url}
                alt={`Pamflet acara ${data.title}`}
                className="w-full object-contain"
              />
            ) : null}
            <div className="space-y-3 px-5 py-5">
              <h2 className="text-xl leading-snug font-bold">{data.title}</h2>
              {data.event_date ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="size-4" /> {formatDate(data.event_date)}
                </p>
              ) : null}
              {data.description ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {data.description}
                </p>
              ) : null}
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
