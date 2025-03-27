class Library {
  constructor() {
    this.libraries = [];
    this.activeLibraryId = null;
    this.libraryContent = new Map();
    this.container = null;
  }

  initialize(container) {
    this.container = container;
    this.render();
  }

  addLibrary(libraryData) {
    this.libraries.push(libraryData);
    this.render();
  }

  removeLibrary(id) {
    this.libraries = this.libraries.filter(lib => lib.id !== id);
    this.libraryContent.delete(id);
    if (this.activeLibraryId === id) {
      this.activeLibraryId = null;
    }
    this.render();
  }

  getLibraries() {
    return this.libraries;
  }

  getActiveLibrary() {
    return this.libraries.find(lib => lib.id === this.activeLibraryId) || null;
  }

  setActiveLibrary(id) {
    if (this.libraries.some(lib => lib.id === id)) {
      this.activeLibraryId = id;
      this.render();
    }
  }

  setLibraryContent(id, content) {
    this.libraryContent.set(id, content);
  }

  getLibraryContent(id) {
    return this.libraryContent.get(id) || [];
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = '';
    this.libraries.forEach(library => {
      const libraryElement = document.createElement('div');
      libraryElement.className = `library-item ${library.id === this.activeLibraryId ? 'active' : ''}`;
      libraryElement.innerHTML = `
        <span class="name">${library.name}</span>
        <button class="remove-btn" data-id="${library.id}">×</button>
      `;

      libraryElement.addEventListener('click', () => {
        this.setActiveLibrary(library.id);
      });

      const removeBtn = libraryElement.querySelector('.remove-btn');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeLibrary(library.id);
      });

      this.container.appendChild(libraryElement);
    });
  }
}

module.exports = { Library }; 