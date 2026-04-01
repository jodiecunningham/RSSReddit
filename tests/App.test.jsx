import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildDocumentTitle,
  formatSubredditTitlePart,
  getFaviconUrl,
  getStoredAutoRefreshEnabled,
  getStoredAutoRefreshMinutes,
  getStoredBoolean,
  getSubredditsFromLocation,
  getThumbnailUrl,
} from '../src/App';
import App from '../src/App';
import DEFAULT_SUBREDDITS from '../src/defaultSubreddits';

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
    window.fetch = vi.fn(() => createFetchResponse());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('loads posts from the current url path on mount', async () => {
    window.history.replaceState(null, '', '/r/news+worldnews');

    render(<App />);

    await waitFor(() => {
      expect(window.fetch).toHaveBeenCalledWith('/r/news+worldnews.json?raw_json=1');
    });

    expect(document.title).toBe('RSSReddit News,Worldnews');
  });

  it('adds a subreddit, updates the url, and fetches the combined feed', async () => {
    render(<App />);

    await waitFor(() => {
      expect(window.fetch).toHaveBeenCalledWith('/r/news.json?raw_json=1');
    });

    window.fetch.mockClear();

    fireEvent.change(screen.getByPlaceholderText('subreddit (hit enter)'), {
      target: { value: 'worldnews' },
    });
    fireEvent.submit(screen.getByText('r/').closest('form'));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/r/news+worldnews');
      expect(window.fetch).toHaveBeenCalledWith('/r/news+worldnews.json?raw_json=1');
    });

    expect(document.title).toBe('RSSReddit News,Worldnews');
  });

  it('removes a subreddit, resets pagination, and updates the url', async () => {
    window.history.replaceState(null, '', '/r/news+worldnews');

    render(<App />);

    await waitFor(() => {
      expect(window.fetch).toHaveBeenCalledWith('/r/news+worldnews.json?raw_json=1');
    });

    window.fetch.mockClear();
    fireEvent.click(screen.getByText('r/worldnews'));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/r/news');
      expect(window.fetch).toHaveBeenCalledWith('/r/news.json?raw_json=1');
    });
  });

  it('updates auto-refresh minutes and rejects invalid committed values', async () => {
    window.fetch = vi.fn(() => new Promise(() => {}));

    render(<App />);

    const minutesInput = screen.getByRole('spinbutton');

    fireEvent.change(minutesInput, { target: { value: '12' } });
    expect(minutesInput).toHaveValue(12);
    expect(window.localStorage.getItem('rssreddit:autoRefreshMinutes')).toBe('12');

    fireEvent.change(minutesInput, { target: { value: '0' } });
    expect(minutesInput).toHaveValue(0);

    fireEvent.blur(minutesInput);

    await waitFor(() => {
      expect(minutesInput).toHaveValue(12);
    });
  });

  it('starts and stops the auto-scroll interval cleanly', () => {
    vi.useFakeTimers();
    window.scrollBy = vi.fn();
    window.fetch = vi.fn(() => new Promise(() => {}));

    render(<App />);

    fireEvent.click(screen.getByLabelText('Auto-scroll feed'));

    vi.advanceTimersByTime(31);
    expect(window.scrollBy).toHaveBeenCalledWith(0, 2);

    fireEvent.click(screen.getByLabelText('Auto-scroll feed'));
    const scrollCallCount = window.scrollBy.mock.calls.length;

    vi.advanceTimersByTime(100);
    expect(window.scrollBy).toHaveBeenCalledTimes(scrollCallCount);
  });

  it('persists auto-refresh settings and schedules a reload timer', async () => {
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

    render(<App />);

    await waitFor(() => {
      expect(window.fetch).toHaveBeenCalledWith('/r/news.json?raw_json=1');
    });

    fireEvent.click(screen.getByLabelText('Auto-refresh page'));

    const minutesInput = screen.getByRole('spinbutton');
    fireEvent.change(minutesInput, { target: { value: '3' } });
    fireEvent.blur(minutesInput);

    await waitFor(() => {
      expect(window.localStorage.getItem('rssreddit:autoRefreshEnabled')).toBe('true');
      expect(window.localStorage.getItem('rssreddit:autoRefreshMinutes')).toBe('3');
      expect(setTimeoutSpy).toHaveBeenCalled();
    });

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(setTimeoutSpy.mock.calls.some(([, delay]) => delay === 3 * 60 * 1000)).toBe(true);
  });

  it('restores persisted ui toggle state on load', () => {
    window.fetch = vi.fn(() => new Promise(() => {}));
    window.scrollBy = vi.fn();
    window.localStorage.setItem('rssreddit:collapseSubredditList', 'true');
    window.localStorage.setItem('rssreddit:truncatePostText', 'true');
    window.localStorage.setItem('rssreddit:autoScroll', 'true');

    render(<App />);

    expect(screen.getByLabelText('Collapse multireddit list')).toBeChecked();
    expect(screen.getByLabelText('Limit post text to 1024 chars')).toBeChecked();
    expect(screen.getByLabelText('Auto-scroll feed')).toBeChecked();
  });

  it('persists ui toggles when they change', () => {
    window.fetch = vi.fn(() => new Promise(() => {}));
    window.scrollBy = vi.fn();

    render(<App />);

    fireEvent.click(screen.getByLabelText('Collapse multireddit list'));
    fireEvent.click(screen.getByLabelText('Limit post text to 1024 chars'));
    fireEvent.click(screen.getByLabelText('Auto-scroll feed'));

    expect(window.localStorage.getItem('rssreddit:collapseSubredditList')).toBe('true');
    expect(window.localStorage.getItem('rssreddit:truncatePostText')).toBe('true');
    expect(window.localStorage.getItem('rssreddit:autoScroll')).toBe('true');
  });
});
