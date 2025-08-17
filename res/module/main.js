import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import fetcher from "./fetcher.js";
import dateutils from "./dateutils.js";

const main = (async () => {
    const firebaseConfig = await fetcher.load('../res/config/firebaseConfig.json');
    const app = initializeApp(firebaseConfig);
    const database = getDatabase(app);

    const techNotes = await get(ref(database, 'technotes'));

    const articles = !techNotes.val() ? {
        '分類': [
            {
                title: '標題',
                summary: '總結',
                content: '內容',
                image: 'https://www.duckode.com/img/duck/duck_192x_144p.png',
                date: '1755448243429'
            }
        ]
    } : techNotes.val();

    const categoryList = document.getElementById('categoryList');
    const articleContainer = document.getElementById('articleContainer');
    const articleView = document.getElementById('articleView');
    const articleTitle = document.getElementById('articleTitle');
    const articleBody = document.getElementById('articleBody');
    const articleContent = articleView.querySelector('.article-content');
    const articleBackButton = articleContent.querySelector('.back-btn');

    Object.keys(articles).forEach(category => {
        const li = document.createElement('li');
        li.textContent = category;
        li.onclick = () => renderArticles(category);
        categoryList.appendChild(li);
    });

    function renderArticles(category) {
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
    }


    articleBackButton.onclick = () => {
        articleView.style.display = 'none';
        articleContainer.style.display = 'flex';
    }

    renderArticles(Object.keys(articles)[0]);
})();