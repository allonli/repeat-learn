const { VideoPlayer } = require('./components/VideoPlayer/VideoPlayer');
const { SubtitleDisplay } = require('./components/SubtitleDisplay/SubtitleDisplay');
const { Playlist } = require('./components/Playlist/Playlist');
const { Library } = require('./components/Library/Library');

class App {
  constructor() {
    this.videoPlayer = new VideoPlayer();
    this.subtitleDisplay = new SubtitleDisplay();
    this.playlist = new Playlist();
    this.library = new Library();
  }

  initialize() {
    // 初始化视频播放器
    const videoElement = document.getElementById('video-player');
    this.videoPlayer.initialize(videoElement);

    // 初始化字幕显示
    const originalElement = document.getElementById('subtitle-original');
    const translationElement = document.getElementById('subtitle-translation');
    this.subtitleDisplay.initialize(originalElement, translationElement);

    // 初始化播放列表
    const playlistContainer = document.getElementById('playlist');
    this.playlist.initialize(playlistContainer);

    // 初始化库管理
    const libraryContainer = document.getElementById('libraries-list');
    this.library.initialize(libraryContainer);

    // 绑定事件
    this.bindEvents();
  }

  bindEvents() {
    // 视频播放器事件
    this.videoPlayer.element.addEventListener('timeupdate', () => {
      const currentTime = this.videoPlayer.element.currentTime;
      this.subtitleDisplay.updateDisplay(currentTime);
    });

    // 播放列表事件
    this.playlist.onItemSelect = (item) => {
      this.videoPlayer.loadVideo(item.path);
      this.videoPlayer.play();
    };

    // 库管理事件
    this.library.onLibrarySelect = (library) => {
      this.loadLibraryContent(library);
    };
  }

  async loadLibraryContent(library) {
    try {
      const content = await this.loadLibraryVideos(library.path);
      this.library.setLibraryContent(library.id, content);
      this.playlist.clear();
      content.forEach(item => this.playlist.addItem(item));
    } catch (error) {
      console.error('Failed to load library content:', error);
    }
  }

  async loadLibraryVideos(path) {
    // 这里应该实现从文件系统加载视频文件的逻辑
    // 返回格式化的视频项数组
    return [];
  }
}

module.exports = { App }; 