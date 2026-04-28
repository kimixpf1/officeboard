/**
 * Web Crypto API 加密模块
 * 用于本地安全存储敏感信息（如API Key）
 */

class CryptoManager {
    constructor() {
        this.keyPair = null;
        this.masterKey = null;
    }

    /**
     * 生成或获取主密钥
     */
    async getMasterKey() {
        if (this.masterKey) return this.masterKey;

        try {
            let storedKey = await db.getSetting('crypto_master_key');

            if (!storedKey) {
                const legacyKey = SafeStorage.get('crypto_master_key');
                if (legacyKey) {
                    storedKey = legacyKey;
                    await db.setSetting('crypto_master_key', legacyKey);
                    SafeStorage.remove('crypto_master_key');
                }
            }

            if (storedKey) {
                const keyData = this.base64ToArrayBuffer(storedKey);
                this.masterKey = await crypto.subtle.importKey(
                    'raw',
                    keyData,
                    { name: 'AES-GCM', length: 256 },
                    false,
                    ['encrypt', 'decrypt']
                );
            } else {
                this.masterKey = await crypto.subtle.generateKey(
                    { name: 'AES-GCM', length: 256 },
                    true,
                    ['encrypt', 'decrypt']
                );

                const exported = await crypto.subtle.exportKey('raw', this.masterKey);
                await db.setSetting('crypto_master_key', this.arrayBufferToBase64(exported));
            }

            return this.masterKey;
        } catch (error) {
            console.error('获取主密钥失败:', error);
            throw new Error('加密功能初始化失败，请使用HTTPS或检查浏览器兼容性');
        }
    }

    /**
     * 加密数据
     */
    async encrypt(data) {
        try {
            const key = await this.getMasterKey();

            // 生成随机IV
            const iv = crypto.getRandomValues(new Uint8Array(12));

            // 编码数据
            const encoder = new TextEncoder();
            const encodedData = encoder.encode(data);

            // 加密
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                key,
                encodedData
            );

            // 组合IV和加密数据
            const result = new Uint8Array(iv.length + encrypted.byteLength);
            result.set(iv);
            result.set(new Uint8Array(encrypted), iv.length);

            return this.arrayBufferToBase64(result);
        } catch (error) {
            console.error('加密失败:', error);
            throw error;
        }
    }

    /**
     * 解密数据
     */
    async decrypt(encryptedData) {
        try {
            const key = await this.getMasterKey();

            // 解码数据
            const data = this.base64ToArrayBuffer(encryptedData);

            // 提取IV
            const iv = data.slice(0, 12);
            const encrypted = data.slice(12);

            // 解密
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                key,
                encrypted
            );

            // 解码结果
            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (error) {
            console.error('解密失败:', error);
            throw error;
        }
    }

    async secureStoreSecret(secretName, secretValue) {
        try {
            const encrypted = await this.encrypt(secretValue);
            await db.setSetting(`${secretName}_encrypted`, encrypted);
            await db.setSetting(`${secretName}_set`, true);
            return true;
        } catch (error) {
            console.error('存储敏感信息失败:', error);
            return false;
        }
    }

    async secureGetSecret(secretName) {
        try {
            const encrypted = await db.getSetting(`${secretName}_encrypted`);
            if (!encrypted) return null;

            return await this.decrypt(encrypted);
        } catch (error) {
            console.error('获取敏感信息失败:', error);
            return null;
        }
    }

    async hasSecret(secretName) {
        const hasKey = await db.getSetting(`${secretName}_set`);
        return !!hasKey;
    }

    async clearSecret(secretName) {
        await db.setSetting(`${secretName}_encrypted`, null);
        await db.setSetting(`${secretName}_set`, false);
    }

    async secureStoreApiKey(apiKey) {
        return this.secureStoreSecret('kimi_api_key', apiKey);
    }

    async secureGetApiKey() {
        return this.secureGetSecret('kimi_api_key');
    }

    async hasApiKey() {
        return this.hasSecret('kimi_api_key');
    }

    async clearApiKey() {
        await this.clearSecret('kimi_api_key');
    }

    /**
     * ArrayBuffer转Base64
     */
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Base64转ArrayBuffer
     */
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * 生成安全的随机ID
     */
    generateSecureId() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * 计算文件哈希（用于去重）
     */
    async calculateFileHash(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('计算文件哈希失败:', error);
            return null;
        }
    }

    /**
     * 计算文本哈希
     */
    async calculateTextHash(text) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(text);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error('计算文本哈希失败:', error);
            return null;
        }
    }
}

// 创建全局加密管理器实例
const cryptoManager = new CryptoManager();
