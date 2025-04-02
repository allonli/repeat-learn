const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 腾讯云翻译API配置
const TX_API_HOST = 'tmt.tencentcloudapi.com';
const TX_API_SERVICE = 'tmt';
const TX_API_ACTION = 'TextTranslateBatch';
const TX_API_VERSION = '2018-03-21';
const TX_API_REGION = 'ap-shanghai';

// 配置文件路径
const CONFIG_FILE = path.join(process.env.APPDATA || process.env.HOME, '.repeat', 'config.json');

class TranslationService {
    constructor() {
        this.isTranslating = false;
        this.credentials = this.loadCredentials();
    }

    /**
     * 加载配置文件中的凭证
     * @returns {Object} 凭证对象
     */
    loadCredentials() {
        try {
            if (fs.existsSync(CONFIG_FILE)) {
                const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
                return {
                    secretId: config.txSecretId,
                    secretKey: config.txSecretKey
                };
            }
        } catch (error) {
            console.error('加载配置文件失败:', error);
        }
        return {};
    }

    /**
     * 保存凭证到配置文件
     * @param {string} secretId 腾讯云SecretId
     * @param {string} secretKey 腾讯云SecretKey
     */
    setCredentials(secretId, secretKey) {
        try {
            // 确保配置目录存在
            const configDir = path.dirname(CONFIG_FILE);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            // 读取现有配置或创建新配置
            let config = {};
            if (fs.existsSync(CONFIG_FILE)) {
                config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            }

            // 更新凭证
            config.txSecretId = secretId;
            config.txSecretKey = secretKey;

            // 保存配置
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
            this.credentials = { secretId, secretKey };
        } catch (error) {
            console.error('保存配置文件失败:', error);
            throw new Error('保存凭证失败: ' + error.message);
        }
    }

    /**
     * 检查是否已设置凭证
     * @returns {boolean} 是否已设置凭证
     */
    hasCredentials() {
        return !!(this.credentials.secretId && this.credentials.secretKey);
    }

    /**
     * 计算SHA256哈希
     * @param {string} message 待哈希的消息
     * @param {string} secret 密钥（可选）
     * @param {string} encoding 输出编码格式
     * @returns {string|Buffer} 哈希结果
     */
    sha256(message, secret = "", encoding) {
        // 添加数据类型检查和错误处理
        if (message === undefined || message === null) {
            console.error('sha256: message参数不能为undefined或null');
            message = ''; // 使用空字符串作为备选
        }
        
        if (secret === undefined || secret === null) {
            console.error('sha256: secret参数不能为undefined或null');
            secret = ''; // 使用空字符串作为备选
        }
        
        try {
            const hmac = crypto.createHmac("sha256", secret);
            return hmac.update(String(message)).digest(encoding);
        } catch (error) {
            console.error('sha256计算错误:', error);
            // 返回一个有效的默认值，防止程序崩溃
            return encoding ? crypto.createHash('sha256').update('').digest(encoding) : 
                             crypto.createHash('sha256').update('').digest();
        }
    }

    /**
     * 计算哈希值
     * @param {string} message 待哈希的消息
     * @param {string} encoding 输出编码格式
     * @returns {string} 哈希结果
     */
    getHash(message, encoding = "hex") {
        // 添加类型检查
        if (message === undefined || message === null) {
            console.error('getHash: message参数不能为undefined或null');
            message = ''; // 使用空字符串作为备选
        }
        
        try {
            const hash = crypto.createHash("sha256");
            return hash.update(String(message)).digest(encoding);
        } catch (error) {
            console.error('计算哈希值出错:', error);
            // 返回一个有效的默认哈希值
            return crypto.createHash('sha256').update('').digest(encoding);
        }
    }

    /**
     * 获取日期字符串
     * @param {number} timestamp 时间戳（秒）
     * @returns {string} 格式化的日期字符串（YYYY-MM-DD）
     */
    getDate(timestamp) {
        const date = new Date(timestamp * 1000);
        const year = date.getUTCFullYear();
        const month = ("0" + (date.getUTCMonth() + 1)).slice(-2);
        const day = ("0" + date.getUTCDate()).slice(-2);
        return `${year}-${month}-${day}`;
    }

