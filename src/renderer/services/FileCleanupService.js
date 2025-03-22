const fs = require('fs');
const path = require('path');

/**
 * 服务用于清理文件名并处理批量重命名
 */
class FileCleanupService {
  /**
   * 清理文件名中的特殊字符
   * @param {string} filename 原始文件名
   * @returns {string} 清理后的文件名
   */
  static sanitizeFilename(filename) {
    // 保留文件扩展名
    const extname = path.extname(filename);
    const basename = path.basename(filename, extname);
    
    // 移除或替换可能导致问题的特殊字符
    let cleanBasename = basename
      .replace(/[#?%*:|"<>]/g, '')   // 移除文件系统禁止的字符
      .replace(/[\(\)\[\]]/g, '')    // 移除括号
      .replace(/['`]/g, '')          // 移除引号
      .replace(/\s+/g, '_')          // 将空格替换为下划线
      .replace(/\.+/g, '.')          // 将多个点替换为单个点
      .replace(/__+/g, '_')          // 将多个下划线替换为单个下划线
      .replace(/^_+|_+$/g, '');      // 移除开始和结尾的下划线

    // 只保留前8个单词
    const words = cleanBasename.split('_');
    if (words.length > 8) {
      cleanBasename = words.slice(0, 8).join('_');
    }

    return cleanBasename + extname;
  }

  /**
   * 检查文件名是否需要清理
   * @param {string} filename 文件名
   * @returns {boolean} 如果文件名需要清理，则返回true
   */
  static needsCleaning(filename) {
    return filename !== this.sanitizeFilename(filename);
  }

  /**
   * 批量重命名目录中的文件
   * @param {string} directoryPath 需要处理的目录路径
   * @returns {Promise<{success: boolean, renamed: Array, errors: Array}>} 重命名结果
   */
  static async cleanupDirectory(directoryPath) {
    return new Promise((resolve, reject) => {
      try {
        // 检查目录是否存在
        if (!fs.existsSync(directoryPath)) {
          return resolve({
            success: false,
            renamed: [],
            errors: [`目录不存在: ${directoryPath}`]
          });
        }

        // 读取目录中的所有文件
        fs.readdir(directoryPath, (err, files) => {
          if (err) {
            return resolve({
              success: false,
              renamed: [],
              errors: [`读取目录失败: ${err.message}`]
            });
          }

          const result = {
            success: true,
            renamed: [],
            errors: []
          };

          // 处理每个文件
          const promises = files.map(filename => {
            return new Promise(fileResolve => {
              const filePath = path.join(directoryPath, filename);

              // 检查是否是文件而不是目录
              fs.stat(filePath, (statErr, stats) => {
                if (statErr) {
                  result.errors.push(`无法获取文件状态 ${filename}: ${statErr.message}`);
                  return fileResolve();
                }

                // 只处理文件，不处理目录
                if (!stats.isFile()) {
                  return fileResolve();
                }

                // 检查文件是否需要重命名
                if (this.needsCleaning(filename)) {
                  const newFilename = this.sanitizeFilename(filename);
                  const newFilePath = path.join(directoryPath, newFilename);

                  // 检查新文件名是否已存在
                  if (fs.existsSync(newFilePath)) {
                    // 如果文件已存在，添加时间戳以避免冲突
                    const timestamp = Date.now();
                    const extname = path.extname(newFilename);
                    const basename = path.basename(newFilename, extname);
                    const uniqueFilename = `${basename}_${timestamp}${extname}`;
                    const uniqueFilePath = path.join(directoryPath, uniqueFilename);

                    fs.rename(filePath, uniqueFilePath, renameErr => {
                      if (renameErr) {
                        result.errors.push(`重命名文件失败 ${filename}: ${renameErr.message}`);
                      } else {
                        result.renamed.push({
                          original: filename,
                          cleaned: uniqueFilename
                        });
                      }
                      fileResolve();
                    });
                  } else {
                    // 重命名文件
                    fs.rename(filePath, newFilePath, renameErr => {
                      if (renameErr) {
                        result.errors.push(`重命名文件失败 ${filename}: ${renameErr.message}`);
                      } else {
                        result.renamed.push({
                          original: filename,
                          cleaned: newFilename
                        });
                      }
                      fileResolve();
                    });
                  }
                } else {
                  fileResolve();
                }
              });
            });
          });

          // 等待所有文件处理完成
          Promise.all(promises).then(() => {
            resolve(result);
          });
        });
      } catch (error) {
        resolve({
          success: false,
          renamed: [],
          errors: [`处理目录时出错: ${error.message}`]
        });
      }
    });
  }
}

module.exports = FileCleanupService; 