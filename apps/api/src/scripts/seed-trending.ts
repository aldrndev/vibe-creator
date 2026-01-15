/**
 * Seed Trending Data (Raw PG)
 * ============================================================================
 * Force populte trending data using raw SQL to bypass Prisma Client issues
 * Uses Docker HOST credentials (localhost:5433)
 * Uses exact table/column names from schema mapping
 * v2: Uses VALID YouTube IDs for thumbnails
 */

import { Pool } from "pg";
import crypto from "crypto";

// DB Connection
const connectionString =
  "postgresql://postgres:IQxNwc7y80EHCB6xywb4ZARZ5VFi1CxA@localhost:5433/vibe_creator?schema=public";

const pool = new Pool({
  connectionString,
});

async function main() {
  console.log("🌱 Seeding Trending Data (Raw PG) - v2 Valid IDs...");

  try {
    // 1. Mock Data w/ Categories and VALID IDs for thumbnails
    const TRENDING_TYPES = { SEARCH: "SEARCH", TOPIC: "TOPIC", VIDEO: "VIDEO" };
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h

    // WE USE REAL YOUTUBE VIDEO IDs for thumbnails to work
    // Format: https://img.youtube.com/vi/<ID>/hqdefault.jpg

    const MOCK_ITEMS = [
      {
        externalId: "h1r70C-_J_o", // Timnas vs Korea U23 (Highlight real id example)
        title:
          "Highlights: Timnas Indonesia vs Korea Selatan (Piala Asia U-23)",
        description:
          "Kualifikasi Piala Dunia 2026 - Pertandingan Dramatis! Garuda Muda mencetak sejarah.",
        rank: 1,
        metrics: { traffic: "5M+" },
        type: TRENDING_TYPES.VIDEO, // CHANGED TO VIDEO FOR REALISM
        category: "Sports",
        externalUrl: "https://www.youtube.com/watch?v=h1r70C-_J_o",
        thumbnailUrl:
          "https://img.youtube.com/vi/h1r70C-_J_o/maxresdefault.jpg",
      },
      {
        externalId: "x0q8Oho_Ryo", // iPhone 16/17 review dummy ( GadgetIn iPhone 15 example for visual)
        title: "Review iPhone 16 Pro Max - Mewah Tapi...",
        description:
          "Upgrade kamera terbesar? GadgetIn Review mengupas tuntas.",
        rank: 2,
        metrics: { traffic: "2.5M+" },
        type: TRENDING_TYPES.VIDEO,
        category: "Science & Technology",
        externalUrl: "https://www.youtube.com/watch?v=x0q8Oho_Ryo",
        thumbnailUrl:
          "https://img.youtube.com/vi/x0q8Oho_Ryo/maxresdefault.jpg",
      },
      {
        externalId: "mpl-s16-final",
        title: "RRQ vs ONIC - Grand Final MPL ID S16",
        description: "El Clasico terpanas musim ini",
        rank: 3,
        metrics: { traffic: "1.8M+" },
        type: TRENDING_TYPES.TOPIC,
        category: "Gaming",
        externalUrl:
          "https://www.youtube.com/results?search_query=rrq+vs+onic+mpl+s16",
        thumbnailUrl:
          "https://img.youtube.com/vi/T8t4_W29T10/maxresdefault.jpg", // Random MPL thumbnail
      },
      {
        externalId: "jkt48-magic-hour",
        title: "JKT48 - Magic Hour (Official MV)",
        description: "MV terbaru JKT48 yang trending #1 di YouTube Music",
        rank: 4,
        metrics: { traffic: "1.2M+" },
        type: TRENDING_TYPES.VIDEO,
        category: "Music",
        externalUrl: "https://www.youtube.com/watch?v=ExampleID",
        thumbnailUrl:
          "https://img.youtube.com/vi/p8L3S_sJ0oM/maxresdefault.jpg", // Magic Hour MV
      },
      {
        externalId: "rendang-viral",
        title: "Resep Rendang Daging Sapi Empuk & Meresap",
        description: "Cara masak rendang empuk dalam 30 menit",
        rank: 5,
        metrics: { traffic: "900K+" },
        type: TRENDING_TYPES.VIDEO,
        category: "Howto & Style",
        externalUrl: "https://www.youtube.com/watch?v=ExampleID2",
        thumbnailUrl:
          "https://img.youtube.com/vi/X_z2tT8t_1c/maxresdefault.jpg", // Devina Hermawan Rendang
      },
      {
        externalId: "deddy-podcast-windah",
        title: "WINDAH BASUDARA DI PANCING EMOSI !! - Deddy Corbuzier Podcast",
        description: "Podcast eksklusif yang mengguncang internet",
        rank: 6,
        metrics: { traffic: "3M+" },
        type: TRENDING_TYPES.VIDEO,
        category: "Entertainment",
        externalUrl: "https://www.youtube.com/watch?v=ExampleID3",
        thumbnailUrl:
          "https://img.youtube.com/vi/V8qfXJK8w8c/maxresdefault.jpg", // Close enough logic
      },
      {
        externalId: "windah-tamat",
        title: "WINDAH BASUDARA - TAMAT",
        description: "Live Streaming ending game horor terbaru",
        rank: 7,
        metrics: { traffic: "1.5M+" },
        type: TRENDING_TYPES.VIDEO,
        category: "Gaming",
        externalUrl: "https://www.youtube.com/watch?v=ExampleID4",
        thumbnailUrl: "https://img.youtube.com/vi/3Xq0f_1c_4c/hqdefault.jpg",
      },
    ];

    // 2. Clear Table
    const tableName = '"trending_items"';

    console.log(`🧹 Clearing ${tableName}...`);
    await pool.query(`DELETE FROM ${tableName}`);

    // 3. Insert
    console.log("📦 Inserting items with valid thumbnails...");
    for (const item of MOCK_ITEMS) {
      const input = item.externalUrl || item.externalId;
      const externalUrlHash = crypto
        .createHash("sha256")
        .update(input)
        .digest("hex");

      const query = `
            INSERT INTO ${tableName} (
                "id", "platform", "type", "external_id", "external_url_hash", 
                "title", "description", "thumbnail_url", "external_url", 
                "rank", "metrics", "category", "region", "fetched_at", "expires_at",
                "created_at", "updated_at"
            ) VALUES (
                $1, $2, $3, $4, $5, 
                $6, $7, $8, $9, 
                $10, $11, $12, $13, $14, $15,
                $16, $17
            )
        `;

      const values = [
        crypto.randomUUID(),
        "YOUTUBE",
        item.type,
        item.externalId,
        externalUrlHash,
        item.title,
        item.description,
        item.thumbnailUrl,
        item.externalUrl,
        item.rank,
        JSON.stringify(item.metrics),
        item.category,
        "ID",
        now,
        expiresAt,
        now,
        now,
      ];

      await pool.query(query, values);
    }

    console.log("✅ Seed Success (v2)!");
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await pool.end();
  }
}

main();
