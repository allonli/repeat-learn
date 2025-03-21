const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 火山引擎翻译API凭证
const VOLC_ACCESS_KEY_ID = process.env.VOLC_ACCESS_KEY_ID;
const VOLC_SECRET_ACCESS_KEY = process.env.VOLC_SECRET_ACCESS_KEY;
const VOLC_API_HOST = 'translate.volcengineapi.com';
const VOLC_API_REGION = 'cn-north-1';
const VOLC_API_SERVICE = 'translate';
const VOLC_API_VERSION = '2020-06-01';
const VOLC_ACTION = 'TranslateText';

class TranslationService {
    constructor() {
        this.isTranslating = false;
    }

    /**
     * 生成ISO8601格式的时间戳
     * @returns {string} ISO8601格式的时间戳
     */
    getFormattedDate() {
        const now = new Date();
        return now.toISOString()
            .replaceAll('-', '')
            .replaceAll(':', '')
            .replaceAll(/\.[0-9]*/g, '');
    }

    /**
     * 生成签名
     * @param {string} stringToSign 要签名的字符串
     * @param {string} secret 密钥
     * @returns {string} 签名
     */
    signWithHmacSha256(stringToSign, secret) {
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(stringToSign);
        return hmac.digest('hex');
    }

    /**
     * 翻译文本列表
     * @param {Array<string>} textList 要翻译的文本列表
     * @param {string} targetLanguage 目标语言代码
     * @returns {Promise<Array<object>>} 翻译结果列表
     */
    async translateTextList(textList, targetLanguage = 'zh') {
        if (!textList || textList.length === 0) {
            return [];
        }
        
        // 按批次处理，每批次最多15个文本
        const batchSize = 15;
        const batches = [];
        
        for (let i = 0; i < textList.length; i += batchSize) {
            batches.push(textList.slice(i, i + batchSize));
        }
        
        console.log(`将${textList.length}个文本分成${batches.length}批次处理`);
        
        // 处理所有批次
        let allResults = [];
        for (let i = 0; i < batches.length; i++) {
            console.log(`处理第${i + 1}/${batches.length}批次，包含${batches[i].length}个文本`);
            const batchResults = await this.translateBatch(batches[i], targetLanguage);
            allResults = allResults.concat(batchResults);
        }
        
        return allResults;
    }

    /**
     * 翻译一批文本
     * @param {Array<string>} textBatch 文本批次
     * @param {string} targetLanguage 目标语言
     * @returns {Promise<Array<object>>} 翻译结果
     */
    async translateBatch(textBatch, targetLanguage) {
        return new Promise((resolve, reject) => {
            try {
                const formatDate = this.getFormattedDate();
                const date = formatDate.slice(0, 8);
                
                // 构建请求体
                const requestBody = {
                    TargetLanguage: targetLanguage,
                    TextList: textBatch
                };
                
                const bodyString = JSON.stringify(requestBody);
                const bodyHash = crypto.createHash('sha256').update(bodyString).digest('hex');

                // 构建签名所需信息
                const signedHeaders = {
                    'content-type': 'application/json',
                    'host': VOLC_API_HOST,
                    'x-content-sha256': bodyHash,
                    'x-date': formatDate
                };

                // 生成签名字符串
                let signedHeadersStr = '';
                let signedHeadersList = '';
                for (const [key, value] of Object.entries(signedHeaders)) {
                    signedHeadersStr += `${key}:${value}\n`;
                    signedHeadersList += `${key};`;
                }
                signedHeadersList = signedHeadersList.slice(0, -1);

                const credentialScope = `${date}/${VOLC_API_REGION}/${VOLC_API_SERVICE}/request`;
                const canonicalRequest = [
                    'POST',
                    '/',
                    `Action=${VOLC_ACTION}&Version=${VOLC_API_VERSION}`,
                    signedHeadersStr,
                    signedHeadersList,
                    bodyHash
                ].join('\n');

                const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
                
                // 生成签名
                const kDate = this.signWithHmacSha256(date, VOLC_SECRET_ACCESS_KEY);
                const kRegion = this.signWithHmacSha256(VOLC_API_REGION, kDate);
                const kService = this.signWithHmacSha256(VOLC_API_SERVICE, kRegion);
                const signingKey = this.signWithHmacSha256('request', kService);

                const stringToSign = [
                    'HMAC-SHA256',
                    formatDate,
                    credentialScope,
                    hashedCanonicalRequest
                ].join('\n');

                const signature = this.signWithHmacSha256(stringToSign, signingKey);
                
                // 构建请求选项
                const options = {
                    hostname: VOLC_API_HOST,
                    port: 443,
                    path: `/?Action=${VOLC_ACTION}&Version=${VOLC_API_VERSION}`,
                    method: 'POST',
                    headers: {
                        'Host': VOLC_API_HOST,
                        'Content-Type': 'application/json',
                        'X-Content-SHA256': bodyHash,
                        'X-Date': formatDate,
                        'Content-Length': Buffer.byteLength(bodyString),
                        'Authorization': `HMAC-SHA256 Credential=${VOLC_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeadersList}, Signature=${signature}`
                    }
                };
                
                console.log('翻译请求选项:', {
                    url: `https://${VOLC_API_HOST}${options.path}`,
                    method: 'POST',
                    headers: options.headers,
                    body: requestBody
                });
                
                // 发送请求
                const req = https.request(options, (res) => {
                    console.log(`翻译API状态码: ${res.statusCode}`);
                    
                    let responseData = '';
                    
                    res.on('data', (chunk) => {
                        responseData += chunk;
                    });
                    
                    res.on('end', () => {
                        try {
                            console.log('翻译API原始响应:', responseData);
                            
                            // 解析响应
                            const response = JSON.parse(responseData);
                            
                            if (response.TranslationList) {
                                console.log(`翻译成功，获得${response.TranslationList.length}条结果`);
                                resolve(response.TranslationList);
                            } else if (response.ResponseMetadata && response.ResponseMetadata.Error) {
                                const error = response.ResponseMetadata.Error;
                                reject(new Error(`翻译失败: ${error.Message || error.Code}`));
                            } else {
                                reject(new Error('翻译API返回了无效的数据结构'));
                            }
                        } catch (error) {
                            console.error('解析翻译API响应时出错:', error);
                            reject(new Error(`解析翻译响应失败: ${error.message}`));
                        }
                    });
                });
                
                req.on('error', (error) => {
                    console.error('翻译请求错误:', error);
                    reject(new Error(`翻译请求失败: ${error.message}`));
                });
                
                // 设置超时
                req.setTimeout(10000, () => {
                    req.abort();
                    reject(new Error('翻译请求超时'));
                });
                
                // 写入请求体
                req.write(bodyString);
                
                // 结束请求
                req.end();
                
            } catch (error) {
                console.error('构建翻译请求时出错:', error);
                reject(new Error(`构建翻译请求失败: ${error.message}`));
            }
        });
    }

