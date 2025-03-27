const { SubtitleDisplay } = require('../components/SubtitleDisplay/SubtitleDisplay');

describe('SubtitleDisplay', () => {
  let subtitleDisplay;

  beforeEach(() => {
    subtitleDisplay = new SubtitleDisplay();
    // 创建模拟的 DOM 元素
    const mockOriginalElement = {
      textContent: '',
    };
    const mockTranslationElement = {
      textContent: '',
    };
    subtitleDisplay.initialize(mockOriginalElement, mockTranslationElement);
  });

  test('should initialize with empty subtitles', () => {
    expect(subtitleDisplay.getSubtitles()).toHaveLength(0);
    expect(subtitleDisplay.getCurrentIndex()).toBe(-1);
  });

  test('should load subtitles from file', () => {
    const mockSubtitles = [
      { start: 0, end: 5, text: 'Hello' },
      { start: 5, end: 10, text: 'World' }
    ];
    subtitleDisplay.loadSubtitles(mockSubtitles);
    expect(subtitleDisplay.getSubtitles()).toEqual(mockSubtitles);
  });

  test('should get current subtitle based on time', () => {
    const mockSubtitles = [
      { start: 0, end: 5, text: 'Hello' },
      { start: 5, end: 10, text: 'World' }
    ];
    subtitleDisplay.loadSubtitles(mockSubtitles);
    
    expect(subtitleDisplay.getSubtitleAtTime(2)).toEqual(mockSubtitles[0]);
    expect(subtitleDisplay.getSubtitleAtTime(7)).toEqual(mockSubtitles[1]);
  });

  test('should handle translation', () => {
    const mockSubtitles = [
      { start: 0, end: 5, text: 'Hello', translation: '你好' }
    ];
    subtitleDisplay.loadSubtitles(mockSubtitles);
    subtitleDisplay.updateDisplay(2); // 设置当前时间为2秒，触发字幕显示
    
    expect(subtitleDisplay.getCurrentTranslation()).toBe('你好');
    expect(subtitleDisplay.translationElement.textContent).toBe('你好');
  });

  test('should update display based on time', () => {
    const mockSubtitles = [
      { start: 0, end: 5, text: 'Hello', translation: '你好' },
      { start: 5, end: 10, text: 'World', translation: '世界' }
    ];
    subtitleDisplay.loadSubtitles(mockSubtitles);
    
    subtitleDisplay.updateDisplay(2);
    expect(subtitleDisplay.originalElement.textContent).toBe('Hello');
    expect(subtitleDisplay.translationElement.textContent).toBe('你好');
    
    subtitleDisplay.updateDisplay(7);
    expect(subtitleDisplay.originalElement.textContent).toBe('World');
    expect(subtitleDisplay.translationElement.textContent).toBe('世界');
  });
}); 