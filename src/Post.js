import React, { Component } from 'react';
import PropTypes from 'prop-types';

const POST_TEXT_LIMIT = 1024;

class Post extends Component {
  constructor(props) {
    super(props);
    this.state = {
      useFaviconFallback: !props.thumbnail && Boolean(props.favicon),
      hideMedia: !props.thumbnail && !props.favicon,
    };

    this.handleImageError = this.handleImageError.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      useFaviconFallback: !nextProps.thumbnail && Boolean(nextProps.favicon),
      hideMedia: !nextProps.thumbnail && !nextProps.favicon,
    });
  }

  handleImageError() {
    if (!this.state.useFaviconFallback && this.props.favicon) {
      this.setState({
        useFaviconFallback: true,
      });
      return;
    }

    this.setState({
      hideMedia: true,
    });
  }

  render() {
    const bodyText = this.props.truncatePostText &&
      this.props.bodyText &&
      this.props.bodyText.length > POST_TEXT_LIMIT
      ? `${this.props.bodyText.slice(0, POST_TEXT_LIMIT - 3)}...`
      : this.props.bodyText;
    const mediaSrc = this.state.useFaviconFallback ? this.props.favicon : this.props.thumbnail;
    const mediaClassName = this.state.useFaviconFallback
      ? 'Thumbnail Favicon'
      : 'Thumbnail';

    return (
      <li className="Post">
        {!this.state.hideMedia && mediaSrc ? (
          <img
            alt="thumbnail"
            className={mediaClassName}
            onError={this.handleImageError}
            src={mediaSrc}
          ></img>
        ) : null}
        <div className="PostInfo">
          <div className="PostTitleRow">
            <span className="Score">[{this.props.score}]</span>
            <a href={this.props.linkUrl} className="title" rel="noopener noreferrer" target="_blank">{this.props.title}</a>
          </div>
          {bodyText ? (
            <div className="PostBody">{bodyText}</div>
          ) : null}
          <br />
          submitted&nbsp;
          <span className="SubmissionTime">{this.props.submissionTime.toString()}</span>
           &nbsp;by&nbsp;
          <span className="Author">{this.props.author}</span>
          &nbsp;to&nbsp;
          <span className="Subreddit">r/{this.props.subreddit}</span>
          <div>
            <a className="Comment" href={this.props.commentLink} rel="noopener noreferrer" target="_blank">{(this.props.commentCount > 0) ? this.props.commentCount + " comments" : "No comments yet"}</a>
          </div>
        </div>
      </li>
    );
  }
}

Post.propTypes = {
  score: PropTypes.string.isRequired,
  thumbnail: PropTypes.string.isRequired,
  linkUrl: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  bodyText: PropTypes.string,
  favicon: PropTypes.string,
  truncatePostText: PropTypes.bool.isRequired,
  submissionTime: PropTypes.instanceOf(Date).isRequired,
  author: PropTypes.string.isRequired,
  subreddit: PropTypes.string.isRequired,
  commentLink: PropTypes.string.isRequired,
  commentCount: PropTypes.number.isRequired
};

export default Post;
