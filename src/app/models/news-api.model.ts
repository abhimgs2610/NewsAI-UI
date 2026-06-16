export interface ApiResponse<T> {
  data: T;
  count: number;
  responseCode: number;
  responseMessage: string;
  error: boolean;
}

export interface NewsFeedItem {
  id: number;
  headline: string;
  briefStory: string;
  category: string;
  source: string;
  imageUrl: string;
  country: string;
  state: string;
  city: string;
  publishedAt: string;
}

export interface CountryCount {
  country: string;
  newsCount: number;
}

export interface StoryResponse {
  story: string;
}

export interface AskNewsRequest {
  question: string;
  language: string;
}

export interface AskNewsResponse {
  answer: string;
}

export interface DiscoverRequest {
  discoverRequestId?: string;
  context?: string;
  country?: string;
  state?: string;
  city?: string;
  loadMore: boolean;
}

export interface DiscoverResponse {
  discoverRequestId: string;
  status: string;
  message: string;
  providerQuery: string;
  results: NewsFeedItem[];
  hasMore: boolean;
  readyCount: number;
}

export interface FeedFilters {
  q: string;
  country: string;
  state: string;
  city: string;
  category: string;
}