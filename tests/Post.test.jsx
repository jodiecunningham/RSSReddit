import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Post from '../src/Post';

const baseProps = {
  score: '123',
  thumbnail: 'https://example.com/thumb.jpg',
  linkUrl: 'https://example.com/story',
  title: 'Example Story',
  bodyText: 'Short body',
  favicon: 'https://example.com/favicon.ico',
  truncatePostText: false,
  submissionTime: new Date('2026-03-31T12:00:00.000Z'),
  author: 'exampleAuthor',
  subreddit: 'news',
  commentLink: 'https://www.reddit.com/r/news/comments/abc123/example',
  commentCount: 4,
};

function renderPost(overrideProps) {
  return render(<Post {...Object.assign({}, baseProps, overrideProps)} />);
}

describe('Post', () => {
  it('renders the score inline with the title', () => {
    const { container } = renderPost();

    expect(container.querySelector('.PostTitleRow').textContent).toContain('[123]');
    expect(container.querySelector('.title').textContent).toBe('Example Story');
  });

  it('truncates post text to 1024 characters when enabled', () => {
    const longBody = new Array(1101).join('a');
    const { container } = renderPost({
      bodyText: longBody,
      truncatePostText: true,
    });
    const body = container.querySelector('.PostBody').textContent;

    expect(body.length).toBe(1024);
    expect(body.slice(-3)).toBe('...');
  });

  it('renders the thumbnail when one is available', () => {
    const { container } = renderPost();
    const image = container.querySelector('img');

    expect(image).not.toBeNull();
    expect(image.getAttribute('src')).toBe('https://example.com/thumb.jpg');
    expect(image.className).toBe('Thumbnail');
  });

  it('starts with the favicon when there is no thumbnail', () => {
    const { container } = renderPost({
      thumbnail: '',
    });
    const image = container.querySelector('img');

    expect(image).not.toBeNull();
    expect(image.getAttribute('src')).toBe('https://example.com/favicon.ico');
    expect(image.className).toContain('Favicon');
  });

  it('falls back to the favicon after the thumbnail fails', () => {
    const { container } = renderPost();
    let image = container.querySelector('img');

    fireEvent.error(image);
    image = container.querySelector('img');

    expect(image).not.toBeNull();
    expect(image.getAttribute('src')).toBe('https://example.com/favicon.ico');
    expect(image.className).toContain('Favicon');
  });

  it('hides media after both thumbnail and favicon fail', () => {
    const { container } = renderPost();
    let image = container.querySelector('img');

    fireEvent.error(image);
    image = container.querySelector('img');
    fireEvent.error(image);

    expect(container.querySelector('img')).toBeNull();
  });

  it('opens post and comment links in a new tab', () => {
    const { container } = renderPost();
    const links = container.querySelectorAll('a');

    expect(links[0].getAttribute('target')).toBe('_blank');
    expect(links[0].getAttribute('rel')).toBe('noopener noreferrer');
    expect(links[1].getAttribute('target')).toBe('_blank');
    expect(links[1].getAttribute('rel')).toBe('noopener noreferrer');
  });
});
