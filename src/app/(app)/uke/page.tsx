import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/loading";
import { requireOrg } from "@/lib/auth";
import { getBillingAccount, hasAccess } from "@/lib/billing";
import { addDays, isoWeek, osloParts, planningWeek } from "@/lib/week";
import type { PostRow } from "./actions";
import { WeekPlanner, type WeekOption } from "./week-planner";

export const metadata: Metadata = { title: "Ukeplan" };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const MONTHS = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];

/** «Uke 47: 16.–22. november», eller «Uke 49: 30. november–6. desember». */
function weekLabel(start: string): string {
  const end = addDays(start, 6);
  const [, m1, d1] = start.split("-").map(Number);
  const [, m2, d2] = end.split("-").map(Number);
  const range = m1 === m2 ? `${d1}.–${d2}. ${MONTHS[m2 - 1]}` : `${d1}. ${MONTHS[m1 - 1]}–${d2}. ${MONTHS[m2 - 1]}`;
  return `Uke ${isoWeek(start)}: ${range}`;
}

export default function WeekPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ukeplan</h1>
        <p className="max-w-2xl text-ink-soft">Spott skriver ukas innlegg. Du retter det du vil, godkjenner, og publiserer.</p>
      </header>
      <Suspense fallback={<Loading />}>
        <WeekContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function WeekContent({ searchParams }: { searchParams: SearchParams }) {
  const { supabase, org } = await requireOrg();
  const { uke } = await searchParams;
  const today = osloParts(new Date()).date;

  const [billing, analysisResult, plansResult] = await Promise.all([
    getBillingAccount(supabase, org.id),
    supabase.from("brand_analyses").select("status").eq("org_id", org.id).maybeSingle(),
    supabase.from("content_plans").select("id,period_start,period_end").eq("org_id", org.id).order("period_start", { ascending: false }).limit(12),
  ]);
  const plans = plansResult.data ?? [];
  const upcoming = [...plans].reverse().find((p) => p.period_end >= today);
  const selected = plans.find((p) => p.period_start === uke) ?? upcoming ?? plans[0] ?? null;

  let posts: PostRow[] = [];
  const assetUrls: Record<string, string> = {};
  if (selected) {
    const { data } = await supabase.from("posts")
      .select("id,platform,topic,pillar,base_text,hashtags,image_idea,asset_id,status,scheduled_at,published_at")
      .eq("org_id", org.id).eq("plan_id", selected.id).order("scheduled_at", { ascending: true });
    posts = (data ?? []) as PostRow[];
    const assetIds = [...new Set(posts.map((p) => p.asset_id).filter((id): id is string => Boolean(id)))];
    if (assetIds.length) {
      const { data: assets } = await supabase.from("brand_assets").select("id,storage_path").eq("org_id", org.id).in("id", assetIds);
      const paths = (assets ?? []).map((a) => a.storage_path);
      const { data: signed } = paths.length ? await supabase.storage.from("brand-assets").createSignedUrls(paths, 3600) : { data: [] };
      const byPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
      for (const asset of assets ?? []) {
        const url = byPath.get(asset.storage_path);
        if (url) assetUrls[asset.id] = url;
      }
    }
  }

  const thisWeek = planningWeek("this");
  const nextWeek = planningWeek("next");
  const weekOptions: WeekOption[] = [
    { value: "next", label: `Neste uke (${weekLabel(nextWeek.start).replace("Uke", "uke")})`.replace(":", ","), days: nextWeek.days.length },
    { value: "this", label: thisWeek.days.length ? `Resten av denne uka (${thisWeek.days.length} ${thisWeek.days.length === 1 ? "dag" : "dager"})` : "Denne uka (ingen dager igjen)", days: thisWeek.days.length },
  ];

  return (
    <WeekPlanner
      key={selected?.id ?? "tom"}
      access={hasAccess(billing)}
      analysisStatus={analysisResult.data?.status ?? null}
      weekOptions={weekOptions}
      plans={plans.map((p) => ({ start: p.period_start, label: weekLabel(p.period_start) }))}
      selectedWeek={selected?.period_start ?? null}
      selectedLabel={selected ? weekLabel(selected.period_start) : null}
      initialPosts={posts}
      assetUrls={assetUrls}
    />
  );
}
