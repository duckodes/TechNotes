import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, get, onValue } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import fetcher from "./fetcher.js";
import dateutils from "./date.utils.js";
import themeutils from "./theme.utils.js";
import scrollUtils from "./scroll.utils.js";
import footer from "./footer.js";

const main = (async () => {
    const firebaseConfig = await fetcher.load('../res/config/firebaseConfig.json');
    const app = initializeApp(firebaseConfig);
    const database = getDatabase(app);

    const urlSearchParams = new URLSearchParams(window.location.search);
    const dataKey = await findParentNodeById(urlSearchParams.size === 0 ? (await get(ref(database, 'technotes/user/DPcmhV427VQNJ9ojiOTD2aYyuE83/name'))).val() : urlSearchParams.get('user'));
    function initProfile(url = '', name = `無使用者資料`, title = '', employed = '', email = '', github = '') {
        const profile = document.querySelector('.profile');
        const profileImage = profile.querySelector('.avatar');
        profileImage.src = url;
        const profileName = profile.querySelector('h3');
        profileName.textContent = name;
        const profileDesc = profile.querySelectorAll('p');
        profileDesc[0].textContent = title;
        profileDesc[1].textContent = employed;
        profileDesc[2].innerHTML = email;
        profileDesc[3].innerHTML = github;
    }
    async function findParentNodeById(targetName) {
        try {
            const rootRef = ref(database, 'technotes/user');
            const snapshot = await get(rootRef);

            if (!snapshot.exists()) {
                throw new Error('資料不存在');
            }

            const data = snapshot.val();

            for (const [key, value] of Object.entries(data)) {
                if (value.name === targetName) {
                    return key;
                }
            }

            return null;
        } catch (error) {
            console.error('查找失敗：', error.message);
            return null;
        }
    }
    let tags = [];
    onValue(ref(database, `technotes/user/${dataKey}`), async (snapshot) => {
        const data = snapshot.val();
        tags = data?.tags;
        if (!dataKey) {
            initProfile('', `無${urlSearchParams.get('user')}使用者資料`);
            return;
        } else {
            UpdateTopic(data.topic);
            initProfile(data.image,
                data.name,
                data.title,
                data.employed,
                `<a href="mailto:${data.email}">${data.email}</a>`,
                `<a href="${data.github}" target="_blank">GitHub</a>`);
        }
        data.theme && themeutils.set(data.theme);
    });
    onValue(ref(database, `technotes/data/${dataKey}`), async (snapshot) => {
        UpdateCategoryList(snapshot.val());
        renderSearchBox(layout, snapshot.val(), Object.keys((await get(ref(database, 'technotes/check'))).val()));
    });

    let lastCategoryIndex = null;
    let lastArticles = null;
    let pageSelectOption = {
        historyTracker: 0,
        tagCloud: 1
    };
    let pageSelect = pageSelectOption.historyTracker;

    const topic = document.querySelector('.layout>header');
    async function UpdateTopic(text) {
        topic.textContent = text;
    }

    const layout = document.querySelector('.layout');
    const categoryList = document.getElementById('categoryList');
    const articleContainer = document.getElementById('articleContainer');
    const articleView = document.getElementById('articleView');
    const articleTitle = document.getElementById('articleTitle');
    const articleBody = document.getElementById('articleBody');
    const articleContent = articleView.querySelector('.article-content');
    const articleBackButton = articleContent.querySelector('.back-btn');
    const edit = document.getElementById('edit');
    edit.addEventListener('click', () => {
        window.open('https://notesedit.duckode.com/');
    });
    const histroyTracker = document.getElementById('histroyTracker');
    histroyTracker.addEventListener('click', () => {
        pageSelect = pageSelectOption.historyTracker;
        lastCategoryIndex = null;
        UpdateCategoryList(lastArticles);
        articleView.style.display = 'none';
        articleContainer.style.display = 'flex';
    });
    const tagCloud = document.getElementById('tagCloud');
    tagCloud.addEventListener('click', async () => {
        pageSelect = pageSelectOption.tagCloud;
        lastCategoryIndex = null;
        UpdateCategoryList(lastArticles);
        articleView.style.display = 'none';
        articleContainer.style.display = 'flex';
    });

    if (urlSearchParams.get('category') && urlSearchParams.get('categoryID')) {
        layout.style.display = 'none';
        document.body.appendChild(articleView);
        articleView.style.padding = '1rem';
        articleBackButton.style.display = 'none';
        await waitShowArticle((await get(ref(database, `technotes/data/${dataKey}`))).val()[urlSearchParams.get('category')][urlSearchParams.get('categoryID')]);
        window.parent.postMessage({
            id: urlSearchParams.get('category') + urlSearchParams.get('categoryID'),
            height: articleView.scrollHeight
        }, '*');
    } else if (urlSearchParams.get('category') && !urlSearchParams.get('categoryID')) {
        layout.style.display = 'none';
        document.body.appendChild(articleContainer);
        document.body.appendChild(articleView);
        articleView.style.padding = '1rem';
        renderArticles((await get(ref(database, `technotes/data/${dataKey}`))).val(), urlSearchParams.get('category'))
    } else if (urlSearchParams.get('profile') === 'true') {
        layout.style.display = 'none';
        const profile = document.querySelector('.sidebar');
        profile.style.height = '100%';
        document.body.appendChild(profile);
    } else if (urlSearchParams.get('timeline') === 'true') {
        layout.style.display = 'none';
        document.body.appendChild(articleContainer);
        document.body.appendChild(articleView);
        articleView.style.padding = '1rem';
        renderChronologicalOrder((await get(ref(database, `technotes/data/${dataKey}`))).val());
    }

    function UpdateCategoryList(articles) {
        if (categoryList.children.length > 0) {
            categoryList.innerHTML = '';
        }
        if (!articles) return;
        lastArticles = articles;
        Object.keys(articles).forEach((category, index) => {
            const li = document.createElement('li');
            li.textContent = category;
            li.onclick = () => {
                lastCategoryIndex = index;
                renderArticles(articles, category);
            };
            categoryList.appendChild(li);
        });
        if (!Object.keys(articles)[lastCategoryIndex]) {
            // renderArticles(articles, Object.keys(articles)[Object.keys(articles).length - 1]);
            switch (pageSelect) {
                case pageSelectOption.historyTracker:
                    renderChronologicalOrder(articles);
                    break;
                case pageSelectOption.tagCloud:
                    renderTagCloud(articles);
                    break;
            }
        } else {
            renderArticles(articles, Object.keys(articles)[lastCategoryIndex]);
        }
    }

    function renderArticles(articles, category) {
        articleContainer.innerHTML = '';
        articleView.style.display = 'none';
        articleContainer.style.display = 'flex';

        articles[category].forEach(article => {
            const card = document.createElement('div');
            card.className = 'card';

            const h3 = document.createElement('h3');
            h3.textContent = article.title;

            const p = document.createElement('p');
            p.textContent = article.summary;
            p.innerHTML = p.innerHTML.replace(/\n/g, "<br>");

            const date = document.createElement('p');
            date.style.fontSize = '0.8rem';
            date.style.color = '#aaaa';
            date.textContent = `${dateutils.ToDateTime(article.date)}`;

            const tagContainer = document.createElement('div');
            tagContainer.className = 'cardTagContainer';
            article.tags?.forEach(tag => {
                const tags = document.createElement('span');
                tags.className = 'cardTag';
                tags.style.fontSize = '0.8rem';
                tags.textContent = tag;
                tags.onclick = (e) => {
                    e.stopPropagation();
                    renderTagArticles(tag, articles);
                };
                tagContainer.appendChild(tags);
            });

            card.appendChild(h3);
            card.appendChild(p);
            card.appendChild(date);
            card.appendChild(tagContainer);

            card.onclick = () => showArticle(article);
            articleContainer.appendChild(card);

            scrollUtils.margin(articleContainer, -20);
        });
    }

    async function loadImages(url) {
        if (!url) return null;
        const loadPromises = url.map(src => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });
        });

        return Promise.all(loadPromises);
    }
    async function waitShowArticle(article) {
        articleTitle.innerHTML = article.title;

        const images = await loadImages(article.images);
        const imageHTML = article.images?.length
            ? `<div class="article-images">${images.map(img =>
                `<img src="${img.src}" alt="文章圖片" style="width:100%; border-radius:10px;" />`
            ).join('')}</div>`
            : '';
        article.content = convertToTable(article.content);
        article.content = convertToSyntax(article.content);
        articleBody.innerHTML = `
            <p style="fontSize: 0.8rem;color: #aaaa;">${dateutils.ToDateTime(article.date)}</p>
            ${imageHTML}
            <div class="articleMainText">${article.content.replace(/\n/g, "<br>")}</div>
        `;

        articleContainer.style.display = 'none';
        articleView.style.display = 'block';
        scrollUtils.margin(articleView, -20);
        codeAdditional();
    }
    function showArticle(article) {
        articleTitle.innerHTML = article.title;

        const imageHTML = article.images?.length
            ? `<div class="article-images">${article.images.map(src =>
                `<img src="${src}" alt="文章圖片" style="width:100%; border-radius:10px;" />`
            ).join('')}</div>`
            : '';
        article.content = convertToTable(article.content);
        article.content = convertToSyntax(article.content);
        articleBody.innerHTML = `
            <p style="fontSize: 0.8rem;color: #aaaa;">${dateutils.ToDateTime(article.date)}</p>
            ${imageHTML}
            <div class="articleMainText">${article.content.replace(/\n/g, "<br>")}</div>
        `;

        articleContainer.style.display = 'none';
        articleView.style.display = 'block';
        scrollUtils.margin(articleView, -20);
        codeAdditional();
    }
    function convertToTable(text) {
        return text.replace(
            /(?:^|\n)(?:(?:[^\n]*\|[^\n]*)\n?){2,}/g,
            match => {
                // 檢查是否在 <pre> 或 <code> 區塊內（簡單防禦）
                if (/<pre[\s\S]*?>[\s\S]*$/.test(text.split(match)[0]) &&
                    /<\/pre>/.test(text.split(match)[1])) {
                    return match; // 不處理 <pre> 內的內容
                }

                const rows = match.trim().split('\n');
                const tableRows = rows.map((line, index) => {
                    const cleanedLine = line.trim().replace(/^(\|)+|(\|)+$/g, '');
                    const cells = cleanedLine.split('|').map(cell => cell.trim());
                    const tag = index === 0 ? 'th' : 'td';
                    const rowHtml = cells.map(cell => `<${tag}>${cell}</${tag}>`).join('');
                    return `<tr>${rowHtml}</tr>`;
                });

                return `<table>${tableRows.join('')}</table>`;
            }
        );
    }
    function convertToSyntax(text) {
        const lines = text.split('\n');
        const htmlLines = [];
        let inParagraph = false;
        let paragraphBuffer = [];

        const parseContent = (line) => {
            let html = line;

            // <img> 圖片：->(link)
            html = html.replace(/->\((.+?)\)/g, (_, url) => `<img src="${url.trim()}">`);

            // <a> 超連結（新開視窗）：+content+>link
            html = html.replace(/\+(.+?)\+>(https?:\/\/[^\s]+)/g, (_, content, link) => `<a href="${link.trim()}" target="_blank">${content.trim()}</a>`);

            // <a> 超連結：-content->link
            html = html.replace(/-(.+?)->(https?:\/\/[^\s]+)/g, (_, content, link) => `<a href="${link.trim()}">${content.trim()}</a>`);

            // <span>：-> content
            html = html.replace(/->\s+([^\n]+)/g, (_, content) => `<span>${content.trim()}</span>`);

            return html;
        };

        const flushParagraph = () => {
            if (paragraphBuffer.length > 0) {
                const raw = paragraphBuffer.join('\n').trim();

                // 嘗試抓出 font-size（例如 >20）
                const sizeMatch = raw.match(/>(\d+)\s*$/);
                const size = sizeMatch ? sizeMatch[1] : null;

                // 移除開頭的 - 和結尾的 > 或 >數字
                let content = raw;

                // 如果有指定 font-size，就移除 >數字
                if (size) {
                    content = content.replace(/>(\d+)\s*$/, '');
                } else {
                    // 否則只移除單純的 >
                    content = content.replace(/>\s*$/, '');
                }

                // 再移除開頭的 -
                content = content.replace(/^-\s*/, '').trim();

                // 最後輸出段落
                const style = size ? ` style="font-size:${size}px"` : '';
                htmlLines.push(`<p${style}>${parseContent(content)}</p>`);

                paragraphBuffer = [];
            }
        };

        const isInlineLink = (line) => {
            return /^\+.+\+>https?:\/\/.+/.test(line) || /^-.+->https?:\/\/.+/.test(line);
        };

        for (let line of lines) {
            const trimmed = line;

            // 優先處理超連結語法（避免與標題衝突）
            if (isInlineLink(trimmed)) {
                htmlLines.push(parseContent(trimmed));
            }
            // 段落開始
            else if (/^-.*/.test(trimmed) && !inParagraph) {
                inParagraph = true;
                paragraphBuffer.push(trimmed);
                if (/>\d*\s*$/.test(trimmed)) {
                    flushParagraph();
                    inParagraph = false;
                }
            }
            // 段落中
            else if (inParagraph) {
                paragraphBuffer.push(trimmed);
                if (/>$/.test(trimmed)) {
                    flushParagraph();
                    inParagraph = false;
                }
            }
            // 標題行（排除超連結語法）
            else if (/^\++/.test(trimmed)) {
                const plusMatch = trimmed.match(/^(\++)/);
                const plusCount = plusMatch ? plusMatch[1].length : 0;
                const headingLevel = Math.max(1, 7 - plusCount);
                const inner = trimmed.replace(/^(\++)\s*/, '');
                const parsedInner = parseContent(inner);
                htmlLines.push(`<h${headingLevel}>${parsedInner}</h${headingLevel}>`);
            }
            // 其他行
            else {
                htmlLines.push(parseContent(trimmed));
            }
        }

        return htmlLines.join('\n');
    }
    // 依時間排序
    function renderChronologicalOrder(articles) {
        articleContainer.innerHTML = '';
        articleContainer.style.position = 'relative';
        articleContainer.style.width = '100%';
        articleContainer.style.padding = '2rem 0';
        articleContainer.style.boxSizing = 'border-box';

        // 垂直線
        const line = document.createElement('div');
        line.className = 'histroy-tracker-line';
        articleContainer.appendChild(line);

        const allArticles = [];

        for (const [key, value] of Object.entries(articles)) {
            if (Array.isArray(value)) {
                allArticles.push(...value);
            }
        }

        let previousDate = null;
        let allMargin = 0;
        const now = new Date();
        const insertedYears = new Set();
        allArticles
            .sort((a, b) => b.date - a.date)
            .forEach(article => {
                const year = new Date(article.date).getFullYear();
                if (!insertedYears.has(year)) {
                    const yearlyDivision = document.createElement('div');
                    yearlyDivision.className = 'histroy-tracker-yearly-division';
                    yearlyDivision.textContent = `${year}`;
                    articleContainer.appendChild(yearlyDivision);
                    insertedYears.add(year);
                }

                const wrapper = document.createElement('div');
                wrapper.className = 'histroy-tracker-wrapper';

                // 判斷時間是否在中午以前
                const dateObj = new Date(article.date);
                const hour = dateObj.getHours();
                const isMorning = hour < 12;

                // 判斷間距
                const baseMargin = 5;
                const referenceDate = previousDate || now;
                const dayDiff = Math.floor(Math.abs(dateObj - referenceDate) / (1000 * 60 * 60 * 24));
                dayDiff !== 0 && (wrapper.style.marginTop = `${baseMargin + dayDiff * baseMargin}px`);
                previousDate = dateObj;
                allMargin += baseMargin + dayDiff * baseMargin;

                wrapper.style.justifyContent = isMorning ? 'flex-start' : 'flex-end';

                const card = document.createElement('div');
                card.className = 'histroy-tracker-card';

                const bottomLine = document.createElement('div');
                bottomLine.className = 'histroy-tracker-bottom-line';
                bottomLine.style.backgroundImage = isMorning ?
                    'linear-gradient(to left, var(--accent), transparent)' :
                    'linear-gradient(to right, var(--accent), transparent)';

                const date = document.createElement('p');
                date.className = 'histroy-tracker-date';
                date.textContent = dateutils.ToDateTime(article.date);
                date.style.textAlign = isMorning ? 'right' : 'left';

                const h5 = document.createElement('h5');
                h5.textContent = article.title;
                h5.style.marginTop = '10px';
                h5.style.textAlign = isMorning ? 'right' : 'left';

                const tagContainer = document.createElement('div');
                tagContainer.className = 'cardTagContainer';
                tagContainer.style.justifyContent = isMorning ? 'flex-end' : '';
                article.tags?.forEach(tag => {
                    const tags = document.createElement('span');
                    tags.className = 'cardTag';
                    tags.style.fontSize = '0.8rem';
                    tags.textContent = tag;
                    tags.onclick = (e) => {
                        e.stopPropagation();
                        renderTagArticles(tag, articles);
                    };
                    tagContainer.appendChild(tags);
                });

                card.appendChild(date);
                card.appendChild(bottomLine);
                card.appendChild(tagContainer);
                card.appendChild(h5);
                card.onclick = () => showArticle(article);

                wrapper.appendChild(card);
                articleContainer.appendChild(wrapper);

                scrollUtils.margin(articleContainer, -20);
            });
        const linearHeight = (articleContainer.offsetHeight - allMargin ** 0.9) / allMargin;
        line.style.backgroundImage = `linear-gradient(to bottom, transparent, var(--accent) ${linearHeight}%, var(--accent) ${100 - linearHeight}%, transparent)`;
    }
    // 標籤雲
    let matchedArticles = [];
    function renderTagCloud(articles) {
        articleContainer.innerHTML = '';
        const tagCloud = document.createElement('div');
        tagCloud.innerHTML = '<h1>推薦標籤</h1>';
        tags?.forEach(tag => {
            matchedArticles = [];
            Object.values(articles).forEach(articleList => {
                articleList.forEach(article => {
                    if (article.tags?.includes(tag)) {
                        matchedArticles.push(article);
                    }
                });
            });
            const tagCloudDisplay = document.createElement('span');
            tagCloudDisplay.className = 'tagCloud';
            tagCloudDisplay.textContent = `${tag} `;
            const baseSize = 14;
            const maxSize = 32;
            const scale = 2;
            let fontSize = baseSize + matchedArticles.length * scale;
            fontSize = Math.min(fontSize, maxSize);
            tagCloudDisplay.style.fontSize = (matchedArticles.length !== 0 ? fontSize : 0) + 'px';
            const opacity = Math.min(0.2 + Math.log2(matchedArticles.length + 1) / 5, 1);
            tagCloudDisplay.style.opacity = opacity;
            const weight = Math.min(400 + matchedArticles.length * 50, 900);
            tagCloudDisplay.style.fontWeight = weight;
            tagCloudDisplay.addEventListener('click', () => {
                renderTagArticles(tag, articles);
            });

            tagCloud.appendChild(tagCloudDisplay);
        });
        articleContainer.appendChild(tagCloud);
        scrollUtils.margin(articleContainer, -20);
    }
    function renderTagArticles(tag, articles, page = 1) {
        const pageSize = 5;
        let matchedArticles = [];

        Object.values(articles).forEach(articleList => {
            articleList.forEach(article => {
                if (article.tags?.includes(tag)) {
                    matchedArticles.push(article);
                }
            });
        });

        const totalPages = Math.ceil(matchedArticles.length / pageSize);
        const startIndex = (page - 1) * pageSize;
        const pagedArticles = matchedArticles.slice(startIndex, startIndex + pageSize);

        articleContainer.innerHTML = '';

        const tagCloudArticleContainer = document.createElement('div');
        tagCloudArticleContainer.className = 'tagCloudArticleContainer';
        articleContainer.appendChild(tagCloudArticleContainer);

        const tagCloudArticleTitle = document.createElement('h1');
        tagCloudArticleTitle.className = 'tag';
        tagCloudArticleTitle.textContent = `${tag} – ${page}/${totalPages}`;
        tagCloudArticleContainer.appendChild(tagCloudArticleTitle);

        pagedArticles.forEach(article => {
            const tagCloudArticle = document.createElement('div');
            tagCloudArticle.className = 'tagCloudArticle';
            tagCloudArticle.innerHTML = `${article.title}`;
            tagCloudArticle.onclick = () => showArticle(article);

            const tagCloudDate = document.createElement('div');
            tagCloudDate.className = 'tagCloudDate';
            tagCloudDate.textContent = dateutils.ToDateTime(article.date);

            tagCloudArticleContainer.appendChild(tagCloudArticle);
            tagCloudArticleContainer.appendChild(tagCloudDate);

            article.tags?.forEach(articleTag => {
                const tagCloudtag = document.createElement('div');
                tagCloudtag.className = 'tagCloudtag tag';
                tagCloudtag.textContent = articleTag;
                tagCloudtag.addEventListener('click', () => {
                    renderTagArticles(articleTag, articles, 1);
                });
                tagCloudDate.insertBefore(tagCloudtag, tagCloudDate.firstChild);
            });
        });

        // 分頁控制
        const pagination = document.createElement('div');
        pagination.className = 'pagination';

        if (page > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.textContent = '«';
            prevBtn.onclick = () => renderTagArticles(tag, articles, page - 1);
            pagination.appendChild(prevBtn);
        }

        if (page < totalPages) {
            const nextBtn = document.createElement('button');
            nextBtn.textContent = '»';
            nextBtn.onclick = () => renderTagArticles(tag, articles, page + 1);
            pagination.appendChild(nextBtn);
        }

        articleContainer.appendChild(pagination);

        scrollUtils.margin(articleContainer, -20);
    }


    articleBackButton.onclick = () => {
        articleView.style.display = 'none';
        articleContainer.style.display = 'flex';
    }

    function codeAdditional() {
        const codeBlocks = document.querySelectorAll('code');

        codeBlocks.forEach((codeBlock, index) => {
            // Create a wrapper div for the checkbox and code block
            const wrapper = document.createElement('div');
            wrapper.style.position = 'relative';
            wrapper.style.display = 'inline-block';

            // Create a checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.style.position = 'absolute';
            checkbox.style.top = '-15px';
            checkbox.style.left = '-15px';
            checkbox.style.appearance = 'none';
            checkbox.style.backgroundColor = '#333';
            checkbox.style.borderRadius = '100%';
            checkbox.style.width = '10px';
            checkbox.style.height = '10px';
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    checkbox.style.backgroundColor = '#999';
                    codeBlock.style.whiteSpace = 'pre-wrap';
                    codeBlock.style.wordBreak = 'break-all';
                } else {
                    checkbox.style.backgroundColor = '#333';
                    codeBlock.style.whiteSpace = '';
                    codeBlock.style.wordBreak = '';
                }
            });

            // Wrap the code block with the wrapper
            codeBlock.parentNode.insertBefore(wrapper, codeBlock);
            wrapper.appendChild(checkbox);
            wrapper.appendChild(codeBlock);
        });

        function addCodeNum(element) {
            const codeText = element.innerHTML;
            const lines = codeText.split('\n');
            let numberedCode = '';
            for (var i = 0; i < lines.length; i++) {
                numberedCode += `<div class="no-select codenum-atv" contenteditable="false" style="display: inline-block;color: #555;">${(i + 1).toString().padEnd(lines.length.toString().length, ' ')} </div>${lines[i]}`;

                if (i < lines.length - 1) {
                    numberedCode += '\n';
                }
            }
            element.innerHTML = numberedCode;
        }

        // Highlight
        const csKeywords = [
            ['this', 'true', 'false', 'const', 'var', 'public', 'private', 'await', 'float', 'int', 'bool', 'long', 'uint', 'ulong', 'string', 'char', 'double', 'void', 'static', 'new', 'class', 'as', 'default', 'null', 'using', 'namespace', 'virtual', 'override', 'typeof', 'sizeof', 'get', 'set', 'in', 'out', 'ref', 'params', 'base', 'enum', 'struct', 'event', 'interface', 'abstract', 'readonly', 'sealed', 'lock', 'async'],
            ['if', 'else', 'for', 'while', 'break', 'return', 'try', 'catch', 'finally', 'throw', 'switch', 'case', 'foreach', 'do', 'continue', 'yield'],
            ['Vector2', 'Vector3', 'Vector4', 'Mathf', 'Color']
        ];
        const jsKeywords = [
            ['this', 'true', 'false', 'const', 'let', 'var', 'function', 'class', 'new', 'typeof', 'instanceof', 'delete', 'void', 'undefined', 'null', 'async', 'await', 'static', 'import', 'extends', 'super', 'yield', 'get', 'set'],
            ['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'export', 'default', 'return'],
            ['window', 'document'],
            ['Array', 'Object', 'Math', 'Date', 'JSON', 'RegExp', 'Promise', 'Map', 'Set', 'Symbol', 'console', 'window', 'document']
        ];
        const keywordStyles = {
            'language-csharp': [
                { keywords: csKeywords[0], style: 'color: #569cd6;font-weight:bold;' },
                { keywords: csKeywords[1], style: 'color: #d8a0df;font-weight:bold' },
                { keywords: csKeywords[2], style: 'color: #86c691;font-weight:bold' }
            ],
            'language-javascript': [
                { keywords: jsKeywords[0], style: 'color: #439CCB;font-weight:bold' },
                { keywords: jsKeywords[1], style: 'color: #C586C0;font-weight:bold' },
                { keywords: jsKeywords[2], style: 'color: #9CDCFE;font-weight:bold' },
                { keywords: jsKeywords[3], style: 'color: #4EC9B0;font-weight:bold' }
            ]
        };

        codeBlocks.forEach(codeBlock => {
            const language = codeBlock.className;
            const styles = keywordStyles[language] || keywordStyles['language-csharp'];

            const raw = codeBlock.innerText;
            const highlighted = raw
                // 字串高亮
                .replace(/`(?:\\[\s\S]|[^\\`])*`/g, match => `<span style="color:#ce9178;">${match}</span>`)
                .replace(/"(?:\\.|[^"\\])*"/g, match => `<span style="color:#ce9178;">${match}</span>`)
                .replace(/'(?:\\.|[^'\\])*'/g, match => `<span style="color:#ce9178;">${match}</span>`)
                // 註解
                .replace(/\/\/.*/g, match => `<span style="color: #57a64a;">${match}</span>`)
                .replace(/\/\*[\s\S]*?\*\//g, (match) => {
                    return `<span style="color: #57a64a;">${match}</span>`;
                })
                .replace(/\b\d+(\.\d+)?\b/g, match => {
                    return `<span style="color: #b5cea8;">${match}</span>`;
                })
                // 數字
                .replace(/\b0x[0-9a-fA-F]+\b/g, match => {
                    return `<span style="color: #b5cea8;">${match}</span>`;
                })
                // 類別.方法
                .replace(/\.([a-zA-Z]+)/g, (match, p1) => {
                    return `.<span style="color: #F0F0AA;font-weight:bold;">${p1}</span>`;
                })
                // KeyWords
                .replace(/\b(\w+)\b/g, (match) => {
                    for (const { keywords, style } of styles) {
                        if (keywords.includes(match)) {
                            return `<span style="${style}">${match}</span>`;
                        }
                    }
                    return match;
                });
            codeBlock.innerHTML = highlighted;

            addCodeNum(codeBlock);
        });
    }

    function renderSearchBox(parent, articlesData, allUsers) {
        document.querySelector('.search-input-container')?.remove();
        document.querySelector('.search-result-container')?.remove();
        if (!parent) {
            console.error('指定的 parent 元素不存在');
            return;
        }

        const inputContainer = document.createElement('div');
        inputContainer.className = 'search-input-container';
        inputContainer.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="20px" height="20px" fill="var(--accent)" viewBox="0 0 119.828 122.88" enable-background="new 0 0 119.828 122.88" xml:space="preserve"><g><path d="M48.319,0C61.662,0,73.74,5.408,82.484,14.152c8.744,8.744,14.152,20.823,14.152,34.166 c0,12.809-4.984,24.451-13.117,33.098c0.148,0.109,0.291,0.23,0.426,0.364l34.785,34.737c1.457,1.449,1.465,3.807,0.014,5.265 c-1.449,1.458-3.807,1.464-5.264,0.015L78.695,87.06c-0.221-0.22-0.408-0.46-0.563-0.715c-8.213,6.447-18.564,10.292-29.814,10.292 c-13.343,0-25.423-5.408-34.167-14.152C5.408,73.741,0,61.661,0,48.318s5.408-25.422,14.152-34.166C22.896,5.409,34.976,0,48.319,0 L48.319,0z M77.082,19.555c-7.361-7.361-17.53-11.914-28.763-11.914c-11.233,0-21.403,4.553-28.764,11.914 C12.194,26.916,7.641,37.085,7.641,48.318c0,11.233,4.553,21.403,11.914,28.764c7.36,7.361,17.53,11.914,28.764,11.914 c11.233,0,21.402-4.553,28.763-11.914c7.361-7.36,11.914-17.53,11.914-28.764C88.996,37.085,84.443,26.916,77.082,19.555 L77.082,19.555z"/></g></svg>';

        const input = document.createElement('input');
        input.className = 'search-input';
        input.type = 'text';
        input.placeholder = '輸入關鍵字搜尋文章...';
        inputContainer.appendChild(input);

        const closeBtn = document.createElement('div');
        closeBtn.className = 'search-close-btn';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => {
            inputContainer.style.position = '';
            inputContainer.style.top = '';
            input.style.width = '';
            input.value = '';
            Search();
        });
        inputContainer.appendChild(closeBtn);

        const resultContainer = document.createElement('div');
        resultContainer.className = 'search-result-container';
        resultContainer.style.padding = '10px';
        input.addEventListener('focus', () => {
            inputContainer.style.opacity = '1';
            inputContainer.style.position = 'sticky';
            inputContainer.style.top = '20px';
            input.style.width = '100%';
            Search();
        });
        input.addEventListener('blur', async () => {
            inputContainer.style.opacity = '';
            if (input.value.trim() === '') {
                inputContainer.style.position = '';
                inputContainer.style.top = '';
                input.style.width = '';
            }
        });

        // 高亮函式
        function highlight(text, keyword) {
            const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // 避免正則錯誤
            const regex = new RegExp(`(${escapedKeyword})`, 'gi');
            return text.replace(regex, `<mark>$1</mark>`);
        }
        function removeMarkTags(text) {
            return text.replace(/<\/?mark>/gi, '');
        }

        input.addEventListener('input', Search);
        function Search() {
            function stripHTML(html) {
                const temp = document.createElement('div');
                temp.innerHTML = html;
                return temp.textContent || temp.innerText || '';
            }
            const keyword = input.value.trim().toLowerCase();
            resultContainer.innerHTML = '';

            if (keyword === '') return;

            const matchedArticles = [];
            const matchedUsers = [];

            for (const category in articlesData) {
                const articles = articlesData[category];
                articles.forEach(article => {

                    if (stripHTML(dateutils.ToDateTime(article.date)).toLowerCase().includes(keyword)
                        || stripHTML(article.content).toLowerCase().includes(keyword)
                        || stripHTML(article.summary).toLowerCase().includes(keyword)
                        || stripHTML(article.title).toLowerCase().includes(keyword)) {
                        matchedArticles.push({
                            category,
                            content: highlight(article.content, keyword),
                            summary: highlight(article.summary, keyword),
                            title: highlight(article.title, keyword),
                            date: article.date,
                            dateText: highlight(dateutils.ToDateTime(article.date), keyword)
                        });
                    }
                });
            }
            allUsers.forEach(user => {
                if (user.toLowerCase().includes(keyword)) {
                    matchedUsers.push({
                        name: highlight(user, keyword),
                    });
                }
            });

            if (matchedArticles.length === 0 && matchedUsers.length === 0) {
                resultContainer.innerHTML = '<p style="width:100%;text-align:center;color: var(--text);opacity:0.5;">找不到相關文章</p>';
            } else {
                matchedUsers.forEach(user => {
                    const hrItem = document.createElement('div');
                    hrItem.className = 'hr';
                    hrItem.style.margin = '5px 0';
                    const topicItem = document.createElement('div');
                    topicItem.style.borderTopLeftRadius = '10px';
                    topicItem.style.borderLeft = '6px solid var(--border)';
                    topicItem.innerHTML = `<strong style="color: var(--text);">&thinsp;帳號</strong>`;
                    const item = document.createElement('div');
                    item.style.cursor = 'pointer';
                    item.style.wordBreak = 'break-word';
                    item.style.borderLeft = '6px solid var(--border)';
                    item.style.padding = '6px';
                    item.style.backgroundColor = 'var(--bg)';
                    item.style.borderBottomLeftRadius = '10px';
                    item.innerHTML = `<h3 id="articleTitle">${user.name}</h3>`;
                    item.addEventListener('mouseenter', () => {
                        item.style.boxShadow = '0 8px 12px -4px var(--border)';
                        item.style.borderBottom = '1px solid var(--border)';
                        topicItem.style.backgroundColor = 'var(--border)';
                        item.style.backgroundColor = 'var(--border)';
                    });
                    item.addEventListener('mouseleave', () => {
                        item.style.boxShadow = 'var(--bg)';
                        item.style.borderBottom = 'none';
                        topicItem.style.backgroundColor = '';
                        item.style.backgroundColor = 'var(--bg)';
                    });
                    item.onclick = async () => {
                        window.location.href = `/?user=${stripHTML(user.name)}`;
                    }
                    resultContainer.appendChild(topicItem);
                    resultContainer.appendChild(item);
                    resultContainer.appendChild(hrItem);
                });
                matchedArticles.forEach(article => {
                    const hrItem = document.createElement('div');
                    hrItem.className = 'hr';
                    hrItem.style.margin = '5px 0';
                    const topicItem = document.createElement('div');
                    topicItem.style.borderTopLeftRadius = '10px';
                    topicItem.style.borderTopRightRadius = '10px';
                    topicItem.style.borderLeft = '6px solid var(--accent)';
                    topicItem.style.borderRight = '1px solid var(--accent)';
                    topicItem.style.borderTop = '3px solid var(--accent)';
                    topicItem.innerHTML = `<strong style="color: var(--text);">&thinsp;${article.category}</strong>`;
                    const item = document.createElement('div');
                    item.style.cursor = 'pointer';
                    item.style.wordBreak = 'break-word';
                    item.style.borderLeft = '6px solid var(--accent)';
                    item.style.padding = '6px';
                    item.style.backgroundColor = 'var(--bg)';
                    item.style.borderBottomLeftRadius = '10px';
                    item.style.borderBottomRightRadius = '10px';
                    item.innerHTML = `
                        <h2 id="articleTitle" style="color: var(--accent);">
                            ${article.title}
                        </h2>
                        <span id="articleBody">
                            <p style="fontSize: 0.8rem;color: #aaaa;">
                                ${article.dateText}
                            </p>
                            ${article.content}
                        </span>
                        `;
                    item.addEventListener('mouseenter', () => {
                        topicItem.style.backgroundColor = 'var(--border)';
                        item.style.backgroundColor = 'var(--border)';
                    });
                    item.addEventListener('mouseleave', () => {
                        topicItem.style.backgroundColor = '';
                        item.style.backgroundColor = 'var(--bg)';
                    });
                    item.onclick = async () => {
                        const articleNoneHighlight = article;
                        articleNoneHighlight.content = removeMarkTags(articleNoneHighlight.content);
                        articleNoneHighlight.summary = removeMarkTags(articleNoneHighlight.summary);
                        articleNoneHighlight.title = removeMarkTags(articleNoneHighlight.title);
                        showArticle(articleNoneHighlight);
                        resultContainer.innerHTML = '';
                        scrollUtils.margin(articleView, -20);
                    }
                    resultContainer.appendChild(topicItem);
                    resultContainer.appendChild(item);
                    resultContainer.appendChild(hrItem);
                });
            }
            scrollUtils.margin(resultContainer.firstChild, -100);
        }

        parent.insertBefore(resultContainer, parent.firstChild.nextSibling.nextSibling);
        parent.insertBefore(inputContainer, parent.firstChild.nextSibling.nextSibling);
    }

    const nowYear = new Date().getFullYear();
    const targetYear = 2025;
    footer.render(`© ${targetYear === nowYear ? nowYear : `${targetYear} ~ ${nowYear}`} DUCKODE | 技術筆記`);
})();