    /**
     * 检测字幕中是否包含中文
     * @param {string} text 字幕文本
     * @returns {boolean} 是否包含中文
     */
    containsChinese(text) {
        const chineseRegex = /[\u4e00-\u9fa5]/;
        return chineseRegex.test(text);
    }

    /**
     * 检查字幕是否需要翻译
     * @param {Array<object>} subtitles 字幕数组
     * @returns {boolean} 是否需要翻译
     */
    needsTranslation(subtitles) {
        if (!subtitles || subtitles.length === 0) {
            return false;
        }
        
        // 检查前10个字幕或所有字幕（取较小值）
        const checkCount = Math.min(10, subtitles.length);
        let hasText = false;
        let hasChinese = false;
        
        for (let i = 0; i < checkCount; i++) {
            if (subtitles[i].text && subtitles[i].text.trim()) {
                hasText = true;
                if (this.containsChinese(subtitles[i].text)) {
                    hasChinese = true;
                    break;
                }
            }
        }
        
        // 如果有文本但没有中文，则需要翻译
        return hasText && !hasChinese;
    }

    /**
     * 翻译字幕并更新SRT文件
     * @param {Array<object>} subtitles 字幕数组
     * @param {string} srtPath SRT文件路径
     * @returns {Promise<string>} 更新后的SRT内容
     */
    async translateSubtitles(subtitles, srtPath) {
        this.isTranslating = true;
        
        try {
            console.log(`开始翻译${subtitles.length}条字幕`);
            
            // 提取需要翻译的文本
            const textsToTranslate = subtitles.map(subtitle => subtitle.text);
            
            // 翻译文本
            const translationResults = await this.translateTextList(textsToTranslate);
            
            // 更新字幕对象
            for (let i = 0; i < subtitles.length; i++) {
                if (i < translationResults.length) {
                    // 添加翻译，但保留原文
                    subtitles[i].translation = translationResults[i].Translation;
                }
            }
            
            // 生成新的SRT内容
            const updatedSrtContent = this.generateSrtContent(subtitles);
            
            // 将新内容写入文件
            if (srtPath) {
                await this.writeSrtFile(srtPath, updatedSrtContent);
            }
            
            console.log('字幕翻译完成');
            this.isTranslating = false;
            
            return updatedSrtContent;
        } catch (error) {
            console.error('翻译字幕失败:', error);
            this.isTranslating = false;
            throw error;
        }
    }

    /**
     * 生成SRT格式内容
     * @param {Array<object>} subtitles 字幕数组
     * @returns {string} SRT格式内容
     */
    generateSrtContent(subtitles) {
        let content = '';
        
        subtitles.forEach((subtitle, index) => {
            // 序号
            content += `${index + 1}\n`;
            
            // 时间戳
            const startTime = this.formatSrtTime(subtitle.startTime);
            const endTime = this.formatSrtTime(subtitle.endTime);
            content += `${startTime} --> ${endTime}\n`;
            
            // 原文
            content += subtitle.text;
            
            // 如果有翻译，添加翻译
            if (subtitle.translation) {
                content += `\n${subtitle.translation}`;
            }
            
            // 添加空行分隔
            content += '\n\n';
        });
        
        return content;
    }

    /**
     * 将秒数格式化为SRT时间格式
     * @param {number} seconds 秒数
     * @returns {string} SRT时间格式
     */
    formatSrtTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
        
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
    }

    /**
     * 写入SRT文件
     * @param {string} filePath 文件路径
     * @param {string} content 文件内容
     * @returns {Promise<void>}
     */
    async writeSrtFile(filePath, content) {
        return new Promise((resolve, reject) => {
            fs.writeFile(filePath, content, 'utf8', (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * 检查翻译状态
     * @returns {boolean} 是否正在翻译
     */
    isTranslationInProgress() {
        return this.isTranslating;
    }
}

module.exports = new TranslationService(); 