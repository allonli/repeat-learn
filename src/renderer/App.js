const { VideoPlayer } = require('./components/VideoPlayer/VideoPlayer');
const { SubtitleDisplay } = require('./components/SubtitleDisplay/SubtitleDisplay');
const { Playlist } = require('./components/Playlist/Playlist');

class App {
  constructor() {
    this.videoPlayer = new VideoPlayer();
    this.subtitleDisplay = new SubtitleDisplay();
    this.playlist = new Playlist();
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
  }

  async loadFolder(folderPath) {
    try {
      const videos = await this.loadVideosFromFolder(folderPath);
      this.playlist.loadFolder(folderPath);
      videos.forEach(item => this.playlist.addItem(item));
    } catch (error) {
      console.error('Failed to load folder:', error);
    }
  }

  async loadVideosFromFolder(path) {
    // 这里应该实现从文件系统加载视频文件的逻辑
    // 返回格式化的视频项数组
    return [];
  }
}

module.exports = { App }; 