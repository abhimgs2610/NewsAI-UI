# NewsAI UI

Angular frontend for the NewsAI backend. It provides a story-first news experience backed by the Spring Boot APIs at `http://localhost:8080/api/news`.

## Current Features

- Home dashboard with Top Stories from `/api/news/hot`.
- India, World, Politics, Business, Technology, and Sports quick filters.
- Global search from the Home search box using `/api/news/feed?searchValue=true`.
- Empty search result CTA that opens Discover.
- Explore section for State, City, and Category news.
- Searchable Explore dropdowns with no API call until the user chooses a value.
- View All and Load More flows using `limit=50` and `offset` pagination.
- Story reader page using `/api/news/{id}`.
- Follow-up Q&A chat using `/api/news/{id}/ask`.
- Discover News page using `/api/news/discover` with mandatory context and optional country/state/city.
- Discover load-more support using `discoverRequestId` and `loadMore=true`.

## Backend Requirement

Start the NewsAI backend first:

```bash
http://localhost:8080
```

The UI expects the backend base URL in:

```text
src/app/services/news-api.service.ts
```

Current value:

```ts
http://localhost:8080/api/news
```

## Install

```bash
npm install
```

## Run Locally

If PowerShell blocks npm scripts, use Command Prompt or run npm through Node directly.

Normal command:

```bash
npm start
```

Then open:

```text
http://localhost:4200
```

## Build

```bash
npm run build
```

Build output is generated in:

```text
dist/NewsAI-UI
```

## Main UI Flows

### Home

- Initial load calls `/api/news/hot?limit=20&offset=0`.
- Clicking Home resets the page to the default Top Stories view.
- Main search calls `/api/news/feed?q={keyword}&searchValue=true&limit=20&offset=0`.
- If no search results are found, the user can open Discover from the empty state.

### Explore

- Clicking Explore opens State News by default.
- State, City, and Category pages do not load news until the user selects a dropdown value.
- Dropdown options are searchable.
- Selecting a value calls `/api/news/feed` with the selected `state`, `city`, or `category`.
- View All uses 50-record pagination and Load More increments `offset`.

### Discover

- Context is mandatory.
- Country, State, and City are optional.
- Enter key submits from context/country/state/city fields.
- Opening Discover from the sidebar starts with an empty form.
- Opening Discover from an empty Home search also starts with an empty form.
- Results come from `/api/news/discover`.
- Load More reuses the returned `discoverRequestId`.

## Useful Commit Note

```text
Update NewsAI UI with Explore, global search, story, chat, and discover flows
```