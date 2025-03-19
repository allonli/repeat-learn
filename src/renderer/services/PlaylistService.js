const path = require('path');
const fileSystemService = require(path.join(__dirname, 'FileSystemService'));

// 播放列表服务
class PlaylistService {
    constructor() {
        this.folders = {};
    }

    // 生成播放列表内容
    populatePlaylist(files, container, onItemClick) {
        if (!container) return;
        container.innerHTML = '';
        
        // 防御性检查 - 确保files存在
        if (!files) {
            container.innerHTML = '<div class="empty-message">No files available</div>';
            return;
        }
        
        try {
            // 组织文件到文件夹结构
            this.folders = fileSystemService.organizeFilesIntoFolders(files);
            
            // 如果没有有效的文件夹和文件
            if (Object.keys(this.folders).length === 0) {
                container.innerHTML = '<div class="empty-message">No video files found</div>';
                return;
            }
            
            // 渲染文件夹和文件
            Object.keys(this.folders).sort().forEach(folderName => {
                if (folderName === '_root_') {
                    // 直接在播放列表中渲染根文件
                    this.folders[folderName].forEach(file => {
                        this.createPlaylistItem(file, container, onItemClick);
                    });
                } else {
                    // 创建带有文件的文件夹
                    const folderElement = document.createElement('div');
                    folderElement.className = 'playlist-folder';
                    
                    const folderHeader = document.createElement('div');
                    folderHeader.className = 'folder-header';
                    folderHeader.innerHTML = `<i class="fas fa-chevron-down"></i> ${folderName}`;
                    
                    const folderContent = document.createElement('div');
                    folderContent.className = 'folder-content';
                    
                    // 添加点击事件以切换文件夹内容
                    folderHeader.addEventListener('click', () => {
                        this.toggleFolder(folderHeader);
                    });
                    
                    // 添加文件到文件夹
                    this.folders[folderName].forEach(file => {
                        this.createPlaylistItem(file, folderContent, onItemClick);
                    });
                    
                    folderElement.appendChild(folderHeader);
                    folderElement.appendChild(folderContent);
                    container.appendChild(folderElement);
                }
            });
        } catch (error) {
            console.error("Error populating playlist:", error);
            container.innerHTML = `<div class="empty-message">Error loading files: ${error.message}</div>`;
        }
    }

    // 创建播放列表项目
    createPlaylistItem(file, container, onItemClick) {
        const item = document.createElement('div');
        item.className = 'playlist-item';
        item.textContent = file.name;
        
        // 在数据属性中存储完整的文件路径
        if (file.webkitRelativePath) {
            item.dataset.filePath = file.webkitRelativePath;
        }
        
        if (typeof onItemClick === 'function') {
            item.addEventListener('click', () => {
                onItemClick(file, item);
            });
        }
        
        container.appendChild(item);
        return item;
    }

    // 切换文件夹展开/折叠
    toggleFolder(folderHeader) {
        folderHeader.classList.toggle('collapsed');
        const folderContent = folderHeader.nextElementSibling;
        folderContent.classList.toggle('collapsed');
    }

    // 获取文件夹
    getFolders() {
        return this.folders;
    }

    // 更新播放列表项目激活状态
    updateActiveItem(item) {
        document.querySelectorAll('.playlist-item').forEach(el => {
            el.classList.remove('active');
        });
        
        if (item) {
            item.classList.add('active');
        }
    }
}

module.exports = new PlaylistService(); 