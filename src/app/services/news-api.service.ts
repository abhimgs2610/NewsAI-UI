import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ApiResponse,
  AskNewsRequest,
  AskNewsResponse,
  CountryCount,
  DiscoverRequest,
  DiscoverResponse,
  FeedFilters,
  NewsFeedItem,
  StoryResponse
} from '../models/news-api.model';

@Injectable({ providedIn: 'root' })
export class NewsApiService {
  private readonly baseUrl = 'http://localhost:8080/api/news';

  constructor(private readonly http: HttpClient) {}

  getFeed(filters: Partial<FeedFilters>, limit = 20, offset = 0, searchValue = false): Observable<ApiResponse<NewsFeedItem[]>> {
    let params = new HttpParams().set('limit', limit).set('offset', offset);
    params = this.addParam(params, 'q', filters.q);
    params = this.addParam(params, 'country', filters.country);
    params = this.addParam(params, 'state', filters.state);
    params = this.addParam(params, 'city', filters.city);
    params = this.addParam(params, 'category', filters.category);
    if (searchValue) {
      params = params.set('searchValue', true);
    }
    return this.http.get<ApiResponse<NewsFeedItem[]>>(`${this.baseUrl}/feed`, { params });
  }

  getHotNews(query = '', limit = 20, offset = 0): Observable<ApiResponse<NewsFeedItem[]>> {
    let params = new HttpParams().set('limit', limit).set('offset', offset);
    params = this.addParam(params, 'q', query);
    return this.http.get<ApiResponse<NewsFeedItem[]>>(`${this.baseUrl}/hot`, { params });
  }

  getCountries(): Observable<ApiResponse<CountryCount[]>> {
    return this.http.get<ApiResponse<CountryCount[]>>(`${this.baseUrl}/countries`);
  }

  getStates(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.baseUrl}/states`);
  }

  getCities(state = ''): Observable<ApiResponse<string[]>> {
    let params = new HttpParams();
    params = this.addParam(params, 'state', state);
    return this.http.get<ApiResponse<string[]>>(`${this.baseUrl}/cities`, { params });
  }

  getCategories(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.baseUrl}/categories`);
  }

  getStory(id: number, refresh = false): Observable<ApiResponse<StoryResponse>> {
    const params = new HttpParams()
      .set('language', 'ENGLISH')
      .set('style', 'genz')
      .set('refresh', refresh);
    return this.http.get<ApiResponse<StoryResponse>>(`${this.baseUrl}/${id}`, { params });
  }

  askNews(id: number, request: AskNewsRequest): Observable<ApiResponse<AskNewsResponse>> {
    return this.http.post<ApiResponse<AskNewsResponse>>(`${this.baseUrl}/${id}/ask`, request);
  }

  discover(request: DiscoverRequest): Observable<ApiResponse<DiscoverResponse>> {
    return this.http.post<ApiResponse<DiscoverResponse>>(`${this.baseUrl}/discover`, request);
  }

  private addParam(params: HttpParams, key: string, value: string | undefined | null): HttpParams {
    const cleanValue = value?.trim();
    return cleanValue ? params.set(key, cleanValue) : params;
  }
}