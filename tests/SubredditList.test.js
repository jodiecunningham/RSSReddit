import React from 'react';
import ReactDOM from 'react-dom';
import TestUtils from 'react-dom/test-utils';
import SubredditList from '../src/SubredditList';

function createBaseProps() {
  return {
    initialSubreddits: ['news', 'worldnews'],
    collapseSubredditList: false,
    toggleSubredditList: jest.fn(),
    truncatePostText: false,
    togglePostTextLength: jest.fn(),
    autoScroll: false,
    toggleAutoScroll: jest.fn(),
    autoRefreshEnabled: false,
    autoRefreshMinutes: '5',
    toggleAutoRefresh: jest.fn(),
    handleAutoRefreshMinutesChange: jest.fn(),
    commitAutoRefreshMinutes: jest.fn(),
    createSubreddit: jest.fn(),
    deleteSubreddit: jest.fn(),
  };
}

function renderSubredditList(overrideProps) {
  const container = document.createElement('div');
  const props = Object.assign(createBaseProps(), overrideProps);

  document.body.appendChild(container);

  ReactDOM.render(<SubredditList {...props} />, container);

  return {
    container,
    props,
    cleanup() {
      ReactDOM.unmountComponentAtNode(container);
      document.body.removeChild(container);
    },
  };
}

describe('SubredditList', () => {
  it('renders the RSSReddit header and left label column when expanded', () => {
    const rendered = renderSubredditList();

    expect(rendered.container.querySelector('.SubredditHeader h1').textContent)
      .toBe('RSSReddit');
    expect(rendered.container.querySelector('.SubredditLabelColumn').textContent)
      .toBe('Filter Subreddits');

    rendered.cleanup();
  });

  it('hides the label column and shows a summary when collapsed', () => {
    const rendered = renderSubredditList({
      collapseSubredditList: true,
    });

    expect(rendered.container.querySelector('.SubredditLabelColumn')).toBeNull();
    expect(rendered.container.querySelector('.SubredditSummary').textContent)
      .toContain('2 subreddits loaded');

    rendered.cleanup();
  });

  it('disables the auto-refresh minutes input until auto-refresh is enabled', () => {
    let rendered = renderSubredditList({
      autoRefreshEnabled: false,
    });
    let input = rendered.container.querySelector('.RefreshMinutesInput');

    expect(input.disabled).toBe(true);
    expect(input.getAttribute('type')).toBe('number');
    expect(input.getAttribute('inputmode')).toBe('numeric');
    expect(input.getAttribute('min')).toBe('1');
    expect(input.getAttribute('step')).toBe('1');

    rendered.cleanup();

    rendered = renderSubredditList({
      autoRefreshEnabled: true,
    });
    input = rendered.container.querySelector('.RefreshMinutesInput');

    expect(input.disabled).toBe(false);

    rendered.cleanup();
  });

  it('calls deleteSubreddit with the clicked subreddit index', () => {
    const rendered = renderSubredditList();
    const subredditItems = rendered.container.querySelectorAll('.Subreddits .Subreddit');

    TestUtils.Simulate.click(subredditItems[1]);

    expect(rendered.props.deleteSubreddit).toHaveBeenCalledWith(1);

    rendered.cleanup();
  });

  it('submits a new subreddit and clears the input', () => {
    const rendered = renderSubredditList();
    const input = rendered.container.querySelector('#subredditEntry');
    const form = rendered.container.querySelector('form');

    input.value = 'technology';
    TestUtils.Simulate.submit(form);

    expect(rendered.props.createSubreddit).toHaveBeenCalledWith('technology');
    expect(input.value).toBe('');

    rendered.cleanup();
  });

  it('marks the input as an error when submitting an empty subreddit', () => {
    const rendered = renderSubredditList();
    const input = rendered.container.querySelector('#subredditEntry');
    const form = rendered.container.querySelector('form');

    input.value = '';
    TestUtils.Simulate.submit(form);

    expect(rendered.props.createSubreddit).not.toHaveBeenCalled();
    expect(input.className).toContain('Error');

    rendered.cleanup();
  });
});
