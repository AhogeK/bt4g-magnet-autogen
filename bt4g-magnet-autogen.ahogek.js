// ==UserScript==
// @name            BT4G Magnet AutoGen
// @namespace       https://ahogek.com
// @version         1.3.7
// @description     自动转换BT4G哈希到磁力链接 | 添加高级搜索选项：分辨率、HDR、编码、杜比音频和模糊搜索 | 删除资源恢复 | 广告拦截（未精准测试）
// @author          AhogeK
// @match           *://*.bt4g.org/*
// @match           *://*.bt4gprx.com/*
// @match           *://*.bt4g.com/*
// @match           *://*.downloadtorrentfile.com/hash/*
// @grant           GM_xmlhttpRequest
// @connect         itorrents.org
// @connect         btcache.me
// @connect         thetorrent.org
// @updateURL       https://raw.githubusercontent.com/AhogeK/bt4g-magnet-autogen/master/bt4g-magnet-autogen.ahogek.js
// @downloadURL     https://raw.githubusercontent.com/AhogeK/bt4g-magnet-autogen/master/bt4g-magnet-autogen.ahogek.js
// @license         MIT
// ==/UserScript==

(function () {
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

    // 寻找所有种子下载按钮
    const torrentButtons = document.querySelectorAll('a.btn-success[href*="downloadtorrentfile.com/hash/"]');

    torrentButtons.forEach(button => {
        // 从URL中提取哈希值
        const url = new URL(button.href);
        const pathParts = url.pathname.split('/');
        const hash = pathParts[pathParts.length - 1].split('?')[0];

        if (hash && hash.length === 40) {
            // 修改按钮为直接下载种子文件
            button.setAttribute('title', '直接下载种子文件');
            button.removeAttribute('target'); // 移除新标签页打开

            // 添加新标签，表明这是直接下载
            const badge = document.createElement('span');
            badge.textContent = '直接';
            badge.style.cssText = `
                background-color: #28a745;
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

            // 添加点击事件监听器
            button.addEventListener('click', function (e) {
                e.preventDefault(); // 阻止默认导航行为

                // 保存原始按钮状态
                const originalText = button.innerHTML;
                const originalWidth = button.offsetWidth;
                button.style.width = `${originalWidth}px`; // 保持按钮宽度不变
                button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 下载中...';
                button.disabled = true;

                // 尝试从多个源下载种子文件
                downloadTorrentFile(hash, [
                    `https://itorrents.org/torrent/${hash.toUpperCase()}.torrent`,
                    `https://btcache.me/torrent/${hash}`,
                    `https://thetorrent.org/${hash}.torrent`
                ], 0, button, originalText);
            });
        }
    });

    // 通过多个来源尝试下载种子文件的函数
    function downloadTorrentFile(hash, urls, index, button, originalText) {
        if (index >= urls.length) {
            // 所有来源都尝试过了，恢复按钮状态并显示错误
            button.innerHTML = originalText;
            button.disabled = false;
            button.style.width = '';

            // 显示错误消息
            showToast('无法下载种子文件，请尝试使用磁力链接', 'danger');
            return;
        }

        // 当前尝试的URL
        const url = urls[index];

        try {
            // 使用GM_xmlhttpRequest获取种子文件
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                responseType: "blob",
                timeout: 10000, // 10秒超时
                onload: function (response) {
                    if (response.status === 200) {
                        // 检查响应是否是torrent文件（简单检查）
                        const contentType = response.responseHeaders.match(/content-type:\s*(.*?)(\s|;|$)/i);
                        const isTorrent = contentType && (
                            contentType[1].includes('application/x-bittorrent') ||
                            contentType[1].includes('application/octet-stream')
                        );

                        // 还可以检查文件大小，极小的文件可能是错误页面
                        const hasContent = response.response && response.response.size > 50; // 至少50字节

                        if (isTorrent && hasContent) {
                            // 创建Blob并下载
                            const blob = new Blob([response.response], {
                                type: 'application/x-bittorrent'
                            });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${hash.toLowerCase()}.torrent`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);

                            // 恢复按钮状态
                            button.innerHTML = originalText;
                            button.disabled = false;
                            button.style.width = '';

                            // 显示成功消息
                            showToast('种子文件下载成功！', 'success');
                        } else {
                            // 不是有效的torrent文件，尝试下一个URL
                            downloadTorrentFile(hash, urls, index + 1, button, originalText);
                        }
                    } else {
                        // HTTP错误，尝试下一个URL
                        downloadTorrentFile(hash, urls, index + 1, button, originalText);
                    }
                },
                onerror: function () {
                    // 请求错误，尝试下一个URL
                    console.error(`从 ${url} 下载种子时出错`);
                    downloadTorrentFile(hash, urls, index + 1, button, originalText);
                },
                ontimeout: function () {
                    // 请求超时，尝试下一个URL
                    console.error(`从 ${url} 下载种子超时`);
                    downloadTorrentFile(hash, urls, index + 1, button, originalText);
                }
            });
        } catch (error) {
            // 发生异常，尝试下一个URL
            console.error('下载种子文件时出错:', error);
            downloadTorrentFile(hash, urls, index + 1, button, originalText);
        }
    }

    // 显示通知消息
    function showToast(message, type = 'success') {
        // 创建通知元素
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        // 添加特殊标识符，避免被广告拦截功能删除
        toast.setAttribute('data-bt4g-notification', 'true');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background-color: ${type === 'success' ? '#28a745' : '#dc3545'};
            color: white;
            border-radius: 4px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            z-index: 9999;
            font-size: 14px;
            transition: opacity 0.3s ease-in-out;
            opacity: 0;
          `;

        // 添加到页面
        document.body.appendChild(toast);

        // 显示通知
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 10);

        // 3秒后隐藏
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                // 确保元素仍然存在再移除
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
})();

(function () {
    'use strict';

    // 等待DOM完全加载
    window.addEventListener('load', () => {
        // 检查是否在搜索页面
        const searchForm = document.querySelector('form[action="/search"]');
        if (!searchForm) return;

        // 获取搜索输入框
        const searchInput = document.getElementById('search');
        if (!searchInput) return;

        // 检查页面上是否已经存在高级搜索选项容器
        if (document.querySelector('.advanced-search')) {
            console.log('高级搜索选项已存在，跳过创建');
            return;
        }

        // 使用一个全局标识符确保只初始化一次
        if (window.bt4gAdvancedSearchInitialized) return;
        window.bt4gAdvancedSearchInitialized = true;

        // 定义关键字映射表，用于表示各种格式的常见变体
        const keywordMaps = {
            resolution: {
                '720p': ['720p', '720P', 'HD'],
                '1080p': ['1080p', '1080P', 'HD1080P', 'FHD', 'FullHD', '1920x1080'],
                '4K/UHD': ['2160p', '2160P', '4K', '4k', 'UHD', 'UltraHD', '3840x2160', '4096x2160']
            },
            hdr: {
                'HDR': ['HDR'],
                'HDR10': ['HDR10'],
                'HDR10+': ['HDR10+', 'HDR10Plus'],
                'Dolby Vision': ['DV', 'DoVi', 'DolbyVision']
            },
            codec: {
                'H264/AVC': ['H264', '264', 'AVC', 'h264', 'MPEG4AVC', 'x264'],
                'H265/HEVC': ['H265', '265', 'HEVC', 'x265', 'h265'],
                'AV1': ['AV1'],
                'VP9': ['VP9']
            },
            mediaType: {
                'BD': ['BD', 'BLURAY', "BLU", "RAY", 'BDMV', 'BDREMUX', 'REMUX'],
                'WEB-DL': ['WEBDL'],
                'WEB': ['WEB', 'WEBRIP', 'WEBRip'],
                'HDTV': ['HDTV', 'TV'],
                'DVD': ['DVD', 'DVDRIP']
            },
            audio: {
                '杜比': ['Dolby', 'DD', 'DD+', 'DDP', 'DolbyDigital', 'DDP5 1'],
                '杜比全景声': ['Atmos', 'DolbyAtmos'],
                'DTS': ['DTS', 'DTSHD', 'DTSHDMA', 'DTSX'],
                'TrueHD': ['TrueHD', 'TRUEHD', 'TrueHD7']
            }
        };

        // 检测当前主题模式
        const isDarkMode = document.body.classList.contains('dark-mode') ||
            document.documentElement.classList.contains('dark') ||
            document.documentElement.getAttribute('data-bs-theme') === 'dark';

        // 获取URL参数
        const urlParams = new URLSearchParams(window.location.search);

        // 创建高级搜索选项容器，直接放在搜索框下方
        const advancedSearchDiv = document.createElement('div');
        advancedSearchDiv.className = 'advanced-search mb-3 mt-2';
        advancedSearchDiv.setAttribute('data-initialized', 'true');

        // 应用固定样式而非弹出样式
        updateFixedAdvancedSearchStyle(advancedSearchDiv, isDarkMode);

        // 添加到搜索表单之后（不是内部）
        searchForm.parentNode.insertBefore(advancedSearchDiv, searchForm.nextSibling);

        // 创建分辨率选项行
        const resolutionRow = createOptionRow('resolution', '分辨率：', [
            {value: '', label: '任意'},
            {value: '720p', label: '720p/HD'},
            {value: '1080p', label: '1080p/Full HD'},
            {value: '4K/UHD', label: '4K/UHD/2160p'}
        ], isDarkMode);
        advancedSearchDiv.appendChild(resolutionRow);

        // 创建HDR选项行
        const hdrRow = createOptionRow('hdr', 'HDR：', [
            {value: '', label: '任意'},
            {value: 'HDR', label: 'HDR'},
            {value: 'HDR10', label: 'HDR10'},
            {value: 'HDR10+', label: 'HDR10+'},
            {value: 'Dolby Vision', label: 'Dolby Vision/DV'}
        ], isDarkMode);
        advancedSearchDiv.appendChild(hdrRow);

        // 创建编码选项行
        const codecRow = createOptionRow('codec', '编码：', [
            {value: '', label: '任意'},
            {value: 'H264/AVC', label: 'H.264/AVC/x264'},
            {value: 'H265/HEVC', label: 'H.265/HEVC/x265'},
            {value: 'AV1', label: 'AV1'},
            {value: 'VP9', label: 'VP9'}
        ], isDarkMode);
        advancedSearchDiv.appendChild(codecRow);

        // 创建媒体类型选项行
        const mediaTypeRow = createOptionRow('mediaType', '媒体类型：', [
            {value: '', label: '任意'},
            {value: 'BD', label: 'BD/蓝光/REMUX'},
            {value: 'WEB-DL', label: 'WEB-DL'},
            {value: 'WEB', label: 'WEB/WEBRip'},
            {value: 'HDTV', label: 'HDTV'},
            {value: 'DVD', label: 'DVD'}
        ], isDarkMode);
        advancedSearchDiv.appendChild(mediaTypeRow);

        // 创建音频行（包含音频选项和重置按钮）
        const audioRow = document.createElement('div');
        audioRow.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; width: 100%;';

        // 音频选项部分
        const audioOptions = document.createElement('div');
        audioOptions.style.cssText = 'display: flex; align-items: center;';

        // 创建音频标签
        const audioLabel = document.createElement('span');
        audioLabel.textContent = '音频：';
        audioLabel.style.cssText = 'width: 80px; margin-right: 10px; white-space: nowrap; font-weight: bold;';
        if (isDarkMode) {
            audioLabel.style.color = '#e9ecef';
        } else {
            audioLabel.style.color = '#212529';
        }
        audioOptions.appendChild(audioLabel);

        // 创建音频选项组
        const audioChoices = [
            {value: '', label: '任意'},
            {value: '杜比', label: '杜比/Dolby'},
            {value: '杜比全景声', label: '杜比全景声/Atmos'},
            {value: 'DTS', label: 'DTS系列'},
            {value: 'TrueHD', label: 'TrueHD'}
        ];

        const audioGroup = document.createElement('div');
        audioGroup.style.cssText = 'display: flex; flex-wrap: wrap; gap: 5px;';

        // 添加各个音频选项
        audioChoices.forEach((choice, index) => {
            const id = `audio_${index}`;

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'audio';
            radio.id = id;
            radio.value = choice.value;
            radio.className = 'btn-check';
            radio.checked = index === 0;

            const optionLabel = document.createElement('label');
            optionLabel.className = isDarkMode ? 'btn btn-outline-light btn-sm' : 'btn btn-outline-dark btn-sm';
            optionLabel.htmlFor = id;
            optionLabel.textContent = choice.label;

            audioGroup.appendChild(radio);
            audioGroup.appendChild(optionLabel);
        });

        audioOptions.appendChild(audioGroup);

        // 将音频选项部分添加到音频行
        audioRow.appendChild(audioOptions);

        // 创建重置按钮
        const resetButton = document.createElement('button');
        resetButton.type = 'button';
        resetButton.className = isDarkMode ? 'btn btn-outline-light btn-sm' : 'btn btn-outline-dark btn-sm';
        resetButton.textContent = '重置选项';

        // 添加重置按钮的点击事件
        resetButton.addEventListener('click', resetAdvancedOptions);

        // 将重置按钮添加到音频行
        audioRow.appendChild(resetButton);

        // 将音频行添加到高级搜索容器
        advancedSearchDiv.appendChild(audioRow);

        // 设置一个隐藏字段来存储原始查询
        const originalQueryInput = document.createElement('input');
        originalQueryInput.type = 'hidden';
        originalQueryInput.id = 'originalQuery';
        searchForm.appendChild(originalQueryInput);

        // 恢复上次的搜索关键词（如果有）
        const lastSearchQuery = localStorage.getItem('bt4g_original_query') || '';
        if (lastSearchQuery && !urlParams.has('q')) {
            searchInput.value = lastSearchQuery;
        }

        // 存储高级搜索项
        const storeAdvancedSettings = () => {
            const settings = {
                resolution: document.querySelector('input[name="resolution"]:checked')?.value || '',
                hdr: document.querySelector('input[name="hdr"]:checked')?.value || '',
                codec: document.querySelector('input[name="codec"]:checked')?.value || '',
                mediaType: document.querySelector('input[name="mediaType"]:checked')?.value || '',
                audio: document.querySelector('input[name="audio"]:checked')?.value || '',
            };
            localStorage.setItem('bt4g_advanced_settings', JSON.stringify(settings));
        };

        // 恢复高级搜索项
        const restoreAdvancedSettings = () => {
            try {
                const settings = JSON.parse(localStorage.getItem('bt4g_advanced_settings')) || {};
                if (settings.resolution) setRadioValue('resolution', settings.resolution);
                if (settings.hdr) setRadioValue('hdr', settings.hdr);
                if (settings.codec) setRadioValue('codec', settings.codec);
                if (settings.mediaType) setRadioValue('mediaType', settings.mediaType);
                if (settings.audio) setRadioValue('audio', settings.audio);
            } catch (e) {
                console.error('Failed to restore advanced settings:', e);
            }
        };

        // 抽取搜索处理逻辑为独立函数
        function processSearch(e) {
            if (e) {
                e.preventDefault(); // 阻止表单默认提交
            }

            // 获取基本搜索词
            const baseQuery = searchInput.value.trim();

            // 如果搜索词为空，直接提交表单
            if (!baseQuery) {
                searchForm.submit();
                return;
            }

            // 存储原始查询
            localStorage.setItem('bt4g_original_query', baseQuery);
            originalQueryInput.value = baseQuery;

            // 获取选中的选项
            const resolution = document.querySelector('input[name="resolution"]:checked').value;
            const hdr = document.querySelector('input[name="hdr"]:checked').value;
            const codec = document.querySelector('input[name="codec"]:checked').value;
            const mediaType = document.querySelector('input[name="mediaType"]:checked').value;
            const audio = document.querySelector('input[name="audio"]:checked').value;

            // 存储高级搜索设置
            storeAdvancedSettings();

            // 构建搜索查询
            let baseQueryProcessed = baseQuery;
            let advancedConditions = [];

            // 构建高级条件数组
            if (resolution && keywordMaps.resolution[resolution]) {
                const variants = keywordMaps.resolution[resolution];
                if (variants.length > 0) {
                    advancedConditions.push(`(${variants.join('|')})`);
                }
            }

            if (hdr && keywordMaps.hdr[hdr]) {
                const variants = keywordMaps.hdr[hdr];
                if (variants.length > 0) {
                    advancedConditions.push(`(${variants.join('|')})`);
                }
            }

            if (codec && keywordMaps.codec[codec]) {
                const variants = keywordMaps.codec[codec];
                if (variants.length > 0) {
                    advancedConditions.push(`(${variants.join('|')})`);
                }
            }

            if (mediaType && keywordMaps.mediaType[mediaType]) {
                const variants = keywordMaps.mediaType[mediaType];
                if (variants.length > 0) {
                    advancedConditions.push(`(${variants.join('|')})`);
                }
            }

            if (audio && keywordMaps.audio[audio]) {
                const variants = keywordMaps.audio[audio];
                if (variants.length > 0) {
                    advancedConditions.push(`(${variants.join('|')})`);
                }
            }

            // 合并处理后的基本查询和高级条件
            let finalQuery = baseQueryProcessed;
            if (advancedConditions.length > 0) {
                finalQuery += ' ' + advancedConditions.join(' ');
            }

            // 更新搜索框的值
            searchInput.value = finalQuery;

            // 提交表单
            searchForm.submit();
        }

        // 重置高级搜索选项函数
        function resetAdvancedOptions() {
            // 重置所有单选按钮到第一个选项（"任意"）
            ['resolution', 'hdr', 'codec', 'mediaType', 'audio'].forEach(name => {
                const firstOption = document.querySelector(`input[name="${name}"][id="${name}_0"]`);
                if (firstOption) {
                    firstOption.checked = true;
                }
            });

            // 更新本地存储
            const settings = {
                resolution: '',
                hdr: '',
                codec: '',
                mediaType: '',
                audio: '',
            };
            localStorage.setItem('bt4g_advanced_settings', JSON.stringify(settings));
        }

        // 监听表单提交事件
        searchForm.addEventListener('submit', processSearch);

        // 监听搜索输入框的回车键事件
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                processSearch(e);
            }
        });

        // 添加搜索结果链接的监听器
        function addResultLinkListeners() {
            // 查找所有可能是搜索结果的链接
            const resultLinks = document.querySelectorAll('a[href^="/magnet/"]');

            resultLinks.forEach(link => {
                link.addEventListener('click', () => {
                    // 在用户点击链接时保存高级搜索设置
                    storeAdvancedSettings();
                });
            });
        }

        // 调用函数添加链接监听器
        // 使用MutationObserver来处理动态加载的内容
        const observer = new MutationObserver(() => {
            addResultLinkListeners();
        });
        observer.observe(document.body, {childList: true, subtree: true});

        // 初始化时也添加一次
        addResultLinkListeners();

        // 始终尝试恢复高级搜索设置，无论页面类型
        restoreAdvancedSettings();

        // 只在搜索结果页恢复原始查询到搜索框
        if (urlParams.has('q')) {
            const originalQuery = localStorage.getItem('bt4g_original_query');
            if (originalQuery) {
                setTimeout(() => {
                    searchInput.value = originalQuery;
                }, 100);
            }
        }

        // 监听主题切换按钮的点击事件
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                // 给浏览器一点时间来切换主题
                setTimeout(() => {
                    // 重新检测主题
                    const newDarkMode = document.body.classList.contains('dark-mode') ||
                        document.documentElement.classList.contains('dark') ||
                        document.documentElement.getAttribute('data-bs-theme') === 'dark';

                    // 更新高级搜索样式
                    updateFixedAdvancedSearchStyle(advancedSearchDiv, newDarkMode);

                    // 更新标签样式
                    document.querySelectorAll('.advanced-search label').forEach(label => {
                        if (newDarkMode) {
                            label.className = label.className.replace('btn-outline-dark', 'btn-outline-light');
                        } else {
                            label.className = label.className.replace('btn-outline-light', 'btn-outline-dark');
                        }
                    });

                    // 更新标题样式
                    document.querySelectorAll('.advanced-search span').forEach(span => {
                        if (newDarkMode) {
                            span.style.color = '#e9ecef';
                        } else {
                            span.style.color = '#212529';
                        }
                    });

                    // 更新重置按钮样式
                    resetButton.className = newDarkMode ?
                        'btn btn-outline-light btn-sm' :
                        'btn btn-outline-dark btn-sm';
                }, 100);
            });
        }
    });

    // 创建选项行
    function createOptionRow(name, label, choices, isDarkMode) {
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; margin-bottom: 8px; width: 100%;';

        // 创建标签
        const labelElement = document.createElement('span');
        labelElement.textContent = label;
        labelElement.style.cssText = 'width: 80px; margin-right: 10px; white-space: nowrap;';
        labelElement.style.fontWeight = 'bold';
        if (isDarkMode) {
            labelElement.style.color = '#e9ecef';
        } else {
            labelElement.style.color = '#212529'; // 确保亮色模式下标签文字颜色为深色
        }
        row.appendChild(labelElement);

        // 创建选项组
        const optionsGroup = document.createElement('div');
        optionsGroup.style.cssText = 'display: flex; flex-wrap: wrap; gap: 5px;';

        // 添加各个选项
        choices.forEach((choice, index) => {
            const id = `${name}_${index}`;

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = name;
            radio.id = id;
            radio.value = choice.value;
            radio.className = 'btn-check';
            radio.checked = index === 0; // 默认选中第一个选项

            const optionLabel = document.createElement('label');
            optionLabel.className = isDarkMode ? 'btn btn-outline-light btn-sm' : 'btn btn-outline-dark btn-sm'; // 改为outline-dark
            optionLabel.htmlFor = id;
            optionLabel.textContent = choice.label;

            optionsGroup.appendChild(radio);
            optionsGroup.appendChild(optionLabel);
        });

        row.appendChild(optionsGroup);
        return row;
    }

    // 辅助函数：设置单选按钮的值
    function setRadioValue(name, value) {
        const radioButtons = document.querySelectorAll(`input[name="${name}"]`);
        let found = false;

        radioButtons.forEach(radio => {
            if (radio.value === value) {
                radio.checked = true;
                found = true;
            }
        });

        // 如果没有找到匹配项，选择"任意"选项
        if (!found && radioButtons.length > 0) {
            radioButtons[0].checked = true;
        }
    }

    // 更新固定式高级搜索面板的样式
    function updateFixedAdvancedSearchStyle(element, isDarkMode) {
        let backgroundColor, textColor, borderColor;

        if (isDarkMode) {
            backgroundColor = '#212529';
            textColor = '#e9ecef';
            borderColor = '#495057';
        } else {
            backgroundColor = '#f8f9fa';
            textColor = '#212529';
            borderColor = '#6c757d'; // 加深边框颜色，增加对比度
        }

        element.style.cssText = `
           display: flex;
           flex-direction: column;
           width: 100%;
           padding: 12px;
           background-color: ${backgroundColor};
           color: ${textColor};
           border: 1px solid ${borderColor};
           border-radius: 5px;
           margin-bottom: 10px;
       `;
    }
})();

