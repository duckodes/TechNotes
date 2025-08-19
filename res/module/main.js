import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import fetcher from "./fetcher.js";
import dateutils from "./dateutils.js";

const main = (async () => {
    const firebaseConfig = await fetcher.load('../res/config/firebaseConfig.json');
    const app = initializeApp(firebaseConfig);
    const database = getDatabase(app);

    onValue(ref(database, 'technotes'), async (snapshot) => {
        UpdateCategoryList(snapshot.val());
    });

    const categoryList = document.getElementById('categoryList');
    const articleContainer = document.getElementById('articleContainer');
    const articleView = document.getElementById('articleView');
    const articleTitle = document.getElementById('articleTitle');
    const articleBody = document.getElementById('articleBody');
    const articleContent = articleView.querySelector('.article-content');
    const articleBackButton = articleContent.querySelector('.back-btn');

    let lastCategoryIndex = 0;

    function UpdateCategoryList(articles) {
        if (categoryList.children.length > 0) {
            categoryList.innerHTML = '';
        }
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
            renderArticles(articles, Object.keys(articles)[Object.keys(articles).length - 1]);
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
            <p>${article.content}</p>
        `;

        articleContainer.style.display = 'none';
        articleView.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        codeAdditional();
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
                } else {
                    checkbox.style.backgroundColor = '#333';
                    codeBlock.style.whiteSpace = '';
                }
            });

            // Wrap the code block with the wrapper
            codeBlock.parentNode.insertBefore(wrapper, codeBlock);
            wrapper.appendChild(checkbox);
            wrapper.appendChild(codeBlock);
        });
    }
})();