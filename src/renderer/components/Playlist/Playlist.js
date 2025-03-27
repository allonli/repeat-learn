class Playlist {
  constructor() {
    this.items = [];
    this.currentIndex = -1;
    this.container = null;
    this.onItemSelect = null;
  }

  initialize(container) {
    this.container = container;
    this.render();
  }

  addItem(item) {
    this.items.push(item);
    this.render();
  }

  removeItem(id) {
    this.items = this.items.filter(item => item.id !== id);
    if (this.currentIndex >= this.items.length) {
      this.currentIndex = this.items.length - 1;
    }
    this.render();
  }

  getItems() {
    return this.items;
  }

  getCurrentIndex() {
    return this.currentIndex;
  }

  setCurrentIndex(index) {
    if (index >= -1 && index < this.items.length) {
      this.currentIndex = index;
      if (this.onItemSelect && index >= 0) {
        this.onItemSelect(this.items[index]);
      }
      this.render();
    }
  }

  getCurrentItem() {
    if (this.currentIndex >= 0 && this.currentIndex < this.items.length) {
      return this.items[this.currentIndex];
    }
    return null;
  }

  getNextItem() {
    if (this.currentIndex < this.items.length - 1) {
      return this.items[this.currentIndex + 1];
    }
    return null;
  }

  getPreviousItem() {
    if (this.currentIndex > 0) {
      return this.items[this.currentIndex - 1];
    }
    return null;
  }

  clear() {
    this.items = [];
    this.currentIndex = -1;
    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = '';
    this.items.forEach((item, index) => {
      const itemElement = document.createElement('div');
      itemElement.className = `playlist-item ${index === this.currentIndex ? 'active' : ''}`;
      itemElement.innerHTML = `
        <span class="title">${item.title}</span>
        <button class="remove-btn" data-id="${item.id}">×</button>
      `;

      itemElement.addEventListener('click', () => {
        this.setCurrentIndex(index);
      });

      const removeBtn = itemElement.querySelector('.remove-btn');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeItem(item.id);
      });

      this.container.appendChild(itemElement);
    });
  }
}

module.exports = { Playlist }; 