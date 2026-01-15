/**
 * Trending Page
 * ============================================================================
 * Displays trending videos from YouTube Official API
 * Layout: Viral Magazine (Hero -> Bento -> Billboard -> List)
 * Features: Category Filtering, Google Trends Embed
 */

import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardBody, Button, Skeleton } from "@/components/ui";
import { PageTransition } from "@/components/ui/PageTransition";
import { api } from "@/services/api";
import {
  TrendingUp,
  RefreshCw,
  XCircle,
  Copy,
  Check,
  Play,
  Wand2,
  Flame,
  Trophy,
  Medal,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useSearchParams } from "react-router-dom";

// Types
interface TrendingItem {
  id: string;
  platform: string;
  type: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  externalUrl: string | null;
  rank: number | null;
  metrics: Record<string, unknown>;
  category: string | null;
  region: string;
  fetchedAt: string;
}

interface TrendingStatus {
  platform: string;
  region: string;
  status: "ok" | "degraded" | "down";
  lastSuccessAt: string | null;
}

/**
 * Handle YouTube thumbnail fallback
 * YouTube thumbnails have multiple resolutions that may or may not exist:
 * - maxresdefault.jpg (1280x720) - Not always available
 * - hqdefault.jpg (480x360) - Usually available
 * - mqdefault.jpg (320x180) - Almost always available
 */
