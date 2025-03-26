// ==UserScript==
// @name         BT4G Magnet AutoGen
// @namespace    https://ahogek.com
// @version      1.0.2
// @description  自动转换BT4G哈希到磁力链接并延迟尝试关闭页面
// @author       AhogeK
// @match        *://*.bt4g.org/*
// @match        *://*.bt4gprx.com/*
// @match        *://*.bt4g.com/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/AhogeK/bt4g-magnet-autogen/master/bt4g-magnet-autogen.ahogek.js
// @downloadURL  https://raw.githubusercontent.com/AhogeK/bt4g-magnet-autogen/master/bt4g-magnet-autogen.ahogek.js
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // 查找所有磁力链接按钮
    const magnetButtons = document.querySelectorAll('a.btn-primary[href*="downloadtorrentfile.com/hash/"]');

    magnetButtons.forEach(button => {
        // 从URL中提取哈希值
        const url = new URL(button.href);
        const pathParts = url.pathname.split('/');
        const hash = pathParts[pathParts.length - 1].split('?')[0];

        if (hash && hash.length === 40) {
            // 构建真正的磁力链接
            // 修改按钮行为和外观
            button.href = `magnet:?xt=urn:btih:${hash}`;
            button.setAttribute('title', '直接打开磁力链接');
            button.removeAttribute('target'); // 移除新标签页打开

            // 添加新标签，表明这是直接链接
            const badge = document.createElement('span');
            badge.textContent = '直接';
            badge.style.cssText = `
                background-color: #ff5722;
                color: white;
                padding: 2px 5px;
                border-radius: 3px;
                font-size: 10px;
                margin-left: 5px;
                vertical-align: middle;
            `;

            // 在按钮图片后面插入标记
            const img = button.querySelector('img');
            button.insertBefore(badge, img?.nextSibling || null);
        }
    });

    // 可选：同样处理 Torrent Download 按钮，如果你也想改变它的行为
    const torrentButtons = document.querySelectorAll('a.btn-success[href*="downloadtorrentfile.com/hash/"]');

    torrentButtons.forEach(button => {
        // 从URL中提取哈希值
        const url = new URL(button.href);
        const pathParts = url.pathname.split('/');
        const hash = pathParts[pathParts.length - 1].split('?')[0];

        if (hash && hash.length === 40) {
            // 添加点击事件，拦截默认行为
            button.addEventListener('click', function (e) {
                // 构建磁力链接
                const magnetLink = `magnet:?xt=urn:btih:${hash}`;

                // 询问用户是否使用磁力链接
                if (confirm('是否使用磁力链接代替种子下载？\n\n点击"确定"使用磁力链接\n点击"取消"继续下载种子文件')) {
                    e.preventDefault(); // 阻止默认的跳转
                    window.location.href = magnetLink; // 改用磁力链接
                }
                // 如果用户点击"取消"，则继续原有的种子下载流程
            });
        }
    });
})();