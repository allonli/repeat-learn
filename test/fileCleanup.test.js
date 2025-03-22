const fs = require('fs');
const path = require('path');
const FileCleanupService = require('../src/renderer/services/FileCleanupService');

// 测试目录路径
const TEST_DIR = process.argv[2] || '/Users/allonli/Downloads/vs';

/**
 * 运行文件名清理测试
 */
async function runCleanupTest() {
  console.log('=== 文件名清理测试 ===');
  console.log(`目标目录: ${TEST_DIR}`);
  
  try {
    // 检查目录是否存在
    if (!fs.existsSync(TEST_DIR)) {
      console.error(`错误: 目录不存在 - ${TEST_DIR}`);
      process.exit(1);
    }
    
    console.log('开始分析目录中的文件...');
    
    // 读取目录内容
    const files = fs.readdirSync(TEST_DIR);
    console.log(`发现 ${files.length} 个文件/文件夹`);
    
    // 统计需要清理的文件
    const needCleaning = files.filter(file => {
      const needsClean = FileCleanupService.needsCleaning(file);
      if (needsClean) {
        const cleaned = FileCleanupService.sanitizeFilename(file);
        console.log(`需要清理: "${file}" -> "${cleaned}"`);
      }
      return needsClean;
    });
    
    console.log(`\n共有 ${needCleaning.length} 个文件需要重命名`);
    
    if (needCleaning.length === 0) {
      console.log('目录中没有需要清理的文件名，测试完成！');
      return;
    }
    
    // 询问是否继续
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('\n是否继续进行批量重命名？(y/n) ', async answer => {
      readline.close();
      
      if (answer.toLowerCase() === 'y') {
        console.log('\n开始重命名文件...');
        
        // 执行批量重命名
        const result = await FileCleanupService.cleanupDirectory(TEST_DIR);
        
        if (result.success) {
          console.log(`\n成功完成! 已重命名 ${result.renamed.length} 个文件`);
          
          if (result.renamed.length > 0) {
            console.log('\n重命名详情:');
            result.renamed.forEach(item => {
              console.log(`"${item.original}" -> "${item.cleaned}"`);
            });
          }
          
          if (result.errors.length > 0) {
            console.log('\n处理过程中出现以下错误:');
            result.errors.forEach(error => {
              console.log(`- ${error}`);
            });
          }
        } else {
          console.error('\n重命名操作失败!');
          if (result.errors.length > 0) {
            console.error('错误详情:');
            result.errors.forEach(error => {
              console.error(`- ${error}`);
            });
          }
        }
      } else {
        console.log('操作已取消，文件保持不变。');
      }
    });
    
  } catch (error) {
    console.error(`测试过程中出现错误: ${error.message}`);
    console.error(error.stack);
  }
}

// 运行测试
runCleanupTest(); 