    /**
     * 生成腾讯云API签名
     * @param {object} params 签名参数
     * @returns {object} 签名结果和请求头
     */
    generateTencentSignature(params) {
        // 检查输入参数
        if (!params || typeof params !== 'object') {
            console.error('generateTencentSignature: params必须是有效的对象');
            params = {};
        }
        
        const { 
            payload = {}, // 提供默认空对象
            action = TX_API_ACTION, 
            version = TX_API_VERSION, 
            region = TX_API_REGION 
        } = params;
        
        // 从参数或存储的凭证中获取
        const secretId = params.secretId || this.credentials.secretId;
        const secretKey = params.secretKey || this.credentials.secretKey;
        
        // 检查关键参数
        if (!secretId || !secretKey) {
            throw new Error('腾讯云API凭证缺失: 请先设置TX_SECRET_ID和TX_SECRET_KEY');
        }
        
        if (!region) {
            throw new Error('腾讯云API区域缺失: TX_API_REGION未设置');
        }
        
        const host = TX_API_HOST;
        const service = TX_API_SERVICE;
        const timestamp = Math.floor(Date.now() / 1000);
        const date = this.getDate(timestamp);
        
        // 确保payload是有效的JSON对象
        const payloadObj = payload || {};
        const payloadString = JSON.stringify(payloadObj);
        
        // 步骤1：拼接规范请求串
        const httpRequestMethod = "POST";
        const canonicalUri = "/";
        const canonicalQueryString = "";
        const signedHeaders = "content-type;host";
        const hashedRequestPayload = this.getHash(payloadString);
        
        const canonicalHeaders = 
            "content-type:application/json; charset=utf-8\n" + 
            "host:" + host + "\n";
        
        const canonicalRequest = 
            httpRequestMethod + "\n" +
            canonicalUri + "\n" +
            canonicalQueryString + "\n" +
            canonicalHeaders + "\n" +
            signedHeaders + "\n" +
            hashedRequestPayload;
        
        // 步骤2：拼接待签名字符串
        const algorithm = "TC3-HMAC-SHA256";
        const hashedCanonicalRequest = this.getHash(canonicalRequest);
        const credentialScope = date + "/" + service + "/" + "tc3_request";
        const stringToSign = 
            algorithm + "\n" +
            timestamp + "\n" +
            credentialScope + "\n" +
            hashedCanonicalRequest;
        
        // 步骤3：计算签名
        try {
            const kDate = this.sha256(date, "TC3" + secretKey);
            const kService = this.sha256(service, kDate);
            const kSigning = this.sha256("tc3_request", kService);
            const signature = this.sha256(stringToSign, kSigning, "hex");
            
            // 步骤4：拼接Authorization
            const authorization = 
                algorithm + " " +
                "Credential=" + secretId + "/" + credentialScope + ", " +
                "SignedHeaders=" + signedHeaders + ", " +
                "Signature=" + signature;
            
            // 构建请求头 - 确保设置Region值
            const headers = {
                "Authorization": authorization,
                "Content-Type": "application/json; charset=utf-8",
                "Host": host,
                "X-TC-Action": action,
                "X-TC-Timestamp": timestamp.toString(),
                "X-TC-Version": version,
                "X-TC-Region": region // 确保始终设置区域
            };
            
            console.log("请求头信息:");
            console.log("X-TC-Action:", action);
            console.log("X-TC-Version:", version);
            console.log("X-TC-Region:", region);
            
            return {
                headers,
                payload: payloadString
            };
        } catch (error) {
            console.error('计算签名时出错:', error);
            throw new Error(`生成签名失败: ${error.message}`);
        }
    }

    /**
     * 翻译文本列表
     * @param {Array<string>} textList 要翻译的文本列表
     * @param {string} targetLanguage 目标语言代码
     * @param {object} credentials 凭证对象 {secretId, secretKey}
     * @returns {Promise<Array<string>>} 翻译结果列表
     */
    async translateTextList(textList, targetLanguage = 'zh', credentials = {}) {
        if (!textList || textList.length === 0) {
            return [];
        }
        
        // 按批次处理，每批次最多100个文本
        const batchSize = 100;
        const batches = [];
        
        for (let i = 0; i < textList.length; i += batchSize) {
            batches.push(textList.slice(i, i + batchSize));
        }
        
        console.log(`将${textList.length}个文本分成${batches.length}批次处理`);
        
        // 处理所有批次
        let allResults = [];
        for (let i = 0; i < batches.length; i++) {
            console.log(`处理第${i + 1}/${batches.length}批次，包含${batches[i].length}个文本`);
            const batchResults = await this.translateBatch(batches[i], targetLanguage, credentials);
            allResults = allResults.concat(batchResults);
        }
        
        return allResults;
    }

