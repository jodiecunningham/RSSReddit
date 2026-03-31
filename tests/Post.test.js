import React from 'react';
import ReactDOM from 'react-dom';
import TestUtils from 'react-dom/test-utils';
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
  const container = document.createElement('div');
  const props = Object.assign({}, baseProps, overrideProps);

  ReactDOM.render(<Post {...props} />, container);

  return {
    container,
    cleanup() {
      ReactDOM.unmountComponentAtNode(container);
    },
  };
}

describe('Post', () => {
  it('renders the score inline with the title', () => {
    const rendered = renderPost();

    expect(rendered.container.querySelector('.PostTitleRow').textContent)
      .toContain('[123]');
    expect(rendered.container.querySelector('.title').textContent)
      .toBe('Example Story');

    rendered.cleanup();
  });

  it('truncates post text to 1024 characters when enabled', () => {
    const longBody = new Array(1101).join('a');
    const rendered = renderPost({
      bodyText: longBody,
      truncatePostText: true,
    });
    const body = rendered.container.querySelector('.PostBody').textContent;

    expect(body.length).toBe(1024);
    expect(body.slice(-3)).toBe('...');

    rendered.cleanup();
  });

  it('renders the thumbnail when one is available', () => {
    const rendered = renderPost();
    const image = rendered.container.querySelector('img');

    expect(image).not.toBeNull();
    expect(image.getAttribute('src')).toBe('https://example.com/thumb.jpg');
    expect(image.className).toBe('Thumbnail');

    rendered.cleanup();
  });

  it('starts with the favicon when there is no thumbnail', () => {
    const rendered = renderPost({
      thumbnail: '',
    });
    const image = rendered.container.querySelector('img');

    expect(image).not.toBeNull();
    expect(image.getAttribute('src')).toBe('https://example.com/favicon.ico');
    expect(image.className).toContain('Favicon');

    rendered.cleanup();
  });

  it('falls back to the favicon after the thumbnail fails', () => {
    const rendered = renderPost();
    let image = rendered.container.querySelector('img');

    TestUtils.Simulate.error(image);
    image = rendered.container.querySelector('img');

    expect(image).not.toBeNull();
    expect(image.getAttribute('src')).toBe('https://example.com/favicon.ico');
    expect(image.className).toContain('Favicon');

    rendered.cleanup();
  });

  it('hides media after both thumbnail and favicon fail', () => {
    const rendered = renderPost();
    let image = rendered.container.querySelector('img');

    TestUtils.Simulate.error(image);
    image = rendered.container.querySelector('img');
    TestUtils.Simulate.error(image);

    expect(rendered.container.querySelector('img')).toBeNull();

    rendered.cleanup();
  });

  it('opens post and comment links in a new tab', () => {
    const rendered = renderPost();
    const links = rendered.container.querySelectorAll('a');

    expect(links[0].getAttribute('target')).toBe('_blank');
    expect(links[0].getAttribute('rel')).toBe('noopener noreferrer');
    expect(links[1].getAttribute('target')).toBe('_blank');
    expect(links[1].getAttribute('rel')).toBe('noopener noreferrer');

    rendered.cleanup();
  });
});
