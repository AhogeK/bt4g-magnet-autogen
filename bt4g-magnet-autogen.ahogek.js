// ==UserScript==
// @name         BT4G Magnet AutoGen
// @namespace    https://ahogek.com
// @version      2025-03-25
// @description  自动转换BT4G哈希到磁力链接并延迟尝试关闭页面
// @author       AhogeK
// @match        *://downloadtorrentfile.com/hash/*
// @icon         https://downloadtorrentfile.com/favicon.ico
// @grant        GM_setValue
// @grant        GM_getValue
// @updateURL    https://raw.githubusercontent.com/ahogek/bt4g-magnet-autogen/main/bt4g-magnet-autogen.ahogek.js
// @downloadURL  https://raw.githubusercontent.com/ahogek/bt4g-magnet-autogen/main/bt4g-magnet-autogen.ahogek.js
// ==/UserScript==

(function() {
    'use strict';

    const hash = window.location.pathname.split('/')[2];

    if (hash && hash.length === 40) {
        // 生成磁力链接
        const magnetLink = `magnet:?xt=urn:btih:${hash}`;

        // 获取用户设置的延迟时间（默认3秒）
        let closeDelay = localStorage.getItem('bt4g-close-delay') || 3000;

        // 检查是否已经触发过下载
        if (!sessionStorage.getItem('bt4g-download-triggered')) {
            // 标记已触发下载
            sessionStorage.setItem('bt4g-download-triggered', 'true');

            // 添加设置面板（只在第一次触发时添加）
            addSettingsPanel(closeDelay);

            // 触发下载
            window.location.href = magnetLink;

            // 延迟尝试关闭页面
            setTimeout(() => {
                try {
                    window.close();
                } catch (e) {
                    // 如果无法关闭，显示一个小通知
                    showNotification('无法自动关闭页面，请手动关闭此标签页');
                }
            }, parseInt(closeDelay));
        }
    }

    // 添加设置面板
    function addSettingsPanel(currentDelay) {
        const panel = document.createElement('div');
        panel.id = 'bt4g-settings';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #f0f0f0;
            border: 1px solid #ccc;
            border-radius: 5px;
            padding: 15px;
            z-index: 9999;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            font-family: Arial, sans-serif;
        `;

        panel.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold;">BT4G Magnet AutoGen 设置</div>
            <div style="margin-bottom: 10px;">
                尝试关闭页面延迟时间:
                <select id="bt4g-delay-select" style="margin-left: 5px;">
                    <option value="2000" ${currentDelay === 2000 ? 'selected' : ''}>2秒</option>
                    <option value="3000" ${currentDelay === 3000 ? 'selected' : ''}>3秒</option>
                    <option value="5000" ${currentDelay === 5000 ? 'selected' : ''}>5秒</option>
                    <option value="10000" ${currentDelay === 10000 ? 'selected' : ''}>10秒</option>
                </select>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <button id="bt4g-save-settings" style="padding: 5px 10px; cursor: pointer;">保存设置</button>
                <button id="bt4g-close-now" style="padding: 5px 10px; cursor: pointer;">立即关闭</button>
            </div>
        `;

        document.body.appendChild(panel);

        // 保存设置按钮事件
        document.getElementById('bt4g-save-settings').addEventListener('click', function() {
            const newDelay = document.getElementById('bt4g-delay-select').value;
            localStorage.setItem('bt4g-close-delay', newDelay);
            showNotification('设置已保存');
        });

        // 立即关闭按钮事件
        document.getElementById('bt4g-close-now').addEventListener('click', function() {
            try {
                window.close();
            } catch (e) {
                showNotification('无法自动关闭页面，请手动关闭此标签页');
            }
        });
    }

    // 显示通知
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: #333;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            animation: fadeIn 0.3s, fadeOut 0.3s 2.7s;
            opacity: 0.9;
        `;

        notification.innerHTML = message;
        document.body.appendChild(notification);

        // 添加CSS动画
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 0.9; }
            }
            @keyframes fadeOut {
                from { opacity: 0.9; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);

        // 3秒后移除通知
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 3000);
    }
})();