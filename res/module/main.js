import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, get, onValue } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import fetcher from "./fetcher.js";
import dateutils from "./date.utils.js";
import themeutils from "./theme.utils.js";

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
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

        allArticles
            .sort((a, b) => b.date - a.date)
            .forEach(article => {
                const wrapper = document.createElement('div');
                wrapper.className = 'histroy-tracker-wrapper';

                // 判斷時間是否在中午以前
                const dateObj = new Date(article.date);
                const hour = dateObj.getHours();
                const isMorning = hour < 12;

                wrapper.style.justifyContent = isMorning ? 'flex-start' : 'flex-end';

                const card = document.createElement('div');
                card.className = 'histroy-tracker-card';

                const bottomLine = document.createElement('div');
                bottomLine.className = 'histroy-tracker-bottom-line';
                bottomLine.style.backgroundImage = isMorning ?
                    'linear-gradient(to left, #ccc, transparent)' :
                    'linear-gradient(to right, #ccc, transparent)';
                card.appendChild(bottomLine);

                const date = document.createElement('p');
                date.className = 'histroy-tracker-date';
                date.textContent = dateutils.ToDateTime(article.date);
                date.style.textAlign = isMorning ? 'right' : 'left';

                const h3 = document.createElement('h5');
                h3.textContent = article.title;
                h3.style.margin = '0';
                h3.style.textAlign = isMorning ? 'right' : 'left';

                card.appendChild(date);
                card.appendChild(h3);
                card.onclick = () => showArticle(article);

                wrapper.appendChild(card);
                articleContainer.appendChild(wrapper);
            });
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
        const codeBlock = document.querySelectorAll('code');
        codeBlock.forEach(element => {
            addCodeNum(element);
        });
        function addCodeNum(element) {
            const codeText = element.innerText;
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
    }
})();