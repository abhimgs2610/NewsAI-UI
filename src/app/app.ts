import { ChangeDetectorRef, Component, NgZone, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { DiscoverResponse, FeedFilters, NewsFeedItem } from './models/news-api.model';
import { NewsApiService } from './services/news-api.service';

interface ChatTurn {
  question: string;
  answer: string;
}

type AppView = 'home' | 'explore' | 'discover' | 'saved' | 'story' | 'audio' | 'allNews';
type ExploreType = 'state' | 'city' | 'category';

interface ExploreOption {
  type: ExploreType;
  label: string;
  caption: string;
}

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('NewsAI');

  readonly exploreOptions: ExploreOption[] = [
    { type: 'state', label: 'State', caption: 'News by state' },
    { type: 'city', label: 'City', caption: 'News by city' },
    { type: 'category', label: 'Category', caption: 'News by topic' }
  ];

  readonly topCategories = ['Top Stories', 'India', 'World', 'Politics', 'Business', 'Technology', 'Sports'];
  activeTopFilter = 'Top Stories';

  view: AppView = 'home';
  private storyBackView: AppView = 'home';
  private storyBackExploreOpen = false;
  private storyBackScrollY = 0;
  exploreOpen = false;
  activeExplore: ExploreType = 'state';
  activeDropdownOpen = false;
  dropdownSearch = '';
  allNewsTitle = 'All News';
  allNewsBackView: AppView = 'home';
  allNewsItems: NewsFeedItem[] = [];
  allNewsLoading = false;
  allNewsHasMore = false;

  private readonly allNewsPageSize = 50;
  private readonly savedStorageKey = 'newsai.savedStories';

  filters: FeedFilters = {
    q: '',
    country: '',
    state: '',
    city: '',
    category: ''
  };
  private feedGlobalSearch = false;

  feed: NewsFeedItem[] = [];
  hotNews: NewsFeedItem[] = [];
  countries: string[] = [];
  states: string[] = [];
  cities: string[] = [];
  categories: string[] = [];

  selectedArticle: NewsFeedItem | null = null;
  story = '';
  storyLoading = false;
  chatQuestion = '';
  chatTurns: ChatTurn[] = [];
  chatLoading = false;

  discoverContext = '';
  discoverCountry = '';
  discoverState = '';
  discoverCity = '';
  discoverResponse: DiscoverResponse | null = null;
  discoverResults: NewsFeedItem[] = [];
  discoverLoading = false;
  savedStories: NewsFeedItem[] = [];

  feedLoading = false;
  hotLoading = false;
  message = '';
  errorMessage = '';

  constructor(
    private readonly newsApi: NewsApiService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly zone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadSavedStories();
    window.setTimeout(() => {
      this.loadHotNews();
      this.refreshView();
    }, 0);
  }

  private loadActiveExploreOptions(): void {
    if (this.activeExplore === 'state') {
      if (this.states.length) {
        return;
      }
      this.newsApi.getStates().subscribe({
        next: response => this.zone.run(() => {
          this.states = response.data ?? [];
          this.refreshView();
        }),
        error: () => this.showError('Could not load states.')
      });
      return;
    }

    if (this.activeExplore === 'city') {
      if (this.cities.length) {
        return;
      }
      this.newsApi.getCities().subscribe({
        next: response => this.zone.run(() => {
          this.cities = response.data ?? [];
          this.refreshView();
        }),
        error: () => this.showError('Could not load cities.')
      });
      return;
    }

    if (this.categories.length) {
      return;
    }
    this.newsApi.getCategories().subscribe({
      next: response => this.zone.run(() => {
        this.categories = response.data ?? [];
        this.refreshView();
      }),
      error: () => this.showError('Could not load categories.')
    });
  }
  loadFeed(): void {
    this.feedLoading = true;
    this.newsApi.getFeed(this.filters, 20, 0, this.feedGlobalSearch)
      .pipe(finalize(() => this.zone.run(() => {
        this.feedLoading = false;
        this.refreshView();
      })))
      .subscribe({
        next: response => this.zone.run(() => {
          this.feed = response.data ?? [];
          this.refreshView();
        }),
        error: () => this.showError('Could not load feed. Check backend and CORS.')
      });
  }

  loadHotNews(): void {
    this.hotLoading = true;
    this.newsApi.getHotNews(this.filters.q, 20)
      .pipe(finalize(() => this.zone.run(() => {
        this.hotLoading = false;
        this.refreshView();
      })))
      .subscribe({
        next: response => this.zone.run(() => {
          this.hotNews = response.data ?? [];
          this.refreshView();
        }),
        error: () => this.showError('Could not load hot news.')
      });
  }

  get homeStories(): NewsFeedItem[] {
    return this.activeTopFilter === 'Top Stories' ? this.hotNews : this.feed;
  }

  get homeLoading(): boolean {
    return this.activeTopFilter === 'Top Stories' ? this.hotLoading : this.feedLoading;
  }

  get exploreStories(): NewsFeedItem[] {
    return this.hasExploreSelection ? this.feed : [];
  }

  get hasExploreSelection(): boolean {
    if (this.activeExplore === 'state') return Boolean(this.filters.state);
    if (this.activeExplore === 'city') return Boolean(this.filters.city);
    return Boolean(this.filters.category);
  }

  get allNewsStories(): NewsFeedItem[] {
    return this.allNewsItems;
  }

  get currentExploreOption(): ExploreOption {
    return this.exploreOptions.find(option => option.type === this.activeExplore) ?? this.exploreOptions[0];
  }

  get activeFilterValue(): string {
    if (this.activeExplore === 'state') return this.filters.state || 'Select State';
    if (this.activeExplore === 'city') return this.filters.city || 'Select City';
    return this.filters.category || 'Select Category';
  }

  get activeDropdownOptions(): string[] {
    if (this.activeExplore === 'state') return this.states;
    if (this.activeExplore === 'city') return this.cities;
    return this.categories;
  }

  get filteredActiveDropdownOptions(): string[] {
    const query = this.dropdownSearch.trim().toLowerCase();
    if (!query) {
      return this.activeDropdownOptions;
    }
    return this.activeDropdownOptions.filter(option => option.toLowerCase().includes(query));
  }

  closeExploreDropdown(): void {
    if (this.activeDropdownOpen) {
      this.activeDropdownOpen = false;
      this.dropdownSearch = '';
      this.refreshView();
    }
  }

  showHome(): void {
    this.view = 'home';
    this.exploreOpen = false;
    this.activeDropdownOpen = false;
    this.feedGlobalSearch = false;
    this.activeTopFilter = 'Top Stories';
    this.filters = { q: '', country: '', state: '', city: '', category: '' };
    this.feed = [];
    this.selectedArticle = null;
    this.story = '';
    this.chatTurns = [];
    this.loadHotNews();
    this.refreshView();
  }

  showSaved(): void {
    this.view = 'saved';
    this.exploreOpen = false;
    this.activeDropdownOpen = false;
    this.refreshView();
  }

  showDiscover(prefillContext = ''): void {
    this.view = 'discover';
    this.exploreOpen = false;
    this.activeDropdownOpen = false;
    this.discoverContext = prefillContext;
    this.discoverCountry = '';
    this.discoverState = '';
    this.discoverCity = '';
    this.discoverResponse = null;
    this.discoverResults = [];
    this.message = '';
    this.refreshView();
  }

  openDiscoverFromSearch(): void {
    this.showDiscover();
  }
  toggleExplore(): void {
    this.exploreOpen = !this.exploreOpen;
    if (this.exploreOpen) {
      this.view = 'explore';
      this.activeExplore = 'state';
      this.activeDropdownOpen = false;
      this.dropdownSearch = '';
      this.activeTopFilter = '';
      this.feed = [];
      this.feedLoading = false;
      this.filters = { q: this.filters.q, country: '', state: '', city: '', category: '' };
    }
    this.refreshView();
  }

  showAllNews(title: string): void {
    this.allNewsTitle = title;
    this.allNewsBackView = this.view === 'explore' ? 'explore' : 'home';
    this.view = 'allNews';
    this.exploreOpen = this.allNewsBackView === 'explore';
    this.activeDropdownOpen = false;
    this.loadAllNewsPage(true);
  }

  backFromAllNews(): void {
    this.view = this.allNewsBackView;
    this.exploreOpen = this.allNewsBackView === 'explore';
    this.activeDropdownOpen = false;
    this.refreshView();
    window.setTimeout(() => window.scrollTo({ top: this.storyBackScrollY, behavior: 'auto' }), 0);
  }

  get allNewsBackLabel(): string {
    return this.allNewsBackView === 'explore' ? 'Back Explore' : 'Back Home';
  }

  loadMoreAllNews(): void {
    if (this.allNewsLoading || !this.allNewsHasMore) {
      return;
    }
    this.loadAllNewsPage(false);
  }
  private loadAllNewsPage(reset: boolean): void {
    const offset = reset ? 0 : this.allNewsItems.length;
    this.allNewsLoading = true;
    const request = this.activeTopFilter === 'Top Stories'
      ? this.newsApi.getHotNews(this.filters.q, this.allNewsPageSize, offset)
      : this.newsApi.getFeed(this.filters, this.allNewsPageSize, offset, this.feedGlobalSearch);

    request.pipe(finalize(() => this.zone.run(() => {
      this.allNewsLoading = false;
      this.refreshView();
    }))).subscribe({
      next: response => this.zone.run(() => {
        const incoming = response.data ?? [];
        const existingIds = new Set(reset ? [] : this.allNewsItems.map(article => article.id));
        const uniqueIncoming = incoming.filter(article => !existingIds.has(article.id));
        this.allNewsItems = reset ? incoming : [...this.allNewsItems, ...uniqueIncoming];
        this.allNewsHasMore = incoming.length === this.allNewsPageSize;
        this.refreshView();
      }),
      error: () => this.showError('Could not load more news.')
    });
  }
  selectExplore(type: ExploreType): void {
    this.view = 'explore';
    this.exploreOpen = true;
    this.activeExplore = type;
    this.activeDropdownOpen = false;
    this.dropdownSearch = '';
    this.activeTopFilter = '';
    this.feed = [];
    this.feedLoading = false;
    this.filters = { q: this.filters.q, country: '', state: '', city: '', category: '' };
    this.refreshView();
  }

  openExploreDropdown(): void {
    this.activeDropdownOpen = !this.activeDropdownOpen;
    this.dropdownSearch = '';
    if (this.activeDropdownOpen) {
      this.loadActiveExploreOptions();
      window.setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>('.dropdown-search');
        input?.focus();
      }, 0);
    }
  }

  chooseDropdownValue(value: string): void {
    this.activeDropdownOpen = false;
    this.dropdownSearch = '';
    this.feedGlobalSearch = false;
    this.activeTopFilter = '';
    const cleanValue = value;
    if (!cleanValue) {
      return;
    }
    if (this.activeExplore === 'state') {
      this.filters.state = cleanValue;
      this.filters.city = '';
    } else if (this.activeExplore === 'city') {
      this.filters.city = cleanValue;
    } else {
      this.filters.category = cleanValue;
    }

    this.loadFeed();
  }

  clearSearch(): void {
    this.filters.q = '';
    this.searchHome();
  }

  searchHome(): void {
    const query = this.filters.q.trim();
    this.filters = { q: query, country: '', state: '', city: '', category: '' };
    this.view = 'home';
    this.exploreOpen = false;
    this.activeDropdownOpen = false;
    this.selectedArticle = null;
    this.story = '';
    this.chatTurns = [];

    if (!query) {
      this.feedGlobalSearch = false;
      this.activeTopFilter = 'Top Stories';
      this.loadHotNews();
      return;
    }

    this.feedGlobalSearch = true;
    this.activeTopFilter = '';
    this.loadFeed();
  }
  applyTopFilter(label: string): void {
    this.feedGlobalSearch = false;
    this.activeTopFilter = label;
    if (label === 'Top Stories') {
      const query = this.filters.q;
      this.filters = { q: query, country: '', state: '', city: '', category: '' };
      this.view = 'home';
      this.loadHotNews();
      return;
    }
    if (label === 'India') {
      this.applyCountry('India');
      return;
    }
    if (label === 'World') {
      this.applyCountry('World');
      return;
    }
    this.applyCategory(label);
  }

  applyCountry(country: string): void {
    this.feedGlobalSearch = false;
    this.activeTopFilter = country;
    const query = this.filters.q;
    this.filters = { q: query, country, state: '', city: '', category: '' };
    this.view = 'home';
    this.applyFilters();
  }

  applyCategory(category: string): void {
    this.feedGlobalSearch = false;
    this.activeTopFilter = category;
    const query = this.filters.q;
    this.filters = { q: query, country: '', state: '', city: '', category };
    this.view = 'home';
    this.applyFilters();
  }

  applyFilters(): void {
    this.selectedArticle = null;
    this.story = '';
    this.chatTurns = [];
    if (this.activeTopFilter === 'Top Stories') {
      this.loadHotNews();
    } else {
      this.loadFeed();
    }
  }

  clearFilters(returnHome = true): void {
    this.feedGlobalSearch = false;
    this.activeTopFilter = 'Top Stories';
    this.filters = { q: '', country: '', state: '', city: '', category: '' };
    if (returnHome) {
      this.view = 'home';
      this.exploreOpen = false;
    }
    this.applyFilters();
  }


  openStory(article: NewsFeedItem, refresh: boolean): void {
    if (this.view !== 'story' && this.view !== 'audio') {
      this.storyBackView = this.view;
      this.storyBackExploreOpen = this.exploreOpen;
      this.storyBackScrollY = window.scrollY;
    }
    this.selectedArticle = article;
    this.view = 'story';
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'auto' }), 0);
    this.storyLoading = true;
    this.story = '';
    this.chatTurns = [];
    this.chatQuestion = '';
    this.newsApi.getStory(article.id, refresh)
      .pipe(finalize(() => this.zone.run(() => {
        this.storyLoading = false;
        this.refreshView();
      })))
      .subscribe({
        next: response => this.zone.run(() => {
          this.story = response.data?.story ?? '';
          this.refreshView();
        }),
        error: () => this.showError('Could not generate story.')
      });
  }

  toggleSaveSelectedArticle(): void {
    if (!this.selectedArticle) {
      return;
    }
    if (this.isSaved(this.selectedArticle.id)) {
      this.savedStories = this.savedStories.filter(article => article.id !== this.selectedArticle?.id);
    } else {
      this.savedStories = [this.selectedArticle, ...this.savedStories];
    }
    this.persistSavedStories();
    this.refreshView();
  }

  isSaved(articleId: number): boolean {
    return this.savedStories.some(article => article.id === articleId);
  }

  openAudio(article?: NewsFeedItem | null): void {
    if (article) {
      this.selectedArticle = article;
      if (!this.story) {
        this.openStory(article, false);
      }
    }
    if (this.selectedArticle) {
      this.view = 'audio';
      this.refreshView();
    }
  }

  backToStories(): void {
    this.view = this.storyBackView;
    this.exploreOpen = this.storyBackExploreOpen;
    this.activeDropdownOpen = false;
    this.refreshView();
    window.setTimeout(() => window.scrollTo({ top: this.storyBackScrollY, behavior: 'auto' }), 0);
  }

  askQuestion(): void {
    const question = this.chatQuestion.trim();
    if (!this.selectedArticle || !question) {
      return;
    }
    this.chatLoading = true;
    this.newsApi.askNews(this.selectedArticle.id, { question, language: 'ENGLISH' })
      .pipe(finalize(() => this.zone.run(() => {
        this.chatLoading = false;
        this.refreshView();
      })))
      .subscribe({
        next: response => this.zone.run(() => {
          this.chatTurns = [...this.chatTurns, { question, answer: response.data?.answer ?? '' }];
          this.chatQuestion = '';
          this.refreshView();
        }),
        error: () => this.showError('Could not answer the question.')
      });
  }

  startDiscover(): void {
    const context = this.discoverContext.trim();
    if (!context) {
      this.showError('Context is mandatory to discover news.');
      return;
    }
    this.discoverLoading = true;
    this.discoverResults = [];
    this.discoverResponse = null;
    this.newsApi.discover({
      context,
      country: this.discoverCountry,
      state: this.discoverState,
      city: this.discoverCity,
      loadMore: false
    })
      .pipe(finalize(() => this.zone.run(() => {
        this.discoverLoading = false;
        this.refreshView();
      })))
      .subscribe({
        next: response => this.zone.run(() => {
          this.discoverResponse = response.data;
          this.discoverResults = response.data?.results ?? [];
          this.message = response.responseMessage;
          this.refreshView();
        }),
        error: () => this.showError('Could not discover news.')
      });
  }

  loadMoreDiscover(): void {
    if (!this.discoverResponse?.discoverRequestId) {
      return;
    }
    this.discoverLoading = true;
    this.newsApi.discover({
      discoverRequestId: this.discoverResponse.discoverRequestId,
      loadMore: true
    })
      .pipe(finalize(() => this.zone.run(() => {
        this.discoverLoading = false;
        this.refreshView();
      })))
      .subscribe({
        next: response => this.zone.run(() => {
          this.discoverResponse = response.data;
          this.discoverResults = [...this.discoverResults, ...(response.data?.results ?? [])];
          this.message = response.responseMessage;
          this.refreshView();
        }),
        error: () => this.showError('Could not load more discover results.')
      });
  }

  pickCountry(country: string): void {
    this.applyCountry(country);
  }

  trackByArticleId(_: number, article: NewsFeedItem): number {
    return article.id;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private loadSavedStories(): void {
    try {
      const raw = localStorage.getItem(this.savedStorageKey);
      this.savedStories = raw ? JSON.parse(raw) as NewsFeedItem[] : [];
    } catch {
      this.savedStories = [];
    }
  }

  private persistSavedStories(): void {
    localStorage.setItem(this.savedStorageKey, JSON.stringify(this.savedStories));
  }

  private refreshView(): void {
    this.changeDetector.detectChanges();
    window.setTimeout(() => this.changeDetector.detectChanges(), 0);
  }

  private showError(message: string): void {
    this.zone.run(() => {
      this.errorMessage = message;
      this.refreshView();
    });
    window.setTimeout(() => {
      if (this.errorMessage === message) {
        this.errorMessage = '';
        this.refreshView();
      }
    }, 4500);
  }
}

















