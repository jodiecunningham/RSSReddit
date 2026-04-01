import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SubredditList from '../src/SubredditList';

function createBaseProps() {
  return {
    initialSubreddits: ['news', 'worldnews'],
    collapseSubredditList: false,
    toggleSubredditList: vi.fn(),
    truncatePostText: false,
    togglePostTextLength: vi.fn(),
    autoScroll: false,
    toggleAutoScroll: vi.fn(),
    autoRefreshEnabled: false,
    autoRefreshMinutes: '5',
    toggleAutoRefresh: vi.fn(),
    handleAutoRefreshMinutesChange: vi.fn(),
    commitAutoRefreshMinutes: vi.fn(),
    createSubreddit: vi.fn(),
    deleteSubreddit: vi.fn(),
  };
}

function renderSubredditList(overrideProps) {
  const props = Object.assign(createBaseProps(), overrideProps);
  const rendered = render(<SubredditList {...props} />);

  return Object.assign(rendered, { props });
}

describe('SubredditList', () => {
  it('renders the RSSReddit header and left label column when expanded', () => {
    const { container } = renderSubredditList();

    expect(screen.getByRole('heading', { name: 'RSSReddit' })).toBeInTheDocument();
    expect(container.querySelector('.SubredditLabelColumn').textContent).toBe('Filter Subreddits');
  });

  it('hides the label column and shows a summary when collapsed', () => {
    const { container } = renderSubredditList({
      collapseSubredditList: true,
    });

    expect(container.querySelector('.SubredditLabelColumn')).toBeNull();
    expect(screen.getByText('2 subreddits loaded')).toBeInTheDocument();
  });

  it('disables the auto-refresh minutes input until auto-refresh is enabled', () => {
    let rendered = renderSubredditList({
      autoRefreshEnabled: false,
    });
    let input = screen.getByRole('spinbutton');

    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(input).toHaveAttribute('min', '1');
    expect(input).toHaveAttribute('step', '1');

    rendered.unmount();

    rendered = renderSubredditList({
      autoRefreshEnabled: true,
    });
    input = screen.getByRole('spinbutton');

    expect(input).not.toBeDisabled();
  });

  it('calls deleteSubreddit with the clicked subreddit index', () => {
    const rendered = renderSubredditList();

    fireEvent.click(screen.getByText('r/worldnews'));

    expect(rendered.props.deleteSubreddit).toHaveBeenCalledWith(1);
  });

  it('submits a new subreddit and clears the input', () => {
    const { container, props } = renderSubredditList();
    const input = screen.getByPlaceholderText('subreddit (hit enter)');

    fireEvent.change(input, { target: { value: 'technology' } });
    fireEvent.submit(container.querySelector('form'));

    expect(props.createSubreddit).toHaveBeenCalledWith('technology');
    expect(input).toHaveValue('');
  });

  it('marks the input as an error when submitting an empty subreddit', () => {
    const { container, props } = renderSubredditList();
    const input = screen.getByPlaceholderText('subreddit (hit enter)');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.submit(container.querySelector('form'));

    expect(props.createSubreddit).not.toHaveBeenCalled();
    expect(input.className).toContain('Error');
  });
});
