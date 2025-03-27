const { VideoPlayer } = require('../components/VideoPlayer/VideoPlayer');

describe('VideoPlayer', () => {
  let videoPlayer;

  beforeEach(() => {
    videoPlayer = new VideoPlayer();
    // 创建一个模拟的视频元素
    const mockVideoElement = {
      play: jest.fn(),
      pause: jest.fn(),
      addEventListener: jest.fn(),
      currentTime: 0,
      playbackRate: 1.0
    };
    videoPlayer.initialize(mockVideoElement);
  });

  test('should initialize with default settings', () => {
    expect(videoPlayer.playbackRate).toBe(1.0);
    expect(videoPlayer.isPlaying).toBe(false);
    expect(videoPlayer.currentTime).toBe(0);
  });

  test('should update playback rate', () => {
    videoPlayer.setPlaybackRate(1.5);
    expect(videoPlayer.playbackRate).toBe(1.5);
    expect(videoPlayer.element.playbackRate).toBe(1.5);
  });

  test('should toggle play/pause state', () => {
    videoPlayer.togglePlay();
    expect(videoPlayer.isPlaying).toBe(true);
    expect(videoPlayer.element.play).toHaveBeenCalled();
    
    videoPlayer.togglePlay();
    expect(videoPlayer.isPlaying).toBe(false);
    expect(videoPlayer.element.pause).toHaveBeenCalled();
  });

  test('should seek to specific time', () => {
    videoPlayer.seekTo(30);
    expect(videoPlayer.currentTime).toBe(30);
    expect(videoPlayer.element.currentTime).toBe(30);
  });
}); 