// 添加处理被删除内容的直接磁链功能
(function () {
    'use strict';

    // 等待DOM完全加载
    window.addEventListener('load', () => {
        // 检查是否在资源详细页面且内容已被删除
        const paragraphs = document.querySelectorAll('div.col-12 p');
        let deletedContentP = null;

        for (const p of paragraphs) {
            if (p.textContent.includes('On request, content has been deleted')) {
                deletedContentP = p;
                break;
            }
        }

        if (!deletedContentP) {
            return; // 不是删除内容页面，直接返回
        }

        // 尝试从meta标签中获取哈希值
        const metaOgUrl = document.querySelector('meta[property="og:url"]');

        if (!metaOgUrl) {
            return; // 没有找到包含哈希的meta标签
        }

        // 从meta标签的content属性中提取哈希值
        const urlContent = metaOgUrl.getAttribute('content');
        const hashMatch = RegExp(/\/([a-fA-F0-9]{40})(?:\?|$)/).exec(urlContent);

        if (!hashMatch?.[1]) {
            return; // 没有找到有效的40位哈希值
        }

        const hash = hashMatch[1];
        const magnetLink = `magnet:?xt=urn:btih:${hash}`;

        // 检测当前主题模式
        const isDarkMode = document.body.classList.contains('dark-mode') ||
            document.documentElement.classList.contains('dark') ||
            document.documentElement.getAttribute('data-bs-theme') === 'dark';

        // 创建一个容器，用于更好的样式布局
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'margin-top: 20px; text-align: center;';

        // 创建说明文本
        const infoText = document.createElement('p');
        infoText.textContent = '虽然内容显示已删除，但您仍可通过以下方式获取资源：';
        infoText.style.cssText = 'margin-bottom: 10px; font-style: italic; color: ' + (isDarkMode ? '#adb5bd' : '#6c757d');
        buttonContainer.appendChild(infoText);

        // 创建打开磁力链接按钮
        const magnetButton = document.createElement('a');
        magnetButton.href = magnetLink;
        magnetButton.className = 'btn btn-success';
        magnetButton.innerHTML = '🧲 打开磁力链接';
        magnetButton.style.cssText = 'padding: 8px 15px; font-weight: bold;';
        buttonContainer.appendChild(magnetButton);

        // 创建显示磁力链接的元素（方便用户手动复制）
        const hashDisplay = document.createElement('div');
        hashDisplay.textContent = magnetLink;
        hashDisplay.style.cssText = 'margin-top: 10px; font-family: monospace; word-break: break-all; ' +
            'border: 1px solid ' + (isDarkMode ? '#495057' : '#dee2e6') + '; ' +
            'padding: 6px; border-radius: 4px; ' +
            'background-color: ' + (isDarkMode ? '#343a40' : '#f8f9fa') + '; ' +
            'color: ' + (isDarkMode ? '#adb5bd' : '#6c757d') + '; font-size: 0.9em; ' +
            'max-width: 100%; overflow-x: auto; text-align: left; cursor: pointer;';

        // 点击磁力链接文本区域时复制到剪贴板
        hashDisplay.addEventListener('click', function () {
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(magnetLink).then(() => {
                    const originalText = hashDisplay.textContent;
                    hashDisplay.textContent = '✅ 已复制到剪贴板';
                    setTimeout(() => {
                        hashDisplay.textContent = originalText;
                    }, 1000);
                });
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = magnetLink;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                hashDisplay.addEventListener('click', async function () {
                    try {
                        await navigator.clipboard.writeText(magnetLink);
                        const originalText = hashDisplay.textContent;
                        hashDisplay.textContent = '✅ 已复制到剪贴板';
                        setTimeout(() => {
                            hashDisplay.textContent = originalText;
                        }, 1000);
                    } catch (err) {
                        console.error('复制失败:', err);
                    }
                });

                document.body.removeChild(textArea);
            }
        });

        buttonContainer.appendChild(hashDisplay);

        // 将按钮容器添加到内容已删除的消息所在的div中
        deletedContentP.parentNode.appendChild(buttonContainer);

        // 监听主题切换以更新元素样式
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                // 给浏览器一点时间来切换主题
                setTimeout(() => {
                    // 重新检测主题
                    const newDarkMode = document.body.classList.contains('dark-mode') ||
                        document.documentElement.classList.contains('dark') ||
                        document.documentElement.getAttribute('data-bs-theme') === 'dark';

                    // 更新文本颜色和样式
                    infoText.style.color = newDarkMode ? '#adb5bd' : '#6c757d';
                    hashDisplay.style.color = newDarkMode ? '#adb5bd' : '#6c757d';
                    hashDisplay.style.backgroundColor = newDarkMode ? '#343a40' : '#f8f9fa';
                    hashDisplay.style.borderColor = newDarkMode ? '#495057' : '#dee2e6';
                }, 100);
            });
        }
    });
})();

