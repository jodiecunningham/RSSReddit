import React, { Component } from 'react';
import SubredditList from './SubredditList';
import Post from './Post';
import DEFAULT_SUBREDDITS from './defaultSubreddits';
import './App.css';

const IS_LOCAL_DEV =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

const REDDIT_BASE_URL = IS_LOCAL_DEV ? '' : 'https://www.reddit.com';
const URL_SUBREDDIT_PATTERN = /\/r\/([^/?#]+)/i;
const AUTO_REFRESH_ENABLED_KEY = 'rssreddit:autoRefreshEnabled';
const AUTO_REFRESH_MINUTES_KEY = 'rssreddit:autoRefreshMinutes';
const COLLAPSE_SUBREDDIT_LIST_KEY = 'rssreddit:collapseSubredditList';
const TRUNCATE_POST_TEXT_KEY = 'rssreddit:truncatePostText';
const AUTO_SCROLL_KEY = 'rssreddit:autoScroll';
const AUTO_SCROLL_POSITION_KEY = 'rssreddit:autoScrollPosition';

function getSubredditsFromLocation(pathname) {
  const match = pathname.match(URL_SUBREDDIT_PATTERN);

  if (!match || !match[1]) {
    return DEFAULT_SUBREDDITS;
  }

  return decodeURIComponent(match[1])
    .replace(/\/$/, '')
    .split('+')
    .map((subreddit) => subreddit.trim())
    .filter(Boolean);
}

function getThumbnailUrl(data) {
  const previewUrl = data.preview &&
    data.preview.images &&
    data.preview.images[0] &&
    data.preview.images[0].source &&
    data.preview.images[0].source.url;

  if (previewUrl) {
    return previewUrl;
  }

  if (data.thumbnail && /^https?:\/\//i.test(data.thumbnail)) {
    return data.thumbnail;
  }

  return '';
}

function getFaviconUrl(linkUrl) {
  if (!linkUrl) {
    return '';
  }

  try {
    const parsedUrl = new URL(linkUrl);
    return `${parsedUrl.origin}/favicon.ico`;
  } catch (error) {
    return '';
  }
}

function getStoredAutoRefreshEnabled() {
  return window.localStorage.getItem(AUTO_REFRESH_ENABLED_KEY) === 'true';
}

function getStoredAutoRefreshMinutes() {
  const storedMinutes = window.localStorage.getItem(AUTO_REFRESH_MINUTES_KEY);
  const parsedMinutes = parseInt(storedMinutes, 10);

  if (Number.isInteger(parsedMinutes) && parsedMinutes > 0) {
    return parsedMinutes;
  }

  return 5;
}

function getStoredBoolean(key) {
  return window.localStorage.getItem(key) === 'true';
}

function getStoredScrollPosition() {
  const storedPosition = window.localStorage.getItem(AUTO_SCROLL_POSITION_KEY);
  const parsedPosition = parseInt(storedPosition, 10);

  if (Number.isInteger(parsedPosition) && parsedPosition >= 0) {
    return parsedPosition;
  }

  return 0;
}

function formatSubredditTitlePart(subreddit) {
  if (!subreddit) {
    return '';
  }

  return subreddit.charAt(0).toUpperCase() + subreddit.slice(1);
}

function buildDocumentTitle(subredditDirectory) {
  return `RSSReddit ${subredditDirectory.map(formatSubredditTitlePart).join(',')}`;
}

const KONAMI_CODE = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65, 13];

class App extends Component {

  constructor(props) {
    super(props);
    const subredditDirectory = getSubredditsFromLocation(window.location.pathname);
    const autoRefreshEnabled = getStoredAutoRefreshEnabled();
    const autoRefreshMinutes = getStoredAutoRefreshMinutes();
    const collapseSubredditList = getStoredBoolean(COLLAPSE_SUBREDDIT_LIST_KEY);
    const truncatePostText = getStoredBoolean(TRUNCATE_POST_TEXT_KEY);
    const autoScroll = getStoredBoolean(AUTO_SCROLL_KEY);

    this.state = {
      subredditDirectory: subredditDirectory,
      posts: [],
      easteregg: [],
      nextThing: "",
      loadingPosts: false,
      collapseSubredditList: collapseSubredditList,
      truncatePostText: truncatePostText,
      autoScroll: autoScroll,
      autoRefreshEnabled: autoRefreshEnabled,
      autoRefreshMinutes: autoRefreshMinutes,
      autoRefreshInput: autoRefreshMinutes.toString(),
    };

    this.autoScrollTimer = null;
    this.autoRefreshTimer = null;
    this.hasRestoredScrollPosition = false;
    this.initialScrollPosition = getStoredScrollPosition();

    //bind callbacks
    this.createSubreddit = this.createSubreddit.bind(this);
    this.deleteSubreddit = this.deleteSubreddit.bind(this);
    this.easterEgg = this.easterEgg.bind(this);
    this.infiniteScroll = this.infiniteScroll.bind(this);
    this.toggleSubredditList = this.toggleSubredditList.bind(this);
    this.togglePostTextLength = this.togglePostTextLength.bind(this);
    this.toggleAutoScroll = this.toggleAutoScroll.bind(this);
    this.toggleAutoRefresh = this.toggleAutoRefresh.bind(this);
    this.handleAutoRefreshMinutesChange = this.handleAutoRefreshMinutesChange.bind(this);
    this.commitAutoRefreshMinutes = this.commitAutoRefreshMinutes.bind(this);
    this.persistScrollPosition = this.persistScrollPosition.bind(this);
    this.restoreScrollPosition = this.restoreScrollPosition.bind(this);
    this.syncUrlToSubreddits = this.syncUrlToSubreddits.bind(this);

    window.addEventListener('scroll', this.infiniteScroll);
  }

  componentDidMount(){
    this.updateDocumentTitle();
    this.loadPosts();

    if (this.state.autoScroll) {
      this.startAutoScroll();
    }

    if (this.state.autoRefreshEnabled) {
      this.startAutoRefresh();
    }
  }

  componentWillUnmount(){
    this.persistScrollPosition();
    this.stopAutoScroll();
    this.stopAutoRefresh();
    window.removeEventListener('scroll', this.infiniteScroll);
  }

  componentDidUpdate(prevProps, prevState){
    if (prevState.autoScroll !== this.state.autoScroll) {
      window.localStorage.setItem(
        AUTO_SCROLL_KEY,
        this.state.autoScroll.toString()
      );

      if (this.state.autoScroll) {
        this.startAutoScroll();
      } else {
        this.stopAutoScroll();
      }
    }

    if (prevState.collapseSubredditList !== this.state.collapseSubredditList) {
      window.localStorage.setItem(
        COLLAPSE_SUBREDDIT_LIST_KEY,
        this.state.collapseSubredditList.toString()
      );
    }

    if (prevState.truncatePostText !== this.state.truncatePostText) {
      window.localStorage.setItem(
        TRUNCATE_POST_TEXT_KEY,
        this.state.truncatePostText.toString()
      );
    }

    if (
      prevState.autoRefreshEnabled !== this.state.autoRefreshEnabled ||
      prevState.autoRefreshMinutes !== this.state.autoRefreshMinutes
    ) {
      window.localStorage.setItem(
        AUTO_REFRESH_ENABLED_KEY,
        this.state.autoRefreshEnabled.toString()
      );
      window.localStorage.setItem(
        AUTO_REFRESH_MINUTES_KEY,
        this.state.autoRefreshMinutes.toString()
      );

      if (this.state.autoRefreshEnabled) {
        this.startAutoRefresh();
      } else {
        this.stopAutoRefresh();
      }
    }

    if (prevState.subredditDirectory !== this.state.subredditDirectory) {
      this.updateDocumentTitle();
    }
  }

  createSubreddit(subredditName) {
    this.setState((prevState) => ({
      subredditDirectory: prevState.subredditDirectory.concat(subredditName),
      nextThing: "",
    }), () => {
      this.syncUrlToSubreddits();
      this.loadPosts();
    });
  }

  deleteSubreddit(index) {
    this.setState((prevState) => ({
      subredditDirectory: prevState.subredditDirectory.filter((subreddit, subredditIndex) => {
        return subredditIndex !== index;
      }),
      nextThing: "",
    }), () => {
      this.syncUrlToSubreddits();
      this.loadPosts();
    });
  }

  easterEgg(e) {
    this.setState((prevState) => {
      const easteregg = prevState.easteregg.concat(e.keyCode).slice(-KONAMI_CODE.length);

      if (easteregg.length === KONAMI_CODE.length && easteregg.every((value, index) => {
        return value === KONAMI_CODE[index];
      })) {
        document.body.classList.add('easter-egg');
      }

      return { easteregg };
    });
  }

  toggleSubredditList() {
    this.setState({
      collapseSubredditList: !this.state.collapseSubredditList,
    });
  }

  togglePostTextLength() {
    this.setState({
      truncatePostText: !this.state.truncatePostText,
    });
  }

  toggleAutoScroll() {
    this.setState({
      autoScroll: !this.state.autoScroll,
    });
  }

  toggleAutoRefresh() {
    this.setState({
      autoRefreshEnabled: !this.state.autoRefreshEnabled,
    });
  }

  handleAutoRefreshMinutesChange(e) {
    const nextValue = e.target.value;

    if (/^\d*$/.test(nextValue)) {
      const nextState = {
        autoRefreshInput: nextValue,
      };
      const parsedMinutes = parseInt(nextValue, 10);

      if (Number.isInteger(parsedMinutes) && parsedMinutes > 0) {
        nextState.autoRefreshMinutes = parsedMinutes;
      }

      this.setState(nextState);
    }
  }

  commitAutoRefreshMinutes() {
    const parsedMinutes = parseInt(this.state.autoRefreshInput, 10);
    const nextMinutes = Number.isInteger(parsedMinutes) && parsedMinutes > 0
      ? parsedMinutes
      : this.state.autoRefreshMinutes;

    this.setState({
      autoRefreshMinutes: nextMinutes,
      autoRefreshInput: nextMinutes.toString(),
    });
  }

  startAutoScroll() {
    if (this.autoScrollTimer) {
      return;
    }

    this.autoScrollTimer = window.setInterval(() => {
      window.scrollBy(0, 2);
    }, 30);
  }

  stopAutoScroll() {
    if (!this.autoScrollTimer) {
      return;
    }

    window.clearInterval(this.autoScrollTimer);
    this.autoScrollTimer = null;
  }

  startAutoRefresh() {
    this.stopAutoRefresh();

    this.autoRefreshTimer = window.setTimeout(() => {
      this.persistScrollPosition();
      window.location.reload();
    }, this.state.autoRefreshMinutes * 60 * 1000);
  }

  stopAutoRefresh() {
    if (!this.autoRefreshTimer) {
      return;
    }

    window.clearTimeout(this.autoRefreshTimer);
    this.autoRefreshTimer = null;
  }

  persistScrollPosition() {
    window.localStorage.setItem(
      AUTO_SCROLL_POSITION_KEY,
      window.scrollY.toString()
    );
  }

  restoreScrollPosition() {
    if (this.hasRestoredScrollPosition) {
      return;
    }

    if (this.initialScrollPosition > 0) {
      window.scrollTo(0, this.initialScrollPosition);
    }

    this.hasRestoredScrollPosition = true;
  }

  syncUrlToSubreddits() {
    const nextPath = `/r/${this.state.subredditDirectory.join('+')}`;

    if (window.location.pathname !== nextPath) {
      window.history.replaceState(null, '', nextPath);
    }
  }

  updateDocumentTitle() {
    document.title = buildDocumentTitle(this.state.subredditDirectory);
  }

  loadPosts() {
    var previousPosts = [];
    var resolvePosts = ( responseJson ) =>
    {
      this.setState( {
        posts: previousPosts.concat(responseJson.data.children.map( ( child ) => {
          var data = child.data;
          return {
            score: data.score,
            thumbnail: getThumbnailUrl(data),
            favicon: getFaviconUrl(data.url),
            linkUrl: data.url,
            title: data.title,
            bodyText: data.selftext,
            submissionTime: new Date(data.created_utc * 1000),
            author: data.author,
            subreddit: data.subreddit,
            commentLink: `${REDDIT_BASE_URL}${data.permalink}`,
            commentCount: data.num_comments
          }
        } )),
        nextThing: responseJson.data.after,
        loadingPosts: false,
      }, this.restoreScrollPosition);
    };

    if (this.state.nextThing) {
      //append posts
      previousPosts = previousPosts.concat(this.state.posts);
      window.fetch(`${REDDIT_BASE_URL}/r/` +
        this.state.subredditDirectory.join( "+" ) +
        `.json?raw_json=1&after=${this.state.nextThing}&limit=50` )
      .then( ( response ) => { return response.json(); } )
      .then( resolvePosts );
    } else {
      //replace posts
      window.fetch(`${REDDIT_BASE_URL}/r/` +
        this.state.subredditDirectory.join( "+" ) +
        ".json?raw_json=1" )
      .then( ( response ) => { return response.json(); } )
      .then( resolvePosts );
    }
  }

  infiniteScroll() {
    this.persistScrollPosition();

    //if you've scrolled 90 perceont of the page, you probably want more
    if (window.scrollY > 0.9 * window.innerWidth && !this.state.loadingPosts) {
      this.setState({loadingPosts: true});
      this.loadPosts();
    }
  }

  render() {
    return (
      <div
        className="App"
        onKeyDown={this.easterEgg}
        tabIndex={1}
        >
        <SubredditList
          initialSubreddits={this.state.subredditDirectory}
          collapseSubredditList={this.state.collapseSubredditList}
          toggleSubredditList={this.toggleSubredditList}
          truncatePostText={this.state.truncatePostText}
          togglePostTextLength={this.togglePostTextLength}
          autoScroll={this.state.autoScroll}
          toggleAutoScroll={this.toggleAutoScroll}
          autoRefreshEnabled={this.state.autoRefreshEnabled}
          autoRefreshMinutes={this.state.autoRefreshInput}
          toggleAutoRefresh={this.toggleAutoRefresh}
          handleAutoRefreshMinutesChange={this.handleAutoRefreshMinutesChange}
          commitAutoRefreshMinutes={this.commitAutoRefreshMinutes}
          createSubreddit={this.createSubreddit}
          deleteSubreddit={this.deleteSubreddit}
        />
        <ol className="Posts">
          {this.state.posts.map((post, index) => {
            return (<Post
              thumbnail={post.thumbnail}
              score={post.score.toString()}
              linkUrl={post.linkUrl}
              title={post.title}
              bodyText={post.bodyText}
              favicon={post.favicon}
              truncatePostText={this.state.truncatePostText}
              submissionTime={post.submissionTime}
              author={post.author}
              subreddit={post.subreddit}
              commentLink={post.commentLink}
              commentCount={post.commentCount}
              key={index}
              />);
          })}
        </ol>
      </div>
    );
  }
}

export {
  buildDocumentTitle,
  formatSubredditTitlePart,
  getSubredditsFromLocation,
  getThumbnailUrl,
  getFaviconUrl,
  getStoredBoolean,
  getStoredAutoRefreshEnabled,
  getStoredAutoRefreshMinutes,
  getStoredScrollPosition,
};

export default App;
