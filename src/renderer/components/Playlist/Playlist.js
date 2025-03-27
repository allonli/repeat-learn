class Playlist {
  constructor() {
    this.items = [];
    this.currentIndex = -1;
    this.container = null;
    this.onItemSelect = null;
    this.currentFolder = null;
  }

  initialize(container) {
    this.container = container;
    this.render();
  }

  loadFolder(folderPath) {
    this.currentFolder = folderPath;
    this.items = [];
    this.currentIndex = -1;
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
    this.currentFolder = null;
    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = '';
    
    // 添加文件夹信息
    if (this.currentFolder) {
      const folderElement = document.createElement('div');
      folderElement.className = 'folder-info';
      folderElement.innerHTML = `
        <span class="folder-path">${this.currentFolder}</span>
        <button class="clear-btn">×</button>
      `;
      
      const clearBtn = folderElement.querySelector('.clear-btn');
      clearBtn.addEventListener('click', () => {
        this.clear();
      });
      
      this.container.appendChild(folderElement);
    }

    // 添加视频列表
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