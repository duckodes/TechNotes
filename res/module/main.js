import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, get, onValue } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import fetcher from "./fetcher.js";
import dateutils from "./date.utils.js";
import themeutils from "./theme.utils.js";
import scrollUtils from "./scroll.utils.js";

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
    onValue(ref(database, `technotes/user/${dataKey}`), async (snapshot) => {
        const data = snapshot.val();
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
    });

    let lastCategoryIndex = null;
    let lastArticles = null;

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
    const histroyTracker = document.getElementById('histroyTracker');
    histroyTracker.addEventListener('click', () => {
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
        showArticle((await get(ref(database, `technotes/data/${dataKey}`))).val()[urlSearchParams.get('category')][urlSearchParams.get('categoryID')]);
        window.parent.postMessage({
            id: urlSearchParams.get('category') + urlSearchParams.get('categoryID'),
            height: articleView.clientHeight
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
            renderChronologicalOrder(articles);
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

            card.appendChild(h3);
            card.appendChild(p);
            card.appendChild(date);

            card.onclick = () => showArticle(article);
            articleContainer.appendChild(card);

            scrollUtils.margin(articleContainer, -20);
        });
    }

    function showArticle(article) {
        articleTitle.textContent = article.title;

        const imageHTML = article.images?.length
            ? `<div class="article-images">${article.images.map(src =>
                `<img src="${src}" alt="文章圖片" style="width:100%; border-radius:10px;" />`
            ).join('')}</div>`
            : '';

        articleBody.innerHTML = `
            <p style="fontSize: 0.8rem;color: #aaaa;">${dateutils.ToDateTime(article.date)}</p>
            ${imageHTML}
            <p>${article.content.replace(/\n/g, "<br>")}</p>
        `;

        articleContainer.style.display = 'none';
        articleView.style.display = 'block';
        scrollUtils.margin(articleView, -20);
        codeAdditional();
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
        allArticles
            .sort((a, b) => b.date - a.date)
            .forEach(article => {
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

                card.appendChild(date);
                card.appendChild(bottomLine);
                card.appendChild(h5);
                card.onclick = () => showArticle(article);

                wrapper.appendChild(card);
                articleContainer.appendChild(wrapper);

                scrollUtils.margin(articleContainer, -20);
            });
        const linearHeight = (articleContainer.offsetHeight - allMargin ** 0.9) / allMargin;
        line.style.backgroundImage = `linear-gradient(to bottom, transparent, var(--accent) ${linearHeight}%, var(--accent) ${100 - linearHeight}%, transparent)`;
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
})();