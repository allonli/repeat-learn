class VideoPlayer {
  constructor() {
    this.playbackRate = 1.0;
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 0;
    this.element = null;
    this.currentVideo = null;
  }

  initialize(element) {
    this.element = element;
    this.element.addEventListener('timeupdate', () => {
      this.currentTime = this.element.currentTime;
    });
    this.element.addEventListener('loadedmetadata', () => {
      this.duration = this.element.duration;
    });
  }

  setPlaybackRate(rate) {
    this.playbackRate = rate;
    if (this.element) {
      this.element.playbackRate = rate;
    }
  }

  togglePlay() {
    if (!this.element) return;
    
    if (this.isPlaying) {
      this.element.pause();
    } else {
      this.element.play();
    }
    this.isPlaying = !this.isPlaying;
  }

  seekTo(time) {
    if (!this.element) return;
    this.element.currentTime = time;
    this.currentTime = time;
  }

  getCurrentTime() {
    return this.currentTime;
  }

  getDuration() {
    return this.duration;
  }

  loadVideo(path) {
    this.currentVideo = path;
    if (this.element) {
      this.element.src = path;
      this.currentTime = 0;
      this.duration = 0;
    }
  }

  play() {
    if (this.element) {
      this.element.play();
      this.isPlaying = true;
    }
  }

  pause() {
    if (this.element) {
      this.element.pause();
      this.isPlaying = false;
    }
  }
}

module.exports = { VideoPlayer }; 