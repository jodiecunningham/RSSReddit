import React from 'react';
import ReactDOM from 'react-dom';
import {
  buildDocumentTitle,
  formatSubredditTitlePart,
  getFaviconUrl,
  getStoredAutoRefreshEnabled,
  getStoredAutoRefreshMinutes,
  getSubredditsFromLocation,
  getThumbnailUrl,
  getStoredBoolean,
} from '../src/App';
import App from '../src/App';
import DEFAULT_SUBREDDITS from '../src/defaultSubreddits';

function createStorage() {
  return {
    data: {},
    clear() {
      this.data = {};
    },
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(this.data, key)
        ? this.data[key]
        : null;
    },
    setItem(key, value) {
      this.data[key] = value;
    },
  };
}

function createFetchResponse(overrides) {
  const postData = Object.assign({
    author: 'exampleAuthor',
    created_utc: 1711893600,
    num_comments: 4,
    permalink: '/r/news/comments/abc123/example',
    score: 123,
    selftext: 'Example body',
    subreddit: 'news',
    thumbnail: '',
    title: 'Example story',
    url: 'https://example.com/story',
  }, overrides);

  return Promise.resolve({
    json() {
      return Promise.resolve({
        data: {
          after: 't3_next',
          children: [{ data: postData }],
        },
      });
    },
  });
}

function flushPromises() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe('App helpers', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createStorage(),
    });

    window.localStorage.clear();
  });

  it('parses a single subreddit from the url path', () => {
    expect(getSubredditsFromLocation('/r/news')).toEqual(['news']);
  });

  it('parses multiple subreddits and decodes encoded names', () => {
    expect(getSubredditsFromLocation('/r/news+worldnews+AI%20Tools/')).toEqual([
      'news',
      'worldnews',
      'AI Tools',
    ]);
  });

  it('falls back to the default multireddit when the path has no subreddit section', () => {
    expect(getSubredditsFromLocation('/')).toEqual(DEFAULT_SUBREDDITS);
  });

  it('prefers preview images over thumbnail urls', () => {
    expect(getThumbnailUrl({
      thumbnail: 'https://example.com/thumb.jpg',
      preview: {
        images: [{
          source: {
            url: 'https://example.com/preview.jpg',
          },
        }],
      },
    })).toBe('https://example.com/preview.jpg');
  });

  it('falls back to a direct thumbnail url when there is no preview image', () => {
    expect(getThumbnailUrl({
      thumbnail: 'https://example.com/thumb.jpg',
    })).toBe('https://example.com/thumb.jpg');
  });

  it('returns an empty thumbnail when reddit only provides placeholders', () => {
    expect(getThumbnailUrl({ thumbnail: 'self' })).toBe('');
    expect(getThumbnailUrl({ thumbnail: '' })).toBe('');
  });

  it('builds a favicon url from the linked site origin', () => {
    expect(getFaviconUrl('https://www.example.com/path/story')).toBe(
      'https://www.example.com/favicon.ico'
    );
  });

  it('returns an empty favicon url for invalid links', () => {
    expect(getFaviconUrl('not-a-url')).toBe('');
  });

  it('reads auto-refresh enabled from localStorage', () => {
    window.localStorage.setItem('rssreddit:autoRefreshEnabled', 'true');
    expect(getStoredAutoRefreshEnabled()).toBe(true);
  });

  it('returns false when auto-refresh enabled is missing', () => {
    expect(getStoredAutoRefreshEnabled()).toBe(false);
  });

  it('accepts a stored positive integer minute value', () => {
    window.localStorage.setItem('rssreddit:autoRefreshMinutes', '7');
    expect(getStoredAutoRefreshMinutes()).toBe(7);
  });

  it('falls back to 5 minutes for invalid stored minute values', () => {
    window.localStorage.setItem('rssreddit:autoRefreshMinutes', '0');
    expect(getStoredAutoRefreshMinutes()).toBe(5);

    window.localStorage.setItem('rssreddit:autoRefreshMinutes', '-3');
    expect(getStoredAutoRefreshMinutes()).toBe(5);

    window.localStorage.setItem('rssreddit:autoRefreshMinutes', 'abc');
    expect(getStoredAutoRefreshMinutes()).toBe(5);
  });

  it('reads stored boolean values for ui toggles', () => {
    window.localStorage.setItem('rssreddit:collapseSubredditList', 'true');
    expect(getStoredBoolean('rssreddit:collapseSubredditList')).toBe(true);
    expect(getStoredBoolean('rssreddit:truncatePostText')).toBe(false);
  });

  it('formats subreddit names for the document title', () => {
    expect(formatSubredditTitlePart('news')).toBe('News');
    expect(formatSubredditTitlePart('ADHD_Programmers')).toBe('ADHD_Programmers');
    expect(buildDocumentTitle(['news', 'worldnews', 'ADHD_Programmers']))
      .toBe('RSSReddit News,Worldnews,ADHD_Programmers');
  });
});

