const { Library } = require('../components/Library/Library');

describe('Library', () => {
  let library;

  beforeEach(() => {
    library = new Library();
  });

  test('should initialize with empty libraries', () => {
    expect(library.getLibraries()).toHaveLength(0);
    expect(library.getActiveLibrary()).toBeNull();
  });

  test('should add new library', () => {
    const libraryData = {
      id: 1,
      name: 'My Library',
      path: '/path/to/library'
    };
    
    library.addLibrary(libraryData);
    expect(library.getLibraries()).toContainEqual(libraryData);
  });

  test('should remove library', () => {
    const libraryData = {
      id: 1,
      name: 'My Library',
      path: '/path/to/library'
    };
    
    library.addLibrary(libraryData);
    library.removeLibrary(1);
    expect(library.getLibraries()).not.toContainEqual(libraryData);
  });

  test('should set active library', () => {
    const libraryData = {
      id: 1,
      name: 'My Library',
      path: '/path/to/library'
    };
    
    library.addLibrary(libraryData);
    library.setActiveLibrary(1);
    expect(library.getActiveLibrary()).toEqual(libraryData);
  });

  test('should handle library content', () => {
    const libraryData = {
      id: 1,
      name: 'My Library',
      path: '/path/to/library'
    };
    
    const content = [
      { id: 1, title: 'Video 1', path: '/path/to/video1.mp4' },
      { id: 2, title: 'Video 2', path: '/path/to/video2.mp4' }
    ];
    
    library.addLibrary(libraryData);
    library.setLibraryContent(1, content);
    expect(library.getLibraryContent(1)).toEqual(content);
  });
}); 