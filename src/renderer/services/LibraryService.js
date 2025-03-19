const fs = require('fs');
const path = require('path');
const fileSystemService = require(path.join(__dirname, 'FileSystemService'));
const StorageUtils = require(path.join(__dirname, '../utils/StorageUtils'));

// 存储键名
const LIBRARIES_KEY = 'libraries';
const ACTIVE_LIBRARY_INDEX_KEY = 'activeLibraryIndex';

// 库管理类
class LibraryService {
    constructor() {
        this.libraries = [];
        this.currentLibraryIndex = -1;
    }

    // 加载保存的库
    loadLibraries() {
        const savedLibraries = StorageUtils.get(LIBRARIES_KEY);
        if (savedLibraries) {
            try {
                this.libraries = savedLibraries;
                
                // 使用Electron的文件系统能力加载文件夹内容
                this.libraries.forEach((lib, index) => {
                    if (lib.path) {
                        try {
                            // 检查路径是否存在
                            if (fs.existsSync(lib.path)) {
                                // 递归读取文件夹内容
                                const filesList = [];
                                fileSystemService.collectFilesRecursively(lib.path, filesList);
                                lib.files = filesList;
                            } else {
                                console.warn(`路径不存在: ${lib.path}`);
                            }
                        } catch (error) {
                            console.error(`无法加载库文件: ${error.message}`);
                        }
                    }
                });
                
                return true;
            } catch (e) {
                console.error('Error parsing saved libraries:', e);
                this.libraries = [];
                StorageUtils.remove(LIBRARIES_KEY);
                return false;
            }
        }
        return false;
    }

    // 保存库信息到localStorage
    saveLibraries() {
        try {
            // 创建一个可序列化的库列表副本
            const serializableLibraries = this.libraries.map(lib => {
                // 只保存路径和名称
                return {
                    path: lib.path,
                    name: lib.name
                };
            });
            return StorageUtils.save(LIBRARIES_KEY, serializableLibraries);
        } catch (e) {
            console.error('Error saving libraries:', e);
            return false;
        }
    }

    // 加载上次激活的库
    loadLastActiveLibrary() {
        const lastActiveLibrary = parseInt(StorageUtils.get(ACTIVE_LIBRARY_INDEX_KEY, false) || '0');
        if (this.libraries.length > 0 && lastActiveLibrary >= 0 && lastActiveLibrary < this.libraries.length) {
            this.currentLibraryIndex = lastActiveLibrary;
            return this.libraries[this.currentLibraryIndex];
        }
        return null;
    }

    // 添加新库
    addLibrary(path, files) {
        const library = {
            path: path,
            name: fileSystemService.getLastPathSegment(path),
            files: files
        };
        
        this.libraries.push(library);
        this.currentLibraryIndex = this.libraries.length - 1;
        this.saveLibraries();
        StorageUtils.save(ACTIVE_LIBRARY_INDEX_KEY, this.currentLibraryIndex.toString(), false);
        
        return library;
    }

    // 删除库
    removeLibrary(index) {
        if (index < 0 || index >= this.libraries.length) {
            return false;
        }
        
        this.libraries.splice(index, 1);
        this.saveLibraries();
        
        if (this.currentLibraryIndex === index) {
            // 如果删除的是当前激活的库
            if (this.libraries.length > 0) {
                this.currentLibraryIndex = 0;
                StorageUtils.save(ACTIVE_LIBRARY_INDEX_KEY, '0', false);
                return this.libraries[0];
            } else {
                this.currentLibraryIndex = -1;
                StorageUtils.remove(ACTIVE_LIBRARY_INDEX_KEY);
                return null;
            }
        } else if (this.currentLibraryIndex > index) {
            // 如果删除的库在当前库前面，调整索引
            this.currentLibraryIndex--;
            StorageUtils.save(ACTIVE_LIBRARY_INDEX_KEY, this.currentLibraryIndex.toString(), false);
        }
        
        return true;
    }

    // 切换到指定库
    selectLibrary(index) {
        if (index < 0 || index >= this.libraries.length) {
            return null;
        }
        
        this.currentLibraryIndex = index;
        StorageUtils.save(ACTIVE_LIBRARY_INDEX_KEY, index.toString(), false);
        return this.libraries[index];
    }

    // 获取当前库
    getCurrentLibrary() {
        if (this.currentLibraryIndex >= 0 && this.currentLibraryIndex < this.libraries.length) {
            return this.libraries[this.currentLibraryIndex];
        }
        return null;
    }

    // 获取所有库
    getAllLibraries() {
        return this.libraries;
    }

    // 获取当前库索引
    getCurrentLibraryIndex() {
        return this.currentLibraryIndex;
    }
}

module.exports = new LibraryService(); 