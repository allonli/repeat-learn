const { App } = require('../App');

describe('App', () => {
  let app;
  let mockElements;

  beforeEach(() => {
    mockElements = {
      'video-player': {
        play: jest.fn(),
        pause: jest.fn(),
        addEventListener: jest.fn(),
        currentTime: 0,
        playbackRate: 1.0,
        src: ''
      },
      'subtitle-original': {
        textContent: ''
      },
      'subtitle-translation': {
        textContent: ''
      },
      'playlist': {
        innerHTML: '',
        appendChild: jest.fn()
      }
    };

    // Mock document.getElementById
    document.getElementById = jest.fn((id) => mockElements[id]);

    app = new App();
    app.initialize();
  });

  test('should initialize all components', () => {
    expect(app.videoPlayer.element).toBe(mockElements['video-player']);
    expect(app.subtitleDisplay.originalElement).toBe(mockElements['subtitle-original']);
    expect(app.subtitleDisplay.translationElement).toBe(mockElements['subtitle-translation']);
    expect(app.playlist.container).toBe(mockElements['playlist']);
  });

  test('should bind video player events', () => {
    // 触发 timeupdate 事件
    const timeupdateCallback = mockElements['video-player'].addEventListener.mock.calls
      .find(call => call[0] === 'timeupdate')[1];
    
    mockElements['video-player'].currentTime = 5;
    timeupdateCallback();
    
    // 验证字幕显示是否更新
    const mockSubtitles = [
      { start: 0, end: 10, text: 'Test', translation: '测试' }
    ];
    app.subtitleDisplay.loadSubtitles(mockSubtitles);
    app.subtitleDisplay.updateDisplay(5);
    
    expect(mockElements['subtitle-original'].textContent).toBe('Test');
    expect(mockElements['subtitle-translation'].textContent).toBe('测试');
  });

  test('should handle playlist item selection', () => {
    const mockItem = {
      id: 1,
      title: 'Test Video',
      path: '/path/to/video.mp4'
    };
    
    app.playlist.onItemSelect(mockItem);
    
    expect(app.videoPlayer.currentVideo).toBe(mockItem.path);
    expect(mockElements['video-player'].play).toHaveBeenCalled();
  });

  test('should handle folder loading', async () => {
    const mockFolderPath = '/path/to/folder';
    const mockVideos = [
      { id: 1, title: 'Video 1', path: '/path/to/video1.mp4' },
      { id: 2, title: 'Video 2', path: '/path/to/video2.mp4' }
    ];

    // Mock loadVideosFromFolder
    app.loadVideosFromFolder = jest.fn().mockResolvedValue(mockVideos);

    await app.loadFolder(mockFolderPath);

    expect(app.playlist.currentFolder).toBe(mockFolderPath);
    expect(app.playlist.getItems()).toEqual(mockVideos);
  });
}); 