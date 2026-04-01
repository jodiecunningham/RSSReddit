import React, { Component } from 'react';
import PropTypes from 'prop-types';

class SubredditList extends Component {
  constructor(props) {
    super(props);
    this.deleteSubreddit = this.deleteSubreddit.bind(this);
    this.createSubreddit = this.createSubreddit.bind(this);
  }

  deleteSubreddit(index) {
    this.props.deleteSubreddit(index);
  }

  createSubreddit(e){
    e.preventDefault();
    const subredditEntry = document.getElementById('subredditEntry');

    if (!subredditEntry) {
      return;
    }

    const value = subredditEntry.value.trim();

    if (value.length === 0) {
      subredditEntry.classList.add('Error');
      return;
    }

    subredditEntry.classList.remove('Error');
    this.props.createSubreddit(
      value
    );
    subredditEntry.value = "";
  }

  render() {
    return (
      <div className="SubredditList">
        <div className="SubredditHeader">
          <h1>RSSReddit</h1>
          <div className="SubredditControls">
            <label className="ToggleControl">
              <span>Collapse multireddit list</span>
              <input
                type="checkbox"
                checked={this.props.collapseSubredditList}
                onChange={this.props.toggleSubredditList}
              />
              <span className="ToggleSlider"></span>
            </label>
            <label className="ToggleControl">
              <span>Limit post text to 1024 chars</span>
              <input
                type="checkbox"
                checked={this.props.truncatePostText}
                onChange={this.props.togglePostTextLength}
              />
              <span className="ToggleSlider"></span>
            </label>
            <label className="ToggleControl">
              <span>Auto-scroll feed</span>
              <input
                type="checkbox"
                checked={this.props.autoScroll}
                onChange={this.props.toggleAutoScroll}
              />
              <span className="ToggleSlider"></span>
            </label>
            <label className="ToggleControl">
              <span>Auto-refresh page</span>
              <input
                type="checkbox"
                checked={this.props.autoRefreshEnabled}
                onChange={this.props.toggleAutoRefresh}
              />
              <span className="ToggleSlider"></span>
            </label>
            <label className="RefreshMinutesControl">
              <span>Minutes</span>
              <input
                className="RefreshMinutesInput"
                disabled={!this.props.autoRefreshEnabled}
                inputMode="numeric"
                min="1"
                onBlur={this.props.commitAutoRefreshMinutes}
                onChange={this.props.handleAutoRefreshMinutesChange}
                pattern="[0-9]*"
                step="1"
                type="number"
                value={this.props.autoRefreshMinutes}
              />
            </label>
          </div>
        </div>
        {this.props.collapseSubredditList ? (
          <div className="SubredditSummary">
            {this.props.initialSubreddits.length} subreddits loaded
          </div>
        ) : (
          <div className="SubredditBody">
            <div className="SubredditLabelColumn">Filter Subreddits</div>
            <ul className="Subreddits">
              {this.props.initialSubreddits.map((subreddit, index) => {
                return (
                  <li
                    key={index}
                    className="Subreddit"
                    onClick={this.deleteSubreddit.bind(this, index)}
                    >r/{subreddit}</li>
                );
              })}
              <li className="Subreddit">
                <form onSubmit={this.createSubreddit}>
                  <label htmlFor="subredditEntry">r/</label>
                  <input type="text" id="subredditEntry"
                    placeholder="subreddit (hit enter)" />
                </form>
              </li>
            </ul>
          </div>
        )}

      </div>
    );
  }
}

SubredditList.propTypes = {
  initialSubreddits: PropTypes.arrayOf(PropTypes.string),
  collapseSubredditList: PropTypes.bool.isRequired,
  toggleSubredditList: PropTypes.func.isRequired,
  truncatePostText: PropTypes.bool.isRequired,
  togglePostTextLength: PropTypes.func.isRequired,
  autoScroll: PropTypes.bool.isRequired,
  toggleAutoScroll: PropTypes.func.isRequired,
  autoRefreshEnabled: PropTypes.bool.isRequired,
  autoRefreshMinutes: PropTypes.string.isRequired,
  toggleAutoRefresh: PropTypes.func.isRequired,
  handleAutoRefreshMinutesChange: PropTypes.func.isRequired,
  commitAutoRefreshMinutes: PropTypes.func.isRequired,
  createSubreddit: PropTypes.func.isRequired,
  deleteSubreddit: PropTypes.func.isRequired,
};

export default SubredditList;