// 去除广告弹窗和叠加层功能
(function () {
    'use strict';

    // 允许的域名列表
    const ALLOWED_DOMAINS = [
        location.hostname, // 当前网站
        'bt4g', // BT4G相关域名
        'downloadtorrentfile.com',
        'filepax.com'
    ];

    // 检查URL是否是允许的
    function isAllowedUrl(url) {
        if (!url) return false;
        // 允许磁力链接
        if (url.startsWith('magnet:')) return true;
        // 允许网站内部链接
        if (url.startsWith('/') || url.startsWith('#')) return true;
        try {
            const urlObj = new URL(url, location.origin);
            // 检查是否是允许的域名
            return ALLOWED_DOMAINS.some(domain => urlObj.hostname.includes(domain));
        } catch (e) {
            // URL解析失败，默认允许相对路径
            return !url.includes('://');
        }
    }

    // 增强版叠加层选择器
    const overlaySelectors = [
        // 常见广告层选择器
        'div[style*="position: fixed"]',
        'div[style*="z-index: 999"]',
        'div[class*="ad-"]',
        'div[class*="popup"]',
        'div[class*="overlay"]',
        'div[id*="ad-"]',
        'div[id*="popup"]',
        'div[id*="overlay"]',
        // 针对可能的弹窗广告
        'div.modal.fade.show',
        'div.modal-backdrop',
        'div[style*="pointer-events"]',
        'iframe[src*="ad"]',
        // 处理任何位置的可疑iframe
        'iframe:not([src*="bt4g"])',

        // 新增选择器 - 针对隐形覆盖层
        'div[style*="opacity: 0"]',
        'div[style*="opacity:0"]',
        'div[style*="height: 100%"][style*="width: 100%"]',
        'div[style*="top: 0"][style*="left: 0"][style*="right: 0"][style*="bottom: 0"]',
        'div[style*="cursor: pointer"]',
        'div[style*="position: absolute"][style*="width: 100%"]',
        'a[target="_blank"]:not([href^="magnet:"])',
        'a[rel*="nofollow"]',
        'a[rel*="sponsored"]',

        // 新增 - 特殊隐藏iframe
        'iframe[style*="opacity: 0"]',
        'iframe[width="1"][height="1"]',
        'iframe[style*="visibility: hidden"]'
    ];

    // 检测和删除叠加层
    function removeOverlays() {
        // 恢复被禁用的滚动
        if (document.body && document.body.style.overflow === 'hidden') {
            document.body.style.overflow = '';
        }

        // 删除匹配的叠加层
        overlaySelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el && isOverlay(el) && !isEssentialElement(el) && !isScriptNotification(el)) {
                        console.log('移除广告叠加层:', el);
                        el.remove();
                    }
                });
            } catch (error) {
                console.error('选择器处理错误:', selector, error);
            }
        });

        // 处理与body同级的元素
        removeBodySiblings();
    }

    // 专门处理与body同级的元素
    function removeBodySiblings() {
        // 获取documentElement的所有子元素
        const htmlChildren = Array.from(document.documentElement.children);
        // 遍历所有子元素
        for (const element of htmlChildren) {
            // 保留head和body，删除其他非法添加的元素
            if (element !== document.body && element !== document.head) {
                // 检查是否是我们自己的元素，如果不是则移除
                if (!isScriptNotification(element)) {
                    console.log('移除与body同级的非法元素:', element);
                    element.remove();
                }
            }
        }
    }

    // 判断元素是否为我们自己的通知元素
    function isScriptNotification(element) {
        // 检查是否是我们的通知元素
        return element.hasAttribute('data-bt4g-notification') ||
            element.classList.contains('toast-notification');
    }

    // 判断元素是否为叠加层（增强版）
    function isOverlay(element) {
        const style = window.getComputedStyle(element);
        const position = style.getPropertyValue('position');
        const zIndex = parseInt(style.getPropertyValue('z-index'), 10);
        const opacity = parseFloat(style.getPropertyValue('opacity'));

        // iframe特殊处理
        if (element.tagName === 'IFRAME') {
            const src = element.getAttribute('src') || '';
            // 更严格的iframe检查
            return !src.includes(location.hostname) && !src.includes('bt4g');
        }

        // 增强检测
        // 1. 检测隐形覆盖层
        const isFullPageOverlay =
            element.offsetWidth > window.innerWidth * 0.8 &&
            element.offsetHeight > window.innerHeight * 0.8;

        // 2. 检测可疑的空链接包装器
        const hasMultipleChildAnchors = element.querySelectorAll('a').length > 3;

        // 3. 检测隐藏但可点击的元素
        const isHiddenButClickable =
            (opacity === 0 || style.getPropertyValue('visibility') === 'hidden') &&
            style.getPropertyValue('pointer-events') !== 'none';

        return (
            // 原有条件
            ((position === 'fixed' || position === 'absolute') &&
                ((zIndex > 100) || (style.getPropertyValue('display') !== 'none' && opacity > 0))) ||
            // 新增条件
            isFullPageOverlay ||
            hasMultipleChildAnchors ||
            isHiddenButClickable
        );
    }

    // 判断是否为页面必要元素
    function isEssentialElement(element) {
        // 检查是否包含重要的页面功能元素
        const isNavbar = element.classList.contains('navbar') ||
            element.id === 'header' ||
            element.querySelector('.navbar');

        // 检查是否是BT4G的搜索表单或重要UI元素
        const isSearchForm = element.querySelector('form[action="/search"]') ||
            element.classList.contains('advanced-search');

        // 检查是否包含磁力按钮
        const hasMagnetButton = element.querySelector('a[href^="magnet:"]') ||
            element.querySelector('.btn-primary');

        // 检查是否是我们的通知元素
        const isNotification = isScriptNotification(element);

        return isNavbar || isSearchForm || hasMagnetButton || isNotification;
    }

    // 增强型拦截所有可能导致页面跳转的方法
    function preventRedirects() {
        // 1. 覆盖 window.open
        if (!window.originalOpen) {
            window.originalOpen = window.open;
            window.open = function (url, name, params) {
                if (isAllowedUrl(url)) {
                    return window.originalOpen(url, name, params);
                } else {
                    console.log('拦截弹窗:', url);
                    window.showAdBlockerNotification?.();
                    return {
                        // 模拟窗口对象，防止脚本错误
                        closed: true,
                        close: function () {
                        },
                        focus: function () {
                        },
                        blur: function () {
                        }
                    };
                }
            };
        }

        // window.open的其他别名
        window.openWindow = window.open;
        window.openTab = window.open;

        // 2. 覆盖 location.href (使用描述符)
        try {
            const originalLocationHrefDescriptor = Object.getOwnPropertyDescriptor(window.Location.prototype, 'href') ||
                Object.getOwnPropertyDescriptor(location, 'href');

            if (originalLocationHrefDescriptor?.configurable) {
                Object.defineProperty(window.location, 'href', {
                    set: function (url) {
                        if (isAllowedUrl(url)) {
                            originalLocationHrefDescriptor.set.call(this, url);
                        } else {
                            console.log('拦截location.href跳转:', url);
                            window.showAdBlockerNotification?.();
                        }
                    },
                    get: originalLocationHrefDescriptor.get,
                    configurable: true
                });
            }
        } catch (e) {
            console.log('无法覆盖location.href:', e);
        }

        // 3. 覆盖 location.assign - 修复版本
        try {
            // 保存原始函数的引用
            const originalAssign = window.location.assign;
            // 创建拦截函数
            const interceptedAssign = function (url) {
                if (isAllowedUrl(url)) {
                    return originalAssign.call(window.location, url);
                } else {
                    console.log('拦截location.assign跳转:', url);
                    window.showAdBlockerNotification?.();
                    return null;
                }
            };

            // 尝试使用Object.defineProperty覆盖
            Object.defineProperty(window.location, 'assign', {
                value: interceptedAssign,
                configurable: true
            });

            // 创建安全函数作为备选
            window.safeAssign = function (url) {
                if (isAllowedUrl(url)) {
                    originalAssign.call(window.location, url);
                } else {
                    console.log('通过safeAssign拦截location.assign跳转:', url);
                    window.showAdBlockerNotification?.();
                }
            };
        } catch (e) {
            console.log('无法覆盖location.assign:', e);
            // 如果覆盖失败，依靠其他防护机制
        }

        // 4. 覆盖 location.replace - 修复版本
        try {
            // 保存原始函数的引用
            const originalReplace = window.location.replace;
            // 创建拦截函数
            const interceptedReplace = function (url) {
                if (isAllowedUrl(url)) {
                    return originalReplace.call(window.location, url);
                } else {
                    console.log('拦截location.replace跳转:', url);
                    window.showAdBlockerNotification?.();
                    return null;
                }
            };

            // 尝试使用Object.defineProperty覆盖
            Object.defineProperty(window.location, 'replace', {
                value: interceptedReplace,
                configurable: true
            });

            // 创建安全函数作为备选
            window.safeReplace = function (url) {
                if (isAllowedUrl(url)) {
                    originalReplace.call(window.location, url);
                } else {
                    console.log('通过safeReplace拦截location.replace跳转:', url);
                    window.showAdBlockerNotification?.();
                }
            };
        } catch (e) {
            console.log('无法覆盖location.replace:', e);
            // 如果覆盖失败，依靠其他防护机制
        }

        // 5. 增强 - 拦截 window 上下文
        try {
            // 防止iframe修改顶层窗口
            if (window !== window.top) {
                Object.defineProperty(window, 'top', {
                    get: function () {
                        return window;
                    }
                });
                Object.defineProperty(window, 'parent', {
                    get: function () {
                        return window;
                    }
                });
            }
        } catch (e) {
            console.log('无法覆盖window上下文属性:', e);
        }

        // 6. 拦截 window.postMessage
        const originalPostMessage = window.postMessage;
        window.postMessage = function (message, targetOrigin, transfer) {
            if (typeof message === 'object' && message) {
                // 检查消息是否包含可疑URL
                const messageString = JSON.stringify(message).toLowerCase();
                if (messageString.includes('http') || messageString.includes('url')) {
                    console.log('拦截可疑postMessage:', messageString.substring(0, 100));
                    return;
                }
            }
            return originalPostMessage.apply(this, arguments);
        };

        // 7. 防止页面卸载重定向
        window.addEventListener('beforeunload', function (event) {
            // 记录当前URL
            const currentURL = window.location.href;

            // 使用可选链和更简洁的条件检查
            const clickedElement = document.activeElement;
            const targetHref = clickedElement?.tagName === 'A' ?
                clickedElement.getAttribute('href') : null;

            if (targetHref && !isAllowedUrl(targetHref)) {
                console.log('拦截beforeunload触发的导航:', targetHref);

                // 标准方法：阻止默认行为
                event.preventDefault();

                window.showAdBlockerNotification?.();
                return '';
            }

            // 检查是否有正在进行的重定向
            // 注意：此setTimeout在beforeunload后可能不会执行，因为页面可能已开始卸载
            setTimeout(() => {
                // 如果导航被触发且不是允许的URL，则尝试阻止
                if (window.location.href !== currentURL && !isAllowedUrl(window.location.href)) {
                    console.log('拦截页面卸载时的重定向:', window.location.href);
                    window.stop(); // 停止页面加载
                    history.pushState(null, '', currentURL); // 恢复URL
                    window.showAdBlockerNotification?.();
                }
            }, 0);
        }, true);
    }

    // 增强版点击拦截 - 主要针对新标签页劫持
    function interceptLinkClicks() {
        // 使用捕获阶段拦截所有点击
        document.addEventListener('click', function (e) {
            // 1. 检查是否点击了链接
            let targetElement = e.target;
            let isBlocked = false;

            // 2. 检查点击目标及其所有父元素
            while (targetElement && targetElement !== document) {
                // 检查是否是链接
                if (targetElement.tagName === 'A') {
                    const href = targetElement.getAttribute('href');
                    if (href && !isAllowedUrl(href)) {
                        console.log('拦截链接跳转:', href);
                        e.preventDefault();
                        e.stopPropagation();
                        isBlocked = true;
                        window.showAdBlockerNotification?.();
                        break;
                    }
                }

                // 检查onclick和其他事件
                const suspiciousEventAttrs = ['onclick', 'onmousedown', 'onmouseup'];

                // 使用some()方法，可以在返回true时提前退出循环
                suspiciousEventAttrs.some(attr => {
                    const handler = targetElement.getAttribute(attr);
                    if (handler && (
                        handler.includes('window.open') ||
                        handler.includes('location') ||
                        handler.includes('http')
                    )) {
                        console.log(`拦截可疑${attr}事件:`, handler);
                        e.preventDefault();
                        e.stopPropagation();
                        isBlocked = true;
                        targetElement.removeAttribute(attr); // 立即移除事件
                        window.showAdBlockerNotification?.();
                        return true; // 相当于break
                    }
                    return false;
                });

                // 检查data属性中的URL - 如果尚未被阻止
                if (!isBlocked) {
                    // 直接使用some方法，不存储返回值
                    Array.from(targetElement.attributes).some(attr => {
                        if (attr.name.startsWith('data-') &&
                            typeof attr.value === 'string' &&
                            (attr.value.includes('http') || attr.value.includes('www.'))) {

                            if (!isAllowedUrl(attr.value)) {
                                console.log('拦截data属性中的URL:', attr.value);
                                e.preventDefault();
                                e.stopPropagation();
                                isBlocked = true;
                                return true; // 提前退出循环
                            }
                        }
                        return false;
                    });
                }

                if (isBlocked) break;
                targetElement = targetElement.parentElement;
            }

            // 3. 点击后延迟检查是否有尝试打开新窗口
            if (!isBlocked) {
                setTimeout(() => {
                    // 检查是否有新的异常iframe
                    const newIframes = document.querySelectorAll('iframe:not([data-checked])');
                    newIframes.forEach(iframe => {
                        iframe.setAttribute('data-checked', 'true');
                        const src = iframe.getAttribute('src') || '';
                        if (src && !isAllowedUrl(src)) {
                            console.log('移除可疑iframe:', src);
                            iframe.remove();
                            window.showAdBlockerNotification?.();
                        }
                    });
                }, 100);
            }
        }, true);

        // 拦截mousedown/mouseup事件 (有些广告用这些事件触发)
        ['mousedown', 'mouseup', 'auxclick', 'contextmenu'].forEach(eventType => {
            document.addEventListener(eventType, function (e) {
                const target = e.target.closest('a') || e.target;
                if (target.tagName === 'A') {
                    const href = target.getAttribute('href');
                    if (href && !isAllowedUrl(href)) {
                        console.log(`拦截${eventType}事件:`, href);
                        e.preventDefault();
                        e.stopPropagation();
                        window.showAdBlockerNotification?.();
                    }
                }
            }, true);
        });
    }

    // 阻止全局事件捕获可能导致弹窗的行为
    function preventPopupEvents() {
        // 调用增强的重定向拦截
        preventRedirects();

        // 处理链接点击
        interceptLinkClicks();

        // 阻止页面级别的点击劫持
        document.addEventListener('click', function (e) {
            // 处理非链接和按钮的全页面点击
            const isLinkOrButton = e.target.tagName === 'A' ||
                e.target.tagName === 'BUTTON' ||
                e.target.closest('a') ||
                e.target.closest('button');

            if (!isLinkOrButton && e.currentTarget === document) {
                // 检查是否点击了覆盖整个页面的元素
                const rect = e.target.getBoundingClientRect();
                const isFullPageOverlay = (rect.width > window.innerWidth * 0.9 &&
                    rect.height > window.innerHeight * 0.9);

                if (isFullPageOverlay) {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('阻止可疑的全页面点击');
                    removeOverlays();
                }
            }
        }, true); // 使用捕获阶段
    }

    // 清理可能的内联事件处理程序
    function cleanupInlineEvents() {
        // 查找并清理可疑的内联事件
        const suspiciousElements = document.querySelectorAll('[onclick], [onmousedown], [onmouseup], [onmousemove], [onload], [onunload]');
        suspiciousElements.forEach(el => {
            // 检查所有内联事件属性
            const eventAttributes = ['onclick', 'onmousedown', 'onmouseup', 'onmousemove', 'onload', 'onunload'];

            // 排除我们自己的通知元素
            if (isScriptNotification(el)) {
                return;
            }

            // 检查链接元素的目标
            if (el.tagName === 'A') {
                const href = el.getAttribute('href');
                if (href && !isAllowedUrl(href)) {
                    console.log('修改可疑链接:', href);
                    el.setAttribute('data-original-href', href);
                    el.removeAttribute('href');
                }
            }

            // 清除可疑的事件处理器
            for (const attr of eventAttributes) {
                const eventHandler = el.getAttribute(attr);
                if (eventHandler && (
                    eventHandler.includes('window.open') ||
                    eventHandler.includes('popup') ||
                    eventHandler.includes('location') ||
                    eventHandler.includes('href')
                )) {
                    console.log(`移除可疑内联事件 ${attr}:`, eventHandler);
                    el.removeAttribute(attr);
                }
            }
        });
    }

    // 防止通过特殊手段添加的脚本和iframe
    function preventDynamicElements() {
        // 1. 覆盖document.write和document.writeln
        const originalWrite = document.write;
        document.write = function (...args) {
            const content = args.join('');
            // 检查内容是否包含可疑代码
            if (content.includes('<iframe') || content.includes('window.open') ||
                content.includes('onclick') || content.includes('http')) {
                console.log('拦截可疑document.write:', content.substring(0, 100));
                return;
            }
            return originalWrite.apply(this, args);
        };
        document.writeln = document.write;

        // 2. 监控appendChild和insertBefore方法
        const originalAppendChild = Element.prototype.appendChild;
        Element.prototype.appendChild = function (node) {
            // 检查是否添加敏感元素
            if (node.nodeName === 'IFRAME' || node.nodeName === 'SCRIPT') {
                // 检查iframe的src
                if (node.nodeName === 'IFRAME') {
                    const src = node.getAttribute('src');
                    if (src && !isAllowedUrl(src)) {
                        console.log('拦截添加可疑iframe:', src);
                        return document.createElement('div'); // 返回空div代替iframe
                    }
                }

                // 检查script的内容
                if (node.nodeName === 'SCRIPT') {
                    const content = node.textContent || node.innerText || '';
                    const src = node.getAttribute('src') || '';

                    if ((content && (content.includes('window.open') || content.includes('popup'))) ||
                        (src && !isAllowedUrl(src))) {
                        console.log('拦截可疑script:', src || content.substring(0, 100));
                        return document.createElement('script'); // 返回空脚本
                    }
                }
            }
            return originalAppendChild.call(this, node);
        };

        // 同样处理insertBefore方法
        const originalInsertBefore = Element.prototype.insertBefore;
        Element.prototype.insertBefore = function (node, referenceNode) {
            // 与appendChild相同的检查逻辑
            if (node.nodeName === 'IFRAME' || node.nodeName === 'SCRIPT') {
                // 检查iframe的src
                if (node.nodeName === 'IFRAME') {
                    const src = node.getAttribute('src');
                    if (src && !isAllowedUrl(src)) {
                        console.log('拦截插入可疑iframe:', src);
                        return document.createElement('div');
                    }
                }

                // 检查script的内容
                if (node.nodeName === 'SCRIPT') {
                    const content = node.textContent || node.innerText || '';
                    const src = node.getAttribute('src') || '';

                    if ((content && (content.includes('window.open') || content.includes('popup'))) ||
                        (src && !isAllowedUrl(src))) {
                        console.log('拦截可疑script:', src || content.substring(0, 100));
                        return document.createElement('script');
                    }
                }
            }
            return originalInsertBefore.call(this, node, referenceNode);
        };
    }

    // 创建防跳转通知层
    function createBlockingLayer() {
        const style = document.createElement('style');
        style.innerHTML = `
        .ad-blocker-notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
            border-radius: 4px;
            padding: 10px 15px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 999999;
            font-family: Arial, sans-serif;
            max-width: 300px;
            animation: fade-in 0.3s ease-in-out;
            pointer-events: auto;
            display: none;
        }
        @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        `;
        document.head.appendChild(style);

        const notification = document.createElement('div');
        notification.className = 'ad-blocker-notification';
        notification.setAttribute('data-bt4g-notification', 'true');
        notification.textContent = '已阻止可疑广告跳转';
        document.body.appendChild(notification);

        // 显示通知的方法
        window.showAdBlockerNotification = function () {
            notification.style.display = 'block';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        };
    }

    // 主函数：初始化广告拦截器
    function initAdBlocker() {
        console.log('BT4G 增强广告拦截器已激活 - 强化新标签页防护');

        // 立即调用所有拦截函数
        removeOverlays();
        preventPopupEvents();
        cleanupInlineEvents();
        preventDynamicElements();

        // MutationObserver监视DOM变化
        const observer = new MutationObserver((mutations) => {
            // 检查是否有新增的html子节点
            const hasHtmlChildChanges = mutations.some(mutation =>
                mutation.target === document.documentElement && mutation.type === 'childList');

            if (hasHtmlChildChanges) {
                removeBodySiblings();
            }

            // 检查变化的节点
            for (const mutation of mutations) {
                // 使用可选链检查和迭代添加的节点
                mutation.addedNodes?.forEach(node => {
                    // 检查是否添加了iframe或script
                    if (node.nodeName === 'IFRAME' || node.nodeName === 'SCRIPT') {
                        // 针对iframe检查src
                        if (node.nodeName === 'IFRAME') {
                            const src = node.getAttribute('src');
                            if (src && !isAllowedUrl(src)) {
                                console.log('移除动态添加的可疑iframe:', src);
                                node.remove();
                            }
                        }
                    }
                });
            }

            removeOverlays();
            cleanupInlineEvents();
        });

        // 增强监视范围，包括document和html
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class', 'src', 'href']
        });

        // 更频繁地检查覆盖层和跳转
        setInterval(() => {
            removeOverlays();
            removeBodySiblings();
            preventRedirects();
        }, 500); // 降低间隔时间以提高检测频率

        // 鼠标移动和按键检测
        ['mousemove', 'keydown', 'scroll'].forEach(event => {
            document.addEventListener(event, () => {
                setTimeout(removeOverlays, 50);
            }, {passive: true});
        });

        // 监视iframe消息
        window.addEventListener('message', function (event) {
            // 1. 首先验证消息的来源
            const trustedOrigins = [
                'https://yourtrusted-domain.com',
                'https://another-trusted-domain.com',
                // 添加所有您信任的域名
            ];

            // 如果消息来源不在信任列表中，则拒绝处理
            if (!trustedOrigins.includes(event.origin)) {
                console.log('拦截来自不受信任来源的消息:', event.origin);
                return; // 不处理来自未知来源的消息
            }

            // 2. 在验证来源后，再检查消息内容
            if (event.data && typeof event.data === 'string' &&
                (event.data.includes('http') || event.data.includes('url')) &&
                !isAllowedUrl(event.data)) {
                console.log('拦截postMessage包含的URL:', event.data.substring(0, 100));
                event.stopPropagation();
            }
        }, true);
    }

    // 在文档准备前预先拦截重定向方法
    preventRedirects();

    // 在DOM开始构建时就拦截关键行为
    document.addEventListener('readystatechange', function () {
        if (document.readyState === 'interactive' || document.readyState === 'complete') {
            removeOverlays();
            preventPopupEvents();
            preventDynamicElements();
            interceptLinkClicks();
        }
    });

    // DOMContentLoaded时启动防护
    document.addEventListener('DOMContentLoaded', () => {
        removeOverlays();
        preventPopupEvents();
        createBlockingLayer();
        preventDynamicElements();
    });

    // 立即执行这些关键防护
    interceptLinkClicks();
    preventDynamicElements();

    // 页面加载后启动完整防护
    window.addEventListener('load', initAdBlocker);
})();