const { Playlist } = require('../components/Playlist/Playlist');

describe('Playlist', () => {
  let playlist;

  beforeEach(() => {
    playlist = new Playlist();
  });

  test('should initialize with empty playlist', () => {
    expect(playlist.getItems()).toHaveLength(0);
    expect(playlist.getCurrentIndex()).toBe(-1);
  });

  test('should add items to playlist', () => {
    const items = [
      { id: 1, title: 'Video 1', path: '/path/to/video1.mp4' },
      { id: 2, title: 'Video 2', path: '/path/to/video2.mp4' }
    ];
    
    items.forEach(item => playlist.addItem(item));
    expect(playlist.getItems()).toEqual(items);
  });

  test('should remove items from playlist', () => {
    const item = { id: 1, title: 'Video 1', path: '/path/to/video1.mp4' };
    playlist.addItem(item);
    
    playlist.removeItem(1);
    expect(playlist.getItems()).toHaveLength(0);
  });

  test('should get next and previous items', () => {
    const items = [
      { id: 1, title: 'Video 1', path: '/path/to/video1.mp4' },
      { id: 2, title: 'Video 2', path: '/path/to/video2.mp4' },
      { id: 3, title: 'Video 3', path: '/path/to/video3.mp4' }
    ];
    
    items.forEach(item => playlist.addItem(item));
    
    playlist.setCurrentIndex(1);
    expect(playlist.getNextItem()).toEqual(items[2]);
    expect(playlist.getPreviousItem()).toEqual(items[0]);
  });

  test('should handle playlist navigation', () => {
    const items = [
      { id: 1, title: 'Video 1', path: '/path/to/video1.mp4' },
      { id: 2, title: 'Video 2', path: '/path/to/video2.mp4' }
    ];
    
    items.forEach(item => playlist.addItem(item));
    
    playlist.setCurrentIndex(0);
    expect(playlist.getCurrentItem()).toEqual(items[0]);
    
    playlist.setCurrentIndex(1);
    expect(playlist.getCurrentItem()).toEqual(items[1]);
  });
}); 