describe('App behavior', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createStorage(),
    });

    window.localStorage.clear();
    window.history.replaceState(null, '', '/r/news');
    window.fetch = jest.fn(() => createFetchResponse());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads posts from the current url path on mount', () => {
    window.history.replaceState(null, '', '/r/news+worldnews');
    const div = document.createElement('div');

    ReactDOM.render(<App />, div);

    return flushPromises()
      .then(() => flushPromises())
      .then(() => {
        expect(window.fetch).toHaveBeenCalledWith('/r/news+worldnews.json?raw_json=1');
        expect(document.title).toBe('RSSReddit News,Worldnews');
        ReactDOM.unmountComponentAtNode(div);
      });
  });

  it('adds a subreddit, updates the url, and fetches the combined feed', () => {
    const div = document.createElement('div');
    const instance = ReactDOM.render(<App />, div);

    return flushPromises()
      .then(() => flushPromises())
      .then(() => {
        window.fetch.mockClear();
        instance.createSubreddit('worldnews');
        return flushPromises().then(() => {
          expect(window.location.pathname).toBe('/r/news+worldnews');
          expect(window.fetch.mock.calls[0][0]).toContain('/r/news+worldnews.json?raw_json=1');
          expect(document.title).toBe('RSSReddit News,Worldnews');
          ReactDOM.unmountComponentAtNode(div);
        });
      });
  });

  it('removes a subreddit, resets pagination, and updates the url', () => {
    const div = document.createElement('div');
    const instance = ReactDOM.render(<App />, div);

    return flushPromises()
      .then(() => flushPromises())
      .then(() => {
        instance.setState({
          nextThing: 't3_existing',
          subredditDirectory: ['news', 'worldnews'],
        });
      })
      .then(() => {
        window.fetch.mockClear();
        instance.deleteSubreddit(1);

        expect(instance.state.nextThing).toBe('');
        expect(window.location.pathname).toBe('/r/news');
        expect(window.fetch).toHaveBeenCalledWith('/r/news.json?raw_json=1');

        return flushPromises().then(() => {
          ReactDOM.unmountComponentAtNode(div);
        });
      });
  });

  it('only accepts digits when editing auto-refresh minutes and rejects invalid commits', () => {
    window.fetch = jest.fn(() => new Promise(() => {}));
    const div = document.createElement('div');
    const instance = ReactDOM.render(<App />, div);

    instance.handleAutoRefreshMinutesChange({ target: { value: '12' } });
    expect(instance.state.autoRefreshInput).toBe('12');
    expect(instance.state.autoRefreshMinutes).toBe(12);

    instance.handleAutoRefreshMinutesChange({ target: { value: '12a' } });
    expect(instance.state.autoRefreshInput).toBe('12');
    expect(instance.state.autoRefreshMinutes).toBe(12);

    instance.handleAutoRefreshMinutesChange({ target: { value: '0' } });
    expect(instance.state.autoRefreshInput).toBe('0');
    expect(instance.state.autoRefreshMinutes).toBe(12);
    instance.commitAutoRefreshMinutes();
    expect(instance.state.autoRefreshMinutes).toBe(12);
    expect(instance.state.autoRefreshInput).toBe('12');

    instance.handleAutoRefreshMinutesChange({ target: { value: '9' } });
    expect(instance.state.autoRefreshMinutes).toBe(9);
    expect(instance.state.autoRefreshInput).toBe('9');

    ReactDOM.unmountComponentAtNode(div);
  });

  it('starts and stops the auto-scroll interval cleanly', () => {
    jest.useFakeTimers();
    window.scrollBy = jest.fn();
    window.fetch = jest.fn(() => new Promise(() => {}));
    const div = document.createElement('div');
    const instance = ReactDOM.render(<App />, div);

    instance.startAutoScroll();
    instance.startAutoScroll();
    jest.runTimersToTime(31);

    expect(window.scrollBy).toHaveBeenCalledWith(0, 2);

    instance.stopAutoScroll();
    const scrollCallCount = window.scrollBy.mock.calls.length;
    jest.runTimersToTime(100);

    expect(window.scrollBy.mock.calls.length).toBe(scrollCallCount);

    ReactDOM.unmountComponentAtNode(div);
  });

  it('persists auto-refresh settings and schedules a reload timer', () => {
    window.fetch = jest.fn(() => createFetchResponse());
    const originalSetTimeout = window.setTimeout;
    const originalClearTimeout = window.clearTimeout;
    const div = document.createElement('div');
    const instance = ReactDOM.render(<App />, div);

    return flushPromises()
      .then(() => flushPromises())
      .then(() => {
        const setTimeoutMock = jest.fn(() => 123);
        const clearTimeoutMock = jest.fn();
        window.setTimeout = setTimeoutMock;
        window.clearTimeout = clearTimeoutMock;

        return new Promise((resolve) => {
          instance.setState({
            autoRefreshEnabled: true,
            autoRefreshMinutes: 3,
            autoRefreshInput: '3',
          }, () => resolve({
            setTimeoutMock,
            clearTimeoutMock,
          }));
        });
      })
      .then((timerMocks) => {
        expect(window.localStorage.getItem('rssreddit:autoRefreshEnabled')).toBe('true');
        expect(window.localStorage.getItem('rssreddit:autoRefreshMinutes')).toBe('3');
        expect(timerMocks.setTimeoutMock).toHaveBeenCalled();
        expect(timerMocks.setTimeoutMock.mock.calls[timerMocks.setTimeoutMock.mock.calls.length - 1][1])
          .toBe(3 * 60 * 1000);

        ReactDOM.unmountComponentAtNode(div);
        window.setTimeout = originalSetTimeout;
        window.clearTimeout = originalClearTimeout;
      });
  });

  it('persists a valid minute value immediately when the input changes', () => {
    window.fetch = jest.fn(() => new Promise(() => {}));
    const div = document.createElement('div');
    const instance = ReactDOM.render(<App />, div);

    instance.handleAutoRefreshMinutesChange({ target: { value: '11' } });

    expect(instance.state.autoRefreshMinutes).toBe(11);
    expect(window.localStorage.getItem('rssreddit:autoRefreshMinutes')).toBe('11');

    ReactDOM.unmountComponentAtNode(div);
  });

  it('restores persisted ui toggle state on load', () => {
    window.fetch = jest.fn(() => new Promise(() => {}));
    window.localStorage.setItem('rssreddit:collapseSubredditList', 'true');
    window.localStorage.setItem('rssreddit:truncatePostText', 'true');
    window.localStorage.setItem('rssreddit:autoScroll', 'true');
    const div = document.createElement('div');
    const instance = ReactDOM.render(<App />, div);

    expect(instance.state.collapseSubredditList).toBe(true);
    expect(instance.state.truncatePostText).toBe(true);
    expect(instance.state.autoScroll).toBe(true);

    ReactDOM.unmountComponentAtNode(div);
  });

  it('persists ui toggles when they change', () => {
    window.fetch = jest.fn(() => new Promise(() => {}));
    const div = document.createElement('div');
    const instance = ReactDOM.render(<App />, div);

    instance.toggleSubredditList();
    instance.togglePostTextLength();
    instance.toggleAutoScroll();

    expect(window.localStorage.getItem('rssreddit:collapseSubredditList')).toBe('true');
    expect(window.localStorage.getItem('rssreddit:truncatePostText')).toBe('true');
    expect(window.localStorage.getItem('rssreddit:autoScroll')).toBe('true');

    ReactDOM.unmountComponentAtNode(div);
  });
});