    /**
     * 翻译一批文本
     * @param {Array<string>} textBatch 文本批次
     * @param {string} targetLanguage 目标语言
     * @param {object} credentials 凭证对象 {secretId, secretKey, region}
     * @returns {Promise<Array<string>>} 翻译结果
     */
    async translateBatch(textBatch, targetLanguage, credentials = {}) {
        return new Promise((resolve, reject) => {
            try {
                // 验证输入参数
                if (!Array.isArray(textBatch) || textBatch.length === 0) {
                    throw new Error('文本批次必须是非空数组');
                }
                
                // 确定源语言和目标语言
                let source = 'en';
                let target = 'zh';
                
                // 如果包含中文，源语言是中文，目标语言是英文
                if (this.containsChinese(textBatch[0])) {
                    source = 'zh';
                    target = 'en';
                }
                
                // 根据传入的目标语言参数覆盖默认设置
                if (targetLanguage) {
                    target = targetLanguage;
                }
                
                // 构建请求体
                const requestPayload = {
                    SourceTextList: textBatch,
                    Source: source,
                    Target: target,
                    ProjectId: 0
                };
                
                console.log('翻译请求参数:', JSON.stringify(requestPayload, null, 2));
                
                // 生成签名和请求头，传递凭证和区域
                const { headers, payload } = this.generateTencentSignature({
                    payload: requestPayload,
                    secretId: credentials.secretId || process.env.TX_SECRET_ID,
                    secretKey: credentials.secretKey || process.env.TX_SECRET_KEY,
                    region: credentials.region || TX_API_REGION // 确保传递区域参数
                });
                
                console.log('签名和请求头生成完成');

                // 构建请求选项
                const options = {
                    hostname: TX_API_HOST,
                    port: 443,
                    path: '/',
                    method: 'POST',
                    headers: headers
                };
                
                // 输出完整请求信息用于调试
                console.log('API请求详情:');
                console.log(`URL: https://${TX_API_HOST}/`);
                console.log(`方法: ${options.method}`);
                console.log(`区域: ${headers["X-TC-Region"]}`);
                console.log('请求头:', JSON.stringify(headers, null, 2));
                
                // 发送请求
                const req = https.request(options, (res) => {
                    console.log(`翻译API状态码: ${res.statusCode}`);
                    
                    let responseData = '';
                    
                    res.on('data', (chunk) => {
                        responseData += chunk;
                    });
                    
                    res.on('end', () => {
                        try {
                            console.log('翻译API响应头:', res.headers);
                            
                            // 解析响应
                            const response = JSON.parse(responseData);
                            
                            if (response.Response && response.Response.TargetTextList) {
                                console.log(`翻译成功，获得${response.Response.TargetTextList.length}条结果`);
                                resolve(response.Response.TargetTextList);
                            } else if (response.Response && response.Response.Error) {
                                const error = response.Response.Error;
                                reject(new Error(`翻译失败: ${error.Message || error.Code}`));
                            } else {
                                reject(new Error('翻译API返回了无效的数据结构'));
                            }
                        } catch (error) {
                            console.error('解析翻译API响应时出错:', error);
                            console.error('原始响应:', responseData);
                            reject(new Error(`解析翻译响应失败: ${error.message}`));
                        }
                    });
                });
                
                req.on('error', (error) => {
                    console.error('翻译请求错误:', error);
                    reject(new Error(`翻译请求失败: ${error.message}`));
                });
                
                // 设置超时
                req.setTimeout(15000, () => {
                    req.abort();
                    reject(new Error('翻译请求超时'));
                });
                
                // 写入请求体
                req.write(payload);
                
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
        
        // 如果有文本但没有中文，则需要翻译成中文
        // 如果有中文，则需要翻译成英文
        return hasText;
    }

    /**
     * 翻译字幕并更新SRT文件
     * @param {Array<object>} subtitles 字幕数组
     * @param {string} srtPath SRT文件路径
     * @param {object} credentials 凭证对象 {secretId, secretKey}
     * @returns {Promise<string>} 更新后的SRT内容
     */
    async translateSubtitles(subtitles, srtPath, credentials = {}) {
        this.isTranslating = true;
        
        try {
            console.log(`开始翻译${subtitles.length}条字幕`);
            
            // 提取需要翻译的文本
            const textsToTranslate = subtitles.map(subtitle => subtitle.text);
            
            // 确定目标语言
            const sampleText = textsToTranslate[0] || '';
            const targetLang = this.containsChinese(sampleText) ? 'en' : 'zh';
            
            // 翻译文本，传递凭证
            const translationResults = await this.translateTextList(
                textsToTranslate, 
                targetLang,
                credentials
            );
            
            // 更新字幕对象
            for (let i = 0; i < subtitles.length; i++) {
                if (i < translationResults.length) {
                    // 添加翻译，但保留原文
                    subtitles[i].translation = translationResults[i];
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