function handleThumbnailError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  const src = img.src;

  // Try fallback resolutions for YouTube thumbnails
  if (src.includes("img.youtube.com")) {
    if (src.includes("maxresdefault.jpg")) {
      img.src = src.replace("maxresdefault.jpg", "hqdefault.jpg");
      return;
    }
    if (src.includes("hqdefault.jpg")) {
      img.src = src.replace("hqdefault.jpg", "mqdefault.jpg");
      return;
    }
  }

  // Final fallback to placeholder
  img.src = "https://placehold.co/600x400/1a1a1a/666?text=No+Thumbnail";
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * TIER 1: HERO (#1)
 * Full width, immersive, gold accents
 */
function TrendingHero({ item }: { item: TrendingItem }) {
  const navigate = useNavigate();

  return (
    <div className="relative group overflow-hidden rounded-3xl border border-yellow-500/30 bg-card/50 shadow-2xl shadow-yellow-900/10">
      {/* Background Blur Effect */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30 blur-3xl scale-110 transform transition-transform duration-[2s]"
        style={{ backgroundImage: `url(${item.thumbnailUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />

      <div className="relative p-6 sm:p-10 flex flex-col md:flex-row gap-8 items-start md:items-end">
        {/* Cover Image */}
        <div className="w-full md:w-[480px] aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 shrink-0 relative group-hover:scale-[1.02] transition-transform duration-700 ease-out">
          <img
            src={item.thumbnailUrl || "/placeholder-image.jpg"}
            alt={item.title}
            className="w-full h-full object-cover"
            onError={handleThumbnailError}
          />
          {/* Rank Badge */}
          <div className="absolute top-4 left-4 bg-yellow-500 text-black px-3 py-1.5 rounded-lg text-sm font-extrabold flex items-center gap-2 shadow-lg shadow-yellow-500/20 z-10">
            <Trophy size={16} className="fill-black" /> #1 TRENDING
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6 pb-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {item.category && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/20 backdrop-blur-sm">
                  {item.category}
                </span>
              )}
              {Boolean(item.metrics?.traffic) && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20 backdrop-blur-sm flex items-center gap-1.5">
                  <Flame size={12} className="fill-red-500" />{" "}
                  {String(item.metrics.traffic)} Views
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-foreground leading-tight tracking-tight line-clamp-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              {item.title}
            </h2>
            <p className="text-base text-muted-foreground line-clamp-2 md:w-3/4">
              {item.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Button
              size="lg"
              className="gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold shadow-lg shadow-yellow-500/20 rounded-xl px-8"
              onClick={() =>
                navigate(`/director?topic=${encodeURIComponent(item.title)}`)
              }
            >
              <Wand2 size={18} />
              Buat Konten Ini
            </Button>
            {item.externalUrl && (
              <Button
                size="lg"
                variant="outline"
                className="gap-2 rounded-xl border-white/10 hover:bg-white/5 backdrop-blur-sm"
                asChild
              >
                <a
                  href={item.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Play size={18} /> Tonton Video
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * TIER 2: BENTO GRID (#2 - #5)
 * Grid layout for high-ranking challengers
 */
function TrendingBento({ items }: { items: TrendingItem[] }) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {items.map((item, i) => {
        const rank = item.rank ?? i + 2;
        const isSilver = rank === 2;
        const isBronze = rank === 3;

        return (
          <div
            key={item.id}
            className="group relative overflow-hidden rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-500 flex flex-col"
          >
            {/* Image */}
            <div className="relative aspect-video w-full overflow-hidden">
              <img
                src={item.thumbnailUrl || "/placeholder-image.jpg"}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                onError={handleThumbnailError}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-80" />

              {/* Rank Badge */}
              <div
                className={cn(
                  "absolute top-3 left-3 px-2.5 py-1 rounded-md text-xs font-bold border flex items-center gap-1.5 shadow-lg backdrop-blur-md",
                  isSilver
                    ? "bg-slate-200/90 text-slate-900 border-white/50"
                    : isBronze
                    ? "bg-amber-100/90 text-amber-900 border-white/50"
                    : "bg-black/60 text-white border-white/20"
                )}
              >
                {isSilver && <Medal size={12} />}
                {isBronze && <Medal size={12} />}#{rank}
              </div>
            </div>

            {/* Content Overlay/Bottom */}
            <div className="p-4 flex flex-col flex-1">
              <div className="flex-1 space-y-2">
                <h3 className="font-bold text-lg leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground/80">
                  <span className="flex items-center gap-1">
                    <Flame size={10} className="text-orange-500" />
                    {String(item.metrics?.traffic || "Rising")}
                  </span>
                  <span>•</span>
                  <span>{item.category || "General"}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/30 flex justify-between items-center opacity-80 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-primary -ml-2"
                  onClick={() =>
                    navigate(
                      `/director?topic=${encodeURIComponent(item.title)}`
                    )
                  }
                >
                  <Wand2 size={12} className="mr-1.5" /> Use Idea
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-secondary/50 hover:bg-secondary"
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * TIER 3: BILLBOARD SLIDER (#6 - #10)
 * Netflix-style horizontal scroll with giant numbers
 */
function TrendingBillboard({ items }: { items: TrendingItem[] }) {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 280; // card width + gap
      const newScrollLeft =
        scrollContainerRef.current.scrollLeft +
        (direction === "left" ? -scrollAmount : scrollAmount);
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Sparkles size={16} className="text-yellow-500" />
          Top 20 Spotlight
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground mr-2">
            Rising Fast
          </span>
          {/* Navigation Arrows */}
          <button
            onClick={() => scroll("left")}
            className="p-1.5 rounded-full bg-card border border-border hover:bg-accent transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll("right")}
            className="p-1.5 rounded-full bg-card border border-border hover:bg-accent transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Container */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto gap-4 pb-6 pt-2 px-1 -mx-1 snap-x hide-scrollbar scroll-smooth"
        >
          {items.map((item, i) => {
            const rank = item.rank ?? i + 6;
            return (
              <div
                key={item.id}
                className="snap-start shrink-0 w-[260px] relative group cursor-pointer"
                onClick={() =>
                  navigate(`/director?topic=${encodeURIComponent(item.title)}`)
                }
              >
                {/* Giant Number Gimmick - Behind the card but creating depth */}
                <div
                  className="absolute -left-4 -bottom-6 text-[120px] font-black text-transparent opacity-10 select-none z-0"
                  style={{ WebkitTextStroke: "2px rgba(255,255,255,0.2)" }}
                >
                  {rank}
                </div>

                <div className="relative z-10 rounded-xl overflow-hidden aspect-[4/5] border border-border/40 bg-card shadow-lg group-hover:-translate-y-2 transition-transform duration-300">
                  <img
                    src={item.thumbnailUrl || "/placeholder-image.jpg"}
                    alt={item.title}
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                    onError={handleThumbnailError}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="bg-primary/20 text-primary border border-primary/20 text-[10px] font-bold px-2 py-0.5 rounded w-fit mb-2 backdrop-blur-sm">
                      TOP 20
                    </div>
                    <h4 className="font-semibold text-white leading-tight line-clamp-3 mb-2 text-sm">
                      {item.title}
                    </h4>
                    <div className="flex items-center justify-between text-[10px] text-white/60">
                      <span>{String(item.metrics?.traffic)} views</span>
                      <Wand2 size={12} className="text-white/80" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * TIER 4: THE FEED (#11+)
 * Simple compact list
 */
function TrendingFeedItem({
  item,
  index,
}: {
  item: TrendingItem;
  index: number;
}) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(item.title);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group flex items-start gap-4 p-3 rounded-xl hover:bg-accent/5 transition-colors border border-transparent hover:border-border/30">
      <span className="text-lg font-bold text-muted-foreground/30 w-8 text-center shrink-0 pt-1 group-hover:text-primary transition-colors">
        {item.rank ?? index}
      </span>

      <div className="w-[100px] aspect-video rounded-lg overflow-hidden bg-muted shrink-0 relative">
        <img
          src={item.thumbnailUrl || "/placeholder-image.jpg"}
          alt={item.title}
          className="w-full h-full object-cover"
          onError={handleThumbnailError}
        />
      </div>

      <div className="flex-1 min-w-0 py-1">
        <h4
          className="font-medium text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors cursor-pointer"
          onClick={() =>
            navigate(`/director?topic=${encodeURIComponent(item.title)}`)
          }
        >
          {item.title}
        </h4>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground/70">
          <span>{item.category}</span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span className="flex items-center gap-1">
            <Flame size={10} /> {String(item.metrics?.traffic)}
          </span>
        </div>
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity px-2 self-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
          onClick={handleCopy}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
          onClick={() =>
            navigate(`/director?topic=${encodeURIComponent(item.title)}`)
          }
        >
          <Wand2 size={14} />
        </Button>
      </div>
    </div>
  );
}

function TrendingSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-[400px] w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-[200px] rounded-2xl" />
        <Skeleton className="h-[200px] rounded-2xl" />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function TrendingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") ?? "all";

  // Query for categories (always fetch ALL data to get all categories)
  const { data: allData } = useQuery({
    queryKey: ["trending", "categories"],
    queryFn: async () => {
      const params = new URLSearchParams({ region: "ID", limit: "50" });
      const response = await api.get<{
        items: TrendingItem[];
        nextCursor: string | null;
        status: TrendingStatus;
      }>(`/trending?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error?.message ?? "Failed to fetch");
      }
      return response.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour - matches data update frequency
  });

  // Extract unique categories from ALL data (not filtered)
  const uniqueCategories = Array.from(
    new Set((allData?.items ?? []).map((item) => item.category).filter(Boolean))
  ) as string[];

  // Main query for display (may be filtered)
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["trending", "display", activeCategory],
    queryFn: async () => {
      const params = new URLSearchParams({ region: "ID", limit: "50" });
      if (activeCategory !== "all") {
        params.append("category", activeCategory);
      }

      const response = await api.get<{
        items: TrendingItem[];
        nextCursor: string | null;
        status: TrendingStatus;
      }>(`/trending?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error?.message ?? "Failed to fetch");
      }

      return response.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour - matches data update frequency
  });

  const items = data?.items ?? [];
  const status = data?.status;

  // Slicing Logic for Layout Strategy
  const heroItem = items[0]; // #1
  const bentoItems = items.slice(1, 5); // #2-#5
  const billboardItems = items.slice(5, 20); // #6-#20 (expanded)
  const feedItems = items.slice(20); // #21+

  const handleCategoryChange = (catId: string) => {
    if (catId === "all") {
      searchParams.delete("category");
    } else {
      searchParams.set("category", catId);
    }
    setSearchParams(searchParams);
  };

  return (
    <PageTransition className="pb-20 lg:pb-10">
      <div className="max-w-[1000px] mx-auto space-y-8 md:space-y-12 px-4 md:px-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <TrendingUp className="text-primary" size={28} />
              Viral Magazine
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-2">
              <Sparkles size={14} className="text-yellow-500" />
              Temukan ide konten paling panas saat ini
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* Info Bar Compact (Hidden on mobile) */}
            <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border/40">
              <span className="flex items-center gap-1">Source: YouTube</span>
              <span className="w-px h-3 bg-border" />
              <div className="group relative cursor-help">
                <span className="border-b border-dashed border-muted-foreground/50">
                  Updated:{" "}
                  {status?.lastSuccessAt
                    ? new Date(status.lastSuccessAt).toLocaleTimeString(
                        "id-ID",
                        { hour: "2-digit", minute: "2-digit" }
                      )
                    : "-"}
                </span>
                <div className="absolute top-full right-0 mt-2 w-48 p-2 bg-popover text-popover-foreground text-[10px] rounded shadow-lg border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  Server refresh otomatis setiap 1 jam.
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 w-full sm:w-auto justify-center"
              onClick={() => {
                // Invalidate query to force re-read from upgraded DB
                refetch();
              }}
              disabled={isFetching}
            >
              <RefreshCw
                size={14}
                className={cn(isFetching && "animate-spin")}
              />
              <span>{isFetching ? "Syncing..." : "Update Data"}</span>
            </Button>
          </div>
        </div>

        {/* Categories - Dynamic from data */}
        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {/* All button */}
          <button
            onClick={() => handleCategoryChange("all")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
              activeCategory === "all"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <LayoutGrid size={14} />
            All
          </button>

          {/* Dynamic categories from data */}
          {uniqueCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Error State */}
        {isError && (
          <Card className="bg-red-500/5 border-red-500/20">
            <CardBody className="p-6 text-center">
              <XCircle className="mx-auto mb-3 text-red-500" size={32} />
              <p className="text-sm text-red-500 font-medium">
                Gagal memuat data trending.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => refetch()}
              >
                Coba Lagi
              </Button>
            </CardBody>
          </Card>
        )}

        {isLoading && <TrendingSkeleton />}

        {!isLoading && !isError && items.length === 0 && (
          <div className="py-20 text-center border border-dashed border-border rounded-3xl bg-muted/10">
            <h3 className="text-lg font-medium text-muted-foreground">
              Tidak ada data untuk kategori ini
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              Coba pilih kategori lain
            </p>
          </div>
        )}

        {/* MAIN LAYOUT */}
        {!isLoading && !isError && items.length > 0 && (
          <div className="space-y-12 md:space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* SECTION 1: THE KING & CHALLENGERS (#1 - #5) */}
            <section className="space-y-4">
              {heroItem && <TrendingHero item={heroItem} />}
              {bentoItems.length > 0 && <TrendingBento items={bentoItems} />}
            </section>

            {/* SECTION 2: BILLBOARD (#6 - #10) */}
            {billboardItems.length > 0 && (
              <section>
                <TrendingBillboard items={billboardItems} />
              </section>
            )}

            {/* SECTION 3: THE FEED (#11+) */}
            {feedItems.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-lg font-bold px-1 flex items-center gap-2">
                  <Flame size={16} className="text-orange-500" />
                  More Trending
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                  {feedItems.map((item, i) => (
                    <TrendingFeedItem
                      key={item.id}
                      item={item}
                      index={i + 21}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 4: RESOURCES REMOVED (Direct Integration Implemented) */}
            <div className="h-4" />
          </div>
        )}
      </div>
    </PageTransition>
  );
}
