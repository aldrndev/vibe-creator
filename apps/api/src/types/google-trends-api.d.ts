declare module "google-trends-api" {
  interface TrendOptions {
    geo?: string;
    trendDate?: Date;
    hl?: string;
    category?: number;
  }

  interface RelatedOptions {
    keyword: string;
    geo?: string;
    hl?: string;
    category?: number;
  }

  interface InterestOptions {
    keyword: string | string[];
    geo?: string;
    hl?: string;
    startTime?: Date;
    endTime?: Date;
    category?: number;
  }

  function dailyTrends(options: TrendOptions): Promise<string>;
  function realTimeTrends(options: TrendOptions): Promise<string>;
  function relatedTopics(options: RelatedOptions): Promise<string>;
  function relatedQueries(options: RelatedOptions): Promise<string>;
  function interestOverTime(options: InterestOptions): Promise<string>;
  function interestByRegion(options: InterestOptions): Promise<string>;

  export = {
    dailyTrends,
    realTimeTrends,
    relatedTopics,
    relatedQueries,
    interestOverTime,
    interestByRegion,
  };
}
