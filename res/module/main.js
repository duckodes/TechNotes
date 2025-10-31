import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, push, get, remove, onValue } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import fetcher from "./fetcher.js";
import dateutils from "./date.utils.js";
import themeutils from "./theme.utils.js";
import scrollUtils from "./scroll.utils.js";
import footer from "./footer.js";
import textSphere from "./text.sphere.js";
import comment from "./comment.js";
import dagreUtils from "./dagre.utils.js";

const main = (async () => {
    const firebaseConfig = await fetcher.load('../res/config/firebaseConfig.json');
    const app = initializeApp(firebaseConfig);
    const database = getDatabase(app);

    const urlSearchParams = new URLSearchParams(window.location.search);
    const dataKey = await findParentNodeById(urlSearchParams.size === 0 ? (await get(ref(database, 'technotes/user/DPcmhV427VQNJ9ojiOTD2aYyuE83/name'))).val() : urlSearchParams.get('user'));
    function initProfile(url = '', name = `無使用者資料`, title = '', employed = '', email = '', github = '', data) {
        const profile = document.querySelector('.profile');
        const profileImage = profile.querySelector('.avatar');
        profileImage.src = url;
        const profileName = profile.querySelector('h3');
        profileName.textContent = name;
        const profileDesc = profile.querySelectorAll('p');
        profileDesc[0].textContent = title;
        profileDesc[1].textContent = employed;
        if (!data) return;
        profileDesc[2].innerHTML = !data.email ? '' : email;
        profileDesc[3].innerHTML = !data.github ? '' : github;
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
                `<a href="mailto:${data.email}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 20 20">
                        <path fill="var(--text)" d="m1.574 5.286l7.5 4.029c.252.135.578.199.906.199c.328 0 .654-.064.906-.199l7.5-4.029c.489-.263.951-1.286.054-1.286H1.521c-.897 0-.435 1.023.053 1.286zm17.039 2.203l-7.727 4.027c-.34.178-.578.199-.906.199s-.566-.021-.906-.199s-7.133-3.739-7.688-4.028C.996 7.284 1 7.523 1 7.707V15c0 .42.566 1 1 1h16c.434 0 1-.58 1-1V7.708c0-.184.004-.423-.387-.219z"></path>
                    </svg>
                </a>`,
                `<a href="${data.github}" target="_blank">
                    <svg viewBox="0 0 100 100" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="var(--text)">
                        <path width="100%" height="100%" fill-rule="evenodd" clip-rule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"></path>
                    </svg>
                </a>`,
                data);
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
    let stopCategoryList = false;

    const topic = document.querySelector('.layout>header');
    async function UpdateTopic(text) {
        topic.textContent = text;
        document.title = text;
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
        await waitShowArticle((await get(ref(database, `technotes/data/${dataKey}`))).val()[urlSearchParams.get('category')][urlSearchParams.get('categoryID')], urlSearchParams.get('category'), urlSearchParams.get('categoryID'));
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
        if (stopCategoryList) return;
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

        articles[category].forEach((article, index) => {
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

            card.onclick = () => showArticle(article, category, index);
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
    async function waitShowArticle(article, category, index) {
        articleTitle.innerHTML = article.title;

        const images = await loadImages(article.images);
        const imageHTML = article.images?.length
            ? `<div class="article-images">${images.map(img =>
                `<img src="${img.src}" alt="文章圖片" style="width:100%; border-radius:10px;" crossorigin="anonymous" />`
            ).join('')}</div>`
            : '';
        const convertToText = document.createElement('div');
        convertToText.innerHTML = article.content;
        article.content = convertToText.textContent;
        article.content = convertDagreSyntax(article.content);
        article.content = convertToTable(article.content);
        article.content = convertToLinksNewTab(article.content);
        article.content = convertToLinks(article.content);
        article.content = convertToImages(article.content);
        article.content = convertToHeadings(article.content);
        article.content = convertToStrong(article.content);
        article.content = convertToSpanWithSize(article.content);
        article.content = convertToParagraphWithSize(article.content);
        article.content = convertToCodeBlocks(article.content);
        article.content = convertToListBlocks(article.content);
        article.content = convertToIframes(article.content);
        articleBody.innerHTML = `
            <p style="fontSize: 0.8rem;color: #aaaa;">${dateutils.ToDateTime(article.date)}</p>
            ${imageHTML}
            <div class="articleMainText">${article.content.replace(/\n/g, "<br>")}</div>
        `;
        article.content = convertToText.innerHTML;
        articleBody.querySelectorAll('P').forEach(p => {
            if (p.nextSibling && p.nextSibling.nodeName === 'BR') {
                p.nextSibling.remove();
            }
        });
        articleBody.querySelectorAll('ul').forEach(ul => {
            ul.querySelectorAll('br').forEach(br => br.remove());
            if (ul.previousSibling && ul.previousSibling.nodeName === 'BR') {
                ul.previousSibling.remove();
            }
            if (ul.nextSibling && ul.nextSibling.nodeName === 'BR') {
                ul.nextSibling.remove();
            }
        });
        articleBody.querySelectorAll('pre').forEach(pre => {
            if (pre.nextSibling && pre.nextSibling.nodeName === 'BR') {
                pre.nextSibling.remove();
            }
        });

        imageMagnifier();

        articleContainer.style.display = 'none';
        articleView.style.display = 'block';
        scrollUtils.margin(articleView, -20);
        codeAdditional();

        const allowComments = (await get(ref(database, `technotes/data/${dataKey}/${category}/${index}/allowcomments`))).val();
        if (allowComments) {
            const commentKeyMap = new WeakMap();

            comment.render(articleBody, async (name, message, commentElement) => {
                stopCategoryList = true;
                const newComment = await push(ref(database, `technotes/data/${dataKey}/${category}/${index}/comments`), { name, message });
                stopCategoryList = false;

                commentKeyMap.set(commentElement, newComment.key);

                const commentKeys = JSON.parse(localStorage.getItem("commentKeys") || "[]");
                commentKeys.push(newComment.key);
                localStorage.setItem("commentKeys", JSON.stringify(commentKeys));

                if (deleteID().includes(newComment.key)) {
                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = '刪除';
                    deleteButton.addEventListener('click', () => {
                        deleteComment(dataKey, category, newComment.key, commentElement);
                    });
                    commentElement.querySelector('p').appendChild(deleteButton);
                }

                return true;
            }, async (replyName, replyMessage, commentElement, replyElement) => {
                const id = commentKeyMap.get(commentElement);
                if (!id) return false;
                stopCategoryList = true;
                const newComment = await push(ref(database, `technotes/data/${dataKey}/${category}/${index}/comments/${id}/replies`), {
                    name: replyName,
                    message: replyMessage
                });
                stopCategoryList = false;
                const commentKeys = JSON.parse(localStorage.getItem("commentKeys") || "[]");
                commentKeys.push(newComment.key);
                localStorage.setItem("commentKeys", JSON.stringify(commentKeys));

                if (deleteID().includes(newComment.key)) {
                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = '刪除';
                    deleteButton.addEventListener('click', () => {
                        deleteReplyComment(dataKey, category, id, newComment.key, replyElement);
                    });
                    replyElement.querySelector('p').appendChild(deleteButton);
                }

                return true;
            });

            loadComments(dataKey, category);
            async function loadComments(dataKey, category) {
                const snapshot = await get(ref(database, `technotes/data/${dataKey}/${category}/${index}/comments`));

                if (snapshot.exists()) {
                    const comments = snapshot.val();
                    Object.entries(comments).forEach(([id, { name, message, replies }]) => {
                        const commentElement = comment.createComment(name, message, replies, async (replyName, replyMessage, commentElement, replyElement) => {
                            stopCategoryList = true;
                            const newComment = await push(ref(database, `technotes/data/${dataKey}/${category}/${index}/comments/${id}/replies`), { name: replyName, message: replyMessage });
                            stopCategoryList = false;
                            const commentKeys = JSON.parse(localStorage.getItem("commentKeys") || "[]");
                            commentKeys.push(newComment.key);
                            localStorage.setItem("commentKeys", JSON.stringify(commentKeys));
                            if (deleteID().includes(newComment.key)) {
                                const deleteButton = document.createElement('button');
                                deleteButton.textContent = '刪除';
                                deleteButton.addEventListener('click', () => {
                                    deleteReplyComment(dataKey, category, id, newComment.key, replyElement);
                                });
                                replyElement.querySelector('p').appendChild(deleteButton);
                            }
                            return true;
                        });
                        if (deleteID().includes(id)) {
                            const deleteButton = document.createElement('button');
                            deleteButton.textContent = '刪除';
                            deleteButton.addEventListener('click', () => {
                                deleteComment(dataKey, category, id, commentElement);
                            });
                            commentElement.querySelector('p').appendChild(deleteButton);
                        }
                        Object.entries(replies || {}).forEach(([replyId, { name: replyName, message: replyMessage }]) => {
                            if (deleteID().includes(replyId)) {
                                commentElement.querySelectorAll('.reply-card').forEach(replyElement => {
                                    if (replyElement.textContent.trim() !== replyName.trim() + replyMessage.trim()) return;
                                    const deleteButton = document.createElement('button');
                                    deleteButton.textContent = '刪除';
                                    deleteButton.addEventListener('click', () => {
                                        deleteReplyComment(dataKey, category, id, replyId, replyElement);
                                    });
                                    replyElement.querySelector('p').appendChild(deleteButton);
                                });
                            }
                        });
                    });
                }
            }
            function deleteID() {
                const commentKeys = JSON.parse(localStorage.getItem("commentKeys") || "[]");
                return commentKeys;
            }
            async function deleteComment(uid, category, commentId, commentElement) {
                const commentKeys = deleteID();
                if (commentKeys.includes(commentId)) {
                    stopCategoryList = true;
                    await remove(ref(database, `technotes/data/${uid}/${category}/${index}/comments/${commentId}`));
                    stopCategoryList = false;
                    // 從 localStorage 移除該 ID
                    const updatedIds = commentKeys.filter(id => id !== commentId);
                    if (updatedIds.length === 0) {
                        localStorage.removeItem("commentKeys");
                    } else {
                        localStorage.setItem("commentKeys", JSON.stringify(updatedIds));
                    }
                    commentElement.remove();

                    console.log("已刪除留言：", commentId);
                } else {
                    console.warn("無權刪除這筆留言，因為不在 localStorage 中");
                }
            }
            async function deleteReplyComment(uid, category, commentId, replyId, commentElement) {
                const commentKeys = deleteID();
                if (commentKeys.includes(replyId)) {
                    stopCategoryList = true;
                    await remove(ref(database, `technotes/data/${uid}/${category}/${index}/comments/${commentId}/replies/${replyId}`));
                    stopCategoryList = false;
                    // 從 localStorage 移除該 ID
                    const updatedIds = commentKeys.filter(id => id !== replyId);
                    if (updatedIds.length === 0) {
                        localStorage.removeItem("commentKeys");
                    } else {
                        localStorage.setItem("commentKeys", JSON.stringify(updatedIds));
                    }
                    commentElement.remove();

                    console.log("已刪除留言：", replyId);
                } else {
                    console.warn("無權刪除這筆留言，因為不在 localStorage 中");
                }
            }
        }
    }
    function showArticle(article, category, index) {
        articleTitle.innerHTML = article.title;

        const imageHTML = article.images?.length
            ? `<div class="article-images">${article.images.map(src =>
                `<img src="${src}" alt="文章圖片" style="width:100%; border-radius:10px;" crossorigin="anonymous" />`
            ).join('')}</div>`
            : '';
        const convertToText = document.createElement('div');
        convertToText.innerHTML = article.content;
        article.content = convertToText.textContent;

        article.content = convertDagreSyntax(article.content);
        article.content = convertToTable(article.content);
        article.content = convertToLinksNewTab(article.content);
        article.content = convertToLinks(article.content);
        article.content = convertToImages(article.content);
        article.content = convertToHeadings(article.content);
        article.content = convertToStrong(article.content);
        article.content = convertToSpanWithSize(article.content);
        article.content = convertToParagraphWithSize(article.content);
        article.content = convertToCodeBlocks(article.content);
        article.content = convertToListBlocks(article.content);
        article.content = convertToIframes(article.content);
        articleBody.innerHTML = `
            <p style="fontSize: 0.8rem;color: #aaaa;">${dateutils.ToDateTime(article.date)}</p>
            ${imageHTML}
            <div class="articleMainText">${article.content.replace(/\n/g, "<br>")}</div>
        `;
        article.content = convertToText.innerHTML;
        articleBody.querySelectorAll('P').forEach(p => {
            if (p.nextSibling && p.nextSibling.nodeName === 'BR') {
                p.nextSibling.remove();
            }
        });
        articleBody.querySelectorAll('ul').forEach(ul => {
            ul.querySelectorAll('br').forEach(br => br.remove());
            if (ul.previousSibling && ul.previousSibling.nodeName === 'BR') {
                ul.previousSibling.remove();
            }
            if (ul.nextSibling && ul.nextSibling.nodeName === 'BR') {
                ul.nextSibling.remove();
            }
        });
        articleBody.querySelectorAll('pre').forEach(pre => {
            if (pre.nextSibling && pre.nextSibling.nodeName === 'BR') {
                pre.nextSibling.remove();
            }
        });

        imageMagnifier();

        articleContainer.style.display = 'none';
        articleView.style.display = 'block';
        scrollUtils.margin(articleView, -20);
        codeAdditional();

        get(ref(database, `technotes/data/${dataKey}/${category}/${index}/allowcomments`)).then(snapshot => {
            const allowComments = snapshot.val();
            if (!allowComments) return;
            const commentKeyMap = new WeakMap();

            comment.render(articleBody, async (name, message, commentElement) => {
                stopCategoryList = true;
                const newComment = await push(ref(database, `technotes/data/${dataKey}/${category}/${index}/comments`), { name, message });
                stopCategoryList = false;

                commentKeyMap.set(commentElement, newComment.key);

                const commentKeys = JSON.parse(localStorage.getItem("commentKeys") || "[]");
                commentKeys.push(newComment.key);
                localStorage.setItem("commentKeys", JSON.stringify(commentKeys));

                if (deleteID().includes(newComment.key)) {
                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = '刪除';
                    deleteButton.addEventListener('click', () => {
                        deleteComment(dataKey, category, newComment.key, commentElement);
                    });
                    commentElement.querySelector('p').appendChild(deleteButton);
                }

                return true;
            }, async (replyName, replyMessage, commentElement, replyElement) => {
                const id = commentKeyMap.get(commentElement);
                if (!id) return false;
                stopCategoryList = true;
                const newComment = await push(ref(database, `technotes/data/${dataKey}/${category}/${index}/comments/${id}/replies`), {
                    name: replyName,
                    message: replyMessage
                });
                stopCategoryList = false;
                const commentKeys = JSON.parse(localStorage.getItem("commentKeys") || "[]");
                commentKeys.push(newComment.key);
                localStorage.setItem("commentKeys", JSON.stringify(commentKeys));

                if (deleteID().includes(newComment.key)) {
                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = '刪除';
                    deleteButton.addEventListener('click', () => {
                        deleteReplyComment(dataKey, category, id, newComment.key, replyElement);
                    });
                    replyElement.querySelector('p').appendChild(deleteButton);
                }

                return true;
            });

            loadComments(dataKey, category);
            async function loadComments(dataKey, category) {
                const snapshot = await get(ref(database, `technotes/data/${dataKey}/${category}/${index}/comments`));

                if (snapshot.exists()) {
                    const comments = snapshot.val();
                    Object.entries(comments).forEach(([id, { name, message, replies }]) => {
                        const commentElement = comment.createComment(name, message, replies, async (replyName, replyMessage, commentElement, replyElement) => {
                            stopCategoryList = true;
                            const newComment = await push(ref(database, `technotes/data/${dataKey}/${category}/${index}/comments/${id}/replies`), { name: replyName, message: replyMessage });
                            stopCategoryList = false;
                            const commentKeys = JSON.parse(localStorage.getItem("commentKeys") || "[]");
                            commentKeys.push(newComment.key);
                            localStorage.setItem("commentKeys", JSON.stringify(commentKeys));
                            if (deleteID().includes(newComment.key)) {
                                const deleteButton = document.createElement('button');
                                deleteButton.textContent = '刪除';
                                deleteButton.addEventListener('click', () => {
                                    deleteReplyComment(dataKey, category, id, newComment.key, replyElement);
                                });
                                replyElement.querySelector('p').appendChild(deleteButton);
                            }
                            return true;
                        });
                        if (deleteID().includes(id)) {
                            const deleteButton = document.createElement('button');
                            deleteButton.textContent = '刪除';
                            deleteButton.addEventListener('click', () => {
                                deleteComment(dataKey, category, id, commentElement);
                            });
                            commentElement.querySelector('p').appendChild(deleteButton);
                        }
                        Object.entries(replies || {}).forEach(([replyId, { name: replyName, message: replyMessage }]) => {
                            if (deleteID().includes(replyId)) {
                                commentElement.querySelectorAll('.reply-card').forEach(replyElement => {
                                    if (replyElement.textContent.trim() !== replyName.trim() + replyMessage.trim()) return;
                                    const deleteButton = document.createElement('button');
                                    deleteButton.textContent = '刪除';
                                    deleteButton.addEventListener('click', () => {
                                        deleteReplyComment(dataKey, category, id, replyId, replyElement);
                                    });
                                    replyElement.querySelector('p').appendChild(deleteButton);
                                });
                            }
                        });
                    });
                }
            }
            function deleteID() {
                const commentKeys = JSON.parse(localStorage.getItem("commentKeys") || "[]");
                return commentKeys;
            }
            async function deleteComment(uid, category, commentId, commentElement) {
                const commentKeys = deleteID();
                if (commentKeys.includes(commentId)) {
                    stopCategoryList = true;
                    await remove(ref(database, `technotes/data/${uid}/${category}/${index}/comments/${commentId}`));
                    stopCategoryList = false;
                    // 從 localStorage 移除該 ID
                    const updatedIds = commentKeys.filter(id => id !== commentId);
                    if (updatedIds.length === 0) {
                        localStorage.removeItem("commentKeys");
                    } else {
                        localStorage.setItem("commentKeys", JSON.stringify(updatedIds));
                    }
                    commentElement.remove();

                    console.log("已刪除留言：", commentId);
                } else {
                    console.warn("無權刪除這筆留言，因為不在 localStorage 中");
                }
            }
            async function deleteReplyComment(uid, category, commentId, replyId, commentElement) {
                const commentKeys = deleteID();
                if (commentKeys.includes(replyId)) {
                    stopCategoryList = true;
                    await remove(ref(database, `technotes/data/${uid}/${category}/${index}/comments/${commentId}/replies/${replyId}`));
                    stopCategoryList = false;
                    // 從 localStorage 移除該 ID
                    const updatedIds = commentKeys.filter(id => id !== replyId);
                    if (updatedIds.length === 0) {
                        localStorage.removeItem("commentKeys");
                    } else {
                        localStorage.setItem("commentKeys", JSON.stringify(updatedIds));
                    }
                    commentElement.remove();

                    console.log("已刪除留言：", replyId);
                } else {
                    console.warn("無權刪除這筆留言，因為不在 localStorage 中");
                }
            }
        });
    }
    const imagePreviewContainer = document.querySelector('.image-preview-container');
    const imagePreview = imagePreviewContainer.querySelector('.image-preview');
    const imagePreviewCanvas = document.createElement('canvas');
    const imagePreviewCtx = imagePreviewCanvas.getContext('2d');

    function imageMagnifier() {
        articleBody.querySelectorAll('img').forEach(img => {
            img.style.cursor = 'pointer';
            img.addEventListener('click', () => {
                imagePreviewCtx.clearRect(0, 0, imagePreviewCanvas.width, imagePreviewCanvas.height);
                imagePreviewCanvas.width = img.naturalWidth;
                imagePreviewCanvas.height = img.naturalHeight;
                imagePreviewCtx.drawImage(img, 0, 0);
                const dataURL = imagePreviewCanvas.toDataURL();
                imagePreview.style.backgroundImage = `url(${dataURL})`;
                imagePreviewContainer.style.display = 'flex';
                requestAnimationFrame(() => {
                    imagePreview.classList.add('active');
                });

            });
        });
    }
    window.addEventListener('scroll', scrollImagePreview);
    window.addEventListener('wheel', scrollImagePreview);
    function scrollImagePreview() {
        imagePreview.classList.add('unactive');
        imagePreview.classList.remove('active');
        setTimeout(() => {
            imagePreview.classList.remove('unactive');
            imagePreviewContainer.style.display = '';
            imagePreview.style.transform = '';
        }, 200);
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
    function convertToLinks(text) {
        return text.replace(/\[a:([^\[\]]+)\[\[([\s\S]*?)\]\]\]/g, (match, href, content) => {
            return `<a href="${href.trim()}">${content.trim()}</a>`;
        });
    }
    function convertToLinksNewTab(text) {
        return text.replace(/\[\+a:([^\[\]]+)\[\[([\s\S]*?)\]\]\]/g, (match, href, content) => {
            return `<a href="${href.trim()}" target="_blank" rel="noopener noreferrer">${content.trim()}</a>`;
        });
    }
    function convertToImages(text) {
        return text.replace(/\[img:([^\[\]]+)(?:\[([^\[\]]*)?(?:\[([^\[\]]*)\])?\])?\]/g, (match, src, alt, width) => {
            const attrs = [`src="${src.trim()}"`, 'loading="lazy"'];
            if (alt) attrs.push(`alt="${alt.trim()}"`);
            if (width) attrs.push(`style="width:${width.trim()}"`);
            return `<img ${attrs.join(' ')} crossorigin="anonymous" />`;
        });
    }
    function convertToHeadings(text) {
        return text.replace(/\[(h[1-6])\[\[([\s\S]*?)\]\]\]/g, (match, tag, content) => {
            return `<${tag}>${content.trim()}</${tag}>`;
        });
    }
    function convertToSpanWithSize(text) {
        return text
            .replace(/\[span:(\d+)\[\[([\s\S]*?)\]\]\]/g, (match, size, content) => {
                const fontSize = Math.min(parseInt(size, 10), 72);
                return `<span style="font-size:${fontSize}px">${content.trim()}</span>`;
            })
            .replace(/\[span\[\[([\s\S]*?)\]\]\]/g, (match, content) => {
                return `<span>${content.trim()}</span>`;
            });
    }
    function convertToParagraphWithSize(text) {
        return text
            .replace(/\[p:(\d+)\[\[([\s\S]*?)\]\]\]/g, (match, size, content) => {
                const fontSize = Math.min(parseInt(size, 10), 72);
                return `<p style="font-size:${fontSize}px">${content.trim()}</p>`;
            })
            .replace(/\[p\[\[([\s\S]*?)\]\]\]/g, (match, content) => {
                return `<p>${content.trim()}</p>`;
            });
    }
    function convertToStrong(text) {
        return text
            .replace(/\[strong:(\d+)\[\[([\s\S]*?)\]\]\]/g, (match, size, content) => {
                const fontSize = Math.min(parseInt(size, 10), 72);
                return `<strong style="font-size:${fontSize}px">${content.trim()}</strong>`;
            })
            .replace(/\[strong\[\[([\s\S]*?)\]\]\]/g, (match, content) => {
                return `<strong>${content.trim()}</strong>`;
            });
    }
    function escapeHTML(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    function convertToCodeBlocks(text) {
        return text
            .replace(/\[code:([^\[\]]+)\[\[([\s\S]*?)\]\]\]/g, (match, language, content) => {
                return `<pre><code class="${language}">${content.trimStart().trimEnd()}</code></pre>`;
            })
            .replace(/\[code\[\[([\s\S]*?)\]\]\]/g, (match, content) => {
                return `<pre><code>${content.trimStart().trimEnd()}</code></pre>`;
            });;
    }
    function convertToIframes(text) {
        return text.replace(/\(iframe:([^\[\]]+)\[\[([\s\S]*?)\]\]\)/g, (match, attrString, url) => {
            const attrs = extractWidthHeight(attrString.trim());
            return `<iframe ${attrs} src="${url.trim()}" loading="lazy" referrerpolicy="no-referrer"></iframe>`;
        });
        function extractWidthHeight(attrString) {
            const widthMatch = attrString.match(/width=["']([^"']+)["']/);
            const heightMatch = attrString.match(/height=["']([^"']+)["']/);

            const width = widthMatch ? `width="${escapeHTML(widthMatch[1])}"` : '';
            const height = heightMatch ? `height="${escapeHTML(heightMatch[1])}"` : '';

            return [width, height].filter(Boolean).join(' ');
        }
    }

    function convertToListBlocks(text) {
        function parseBlock(text) {
            let i = 0;
            const stack = [];
            let output = '';

            while (i < text.length) {
                if (text.startsWith('[ul[[', i) || text.startsWith('[ol[[', i)) {
                    const type = text.startsWith('[ul[[', i) ? 'ul' : 'ol';
                    stack.push(type);
                    output += `<${type}>`;
                    i += 5;
                } else if (text.startsWith('[li', i)) {
                    const liMatch = text.slice(i).match(/^\[li(?::([a-zA-Z\-]+))?\[\[/);
                    if (liMatch) {
                        const style = liMatch[1];
                        const styleAttr = style ? ` style="list-style-type:${style};"` : '';
                        stack.push('li');
                        output += `<li${styleAttr}>`;
                        i += liMatch[0].length;
                    } else {
                        i++;
                    }
                } else if (text.startsWith(']]]', i)) {
                    const last = stack.pop();
                    output += `</${last}>`;
                    i += 3;
                } else {
                    output += text[i];
                    i++;
                }
            }

            return output;
        }

        return parseBlock(text.trim());
    }
    function convertDagreSyntax(text) {
        console.log('轉換 dagre 語法中...');

        const defaultOptions = {
            parent: 'document.body',
            size: '',
            dir: 'LR',
            nodePadding: 20,
            nodefontSize: 14,
            nodeBackground: 'none',
            nodeStroke: '#aaa',
            nodeStrokeWidth: 1,
            nodeRadius: 5,
            nodeTextColor: '#aaa',
            arrowColor: '#ddd',
            arrowWidth: 2,
            arrowSize: 10,
            arrowStartOffset: 0,
            arrowEndOffset: 0,
            marginX: 50,
            marginY: 50
        };

        return text.replace(/\[dagre(?::([^\[\]]+))?\[\[([\s\S]*?)\]\]\]/g, (match, optionString = '', rawArg) => {
            // 支援語法：{a, b, type} → { from: "a", to: "b", type: "type" }
            const pairs = [...rawArg.matchAll(/\{([^,{}]+)\s*,\s*([^,{}]+)(?:\s*,\s*([^,{}]+))?\}/g)];
            const transitions = pairs.map(([_, from, to, type]) => ({
                from: from.trim(),
                to: to.trim(),
                ...(type ? { type: type.trim() } : {})
            }));

            const options = { ...defaultOptions };
            if (optionString) {
                optionString.split(',').forEach(pair => {
                    const [key, value] = pair.split(':');
                    if (key && value) {
                        const parsedValue = isNaN(value) ? value.trim() : Number(value);
                        options[key.trim()] = parsedValue;
                    }
                });
            }

            const result = dagreUtils.render(transitions, options)
                .replace(/^\s*[\r\n]/gm, '')
                .replace(/\n+/g, '');
            return typeof result === 'string' ? result : '';
        });
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
                const enriched = value.map(item => ({
                    ...item,
                    category: key
                }));
                allArticles.push(...enriched);
            }
        }

        let previousDate = null;
        let allMargin = 0;
        const now = new Date();
        const insertedYears = new Set();
        allArticles
            .sort((a, b) => b.date - a.date)
            .forEach((article, index) => {
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
                card.onclick = () => showArticle(article, article.category, index);

                wrapper.appendChild(card);
                articleContainer.appendChild(wrapper);

                scrollUtils.margin(articleContainer, -20);
            });
        const linearHeight = (articleContainer.offsetHeight - allMargin ** 0.9) / allMargin;
        line.style.backgroundImage = `linear-gradient(to bottom, transparent, var(--accent) ${linearHeight}%, var(--accent) ${100 - linearHeight}%, transparent)`;
    }
    // 標籤雲
    let matchedArticles = [];
    let isRenderTextSphere = false;
    let textSphereCanvas = document.createElement('canvas');
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

        if (!isRenderTextSphere) {
            isRenderTextSphere = true;
            textSphereCanvas.style.width = '100%';
            textSphereCanvas.style.height = 'auto';
            textSphereCanvas.style.display = 'block';
            articleContainer.appendChild(textSphereCanvas);
            let resizeTimeout;
            let lastCanvasWidth = 0;
            window.addEventListener('resize', () => {
                if (pageSelect !== pageSelectOption.tagCloud) return;
                if (articleContainer.clientWidth === lastCanvasWidth) return;
                lastCanvasWidth = articleContainer.clientWidth;
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    textSphereCanvas.remove();
                    textSphereCanvas = document.createElement('canvas');
                    textSphereCanvas.style.width = '100%';
                    textSphereCanvas.style.height = 'auto';
                    textSphereCanvas.style.display = 'block';
                    articleContainer.appendChild(textSphereCanvas);
                    textSphere.init(textSphereCanvas, {
                        textsHexOnlyRGB: getComputedStyle(document.documentElement)
                            .getPropertyValue('--accent')
                            .trim(),
                        texts: tags,
                        clicked: (text) => {
                            tags?.forEach(tag => {
                                if (text === tag) {
                                    renderTagArticles(tag, articles);
                                }
                            });
                        },
                        container: articleContainer
                    });
                }, 500);
            });
            queueMicrotask(() => {
                textSphere.init(textSphereCanvas, {
                    textsHexOnlyRGB: getComputedStyle(document.documentElement)
                        .getPropertyValue('--accent')
                        .trim(),
                    texts: tags,
                    clicked: (text) => {
                        tags?.forEach(tag => {
                            if (text === tag) {
                                renderTagArticles(tag, articles);
                            }
                        });
                    },
                    container: articleContainer
                });
            });
        } else {
            textSphereCanvas?.remove();
            textSphereCanvas = document.createElement('canvas');
            textSphereCanvas.style.width = '100%';
            textSphereCanvas.style.height = 'auto';
            textSphereCanvas.style.display = 'block';
            articleContainer.appendChild(textSphereCanvas);
            queueMicrotask(() => {
                textSphere.init(textSphereCanvas, {
                    textsHexOnlyRGB: getComputedStyle(document.documentElement)
                        .getPropertyValue('--accent')
                        .trim(),
                    texts: tags,
                    clicked: (text) => {
                        tags?.forEach(tag => {
                            if (text === tag) {
                                renderTagArticles(tag, articles);
                            }
                        });
                    },
                    container: articleContainer
                });
            });
        }
    }
    function renderTagArticles(tag, articles, page = 1) {
        const pageSize = 5;
        let matchedArticles = [];

        Object.entries(articles).forEach(([key, articleList]) => {
            articleList.forEach(article => {
                if (article.tags?.includes(tag)) {
                    matchedArticles.push({
                        ...article,
                        category: key
                    });
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

        pagedArticles.forEach((article, index) => {
            const tagCloudArticle = document.createElement('div');
            tagCloudArticle.className = 'tagCloudArticle';
            tagCloudArticle.innerHTML = `${article.title}`;
            tagCloudArticle.onclick = () => showArticle(article, article.category, index);

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
            const codeWrapper = document.createElement('div');
            codeWrapper.className = 'codeWrapper';

            const checkbox = document.createElement('input');
            checkbox.className = 'checkBox';
            checkbox.type = 'checkbox';
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

            const topBox = document.createElement('div');
            topBox.className = 'topBox';
            const copyBox = document.createElement('div');
            copyBox.className = 'copyBox';
            const copySVG = '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="icon-sm" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>';
            copyBox.innerHTML = copySVG + ' copy';
            copyBox.addEventListener('click', () => {
                navigator.clipboard.writeText(getFilteredTextContent(codeBlock))
                    .then(() => {
                        if (getDirectChildText(copyBox) === 'copy') {
                            updateDirectText(copyBox, ' recopy');
                        } else {
                            updateDirectText(copyBox, ' copy');
                        }
                    })
                    .catch(err => {
                        console.error('error:', err);
                    });
            });
            function updateDirectText(element, newText) {
                element.childNodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        node.textContent = newText;
                    }
                });
            }
            function getDirectChildText(element) {
                if (!element) return '';

                let text = '';
                element.childNodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        text += node.textContent;
                    }
                });

                return text.trim();
            }
            function getFilteredTextContent(element) {
                if (!element) return '';

                // 深層複製 element 避免修改原始 DOM
                const clone = element.cloneNode(true);
                clone.querySelectorAll('.codenum').forEach(el => el.remove());
                return clone.textContent;
            }


            const languageBox = document.createElement('div');
            languageBox.textContent = codeBlock.className.replace('language-', '');

            codeBlock.parentNode.insertBefore(codeWrapper, codeBlock);
            topBox.appendChild(copyBox);
            topBox.appendChild(languageBox);
            topBox.appendChild(checkbox);

            codeWrapper.appendChild(codeBlock);

            codeWrapper.parentNode.insertBefore(topBox, codeWrapper);
        });

        function addCodeNum(element) {
            const codeText = element.innerHTML;
            const lines = codeText.split('\n');
            let numberedCode = '';
            for (var i = 0; i < lines.length; i++) {
                numberedCode += `<div class="codenum no-select" contenteditable="false">${(i + 1).toString().padEnd(lines.length.toString().length, ' ')} </div>${lines[i]}`;

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
                { keywords: csKeywords[0], style: 'color: var(--code-csharp-1);font-weight:bold;' },
                { keywords: csKeywords[1], style: 'color: var(--code-csharp-2);font-weight:bold' },
                { keywords: csKeywords[2], style: 'color: var(--code-csharp-3);font-weight:bold' }
            ],
            'language-javascript': [
                { keywords: jsKeywords[0], style: 'color: var(--code-javascript-1);font-weight:bold' },
                { keywords: jsKeywords[1], style: 'color: var(--code-javascript-2);font-weight:bold' },
                { keywords: jsKeywords[2], style: 'color: var(--code-javascript-3);font-weight:bold' },
                { keywords: jsKeywords[3], style: 'color: var(--code-javascript-4);font-weight:bold' }
            ]
        };
        const stringColor = getRootVar('--code-shared-string');
        const commentColor = getRootVar('--code-shared-comment');
        const numberColor = getRootVar('--code-shared-number');
        const classMethodColor = getRootVar('--code-shared-class-method');
        function getRootVar(name) {
            return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        }

        codeBlocks.forEach(codeBlock => {
            const language = codeBlock.className;
            const styles = keywordStyles[language] || keywordStyles['language-csharp'];

            const raw = codeBlock.innerText;
            const highlighted = raw
                // 字串高亮
                .replace(/`(?:\\[\s\S]|[^\\`])*`/g, match => `<span style="color: ${stringColor};">${match}</span>`)
                .replace(/"(?:\\.|[^"\\])*"/g, match => `<span style="color: ${stringColor};">${match}</span>`)
                .replace(/'(?:\\.|[^'\\])*'/g, match => `<span style="color: ${stringColor};">${match}</span>`)
                // 註解
                .replace(/\/\/.*/g, match => `<span style="color: ${commentColor};">${match}</span>`)
                .replace(/\/\*[\s\S]*?\*\//g, (match) => {
                    return `<span style="color: ${commentColor};">${match}</span>`;
                })
                // 數字
                .replace(/\b\d+(\.\d+)?\b/g, match => {
                    return `<span style="color: ${numberColor};">${match}</span>`;
                })
                .replace(/\b0x[0-9a-fA-F]+\b/g, match => {
                    return `<span style="color: ${numberColor};">${match}</span>`;
                })
                // 類別.方法
                .replace(/\.([a-zA-Z]+)/g, (match, p1) => {
                    return `.<span style="color: ${classMethodColor};font-weight:bold;">${p1}</span>`;
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
                articles.forEach((article, index) => {

                    if (stripHTML(dateutils.ToDateTime(article.date)).toLowerCase().includes(keyword)
                        || stripHTML(article.content).toLowerCase().includes(keyword)
                        || stripHTML(article.summary).toLowerCase().includes(keyword)
                        || stripHTML(article.title).toLowerCase().includes(keyword)) {

                        matchedArticles.push({
                            index,
                            category,
                            content: highlight(article.content, keyword),
                            summary: highlight(article.summary, keyword),
                            title: highlight(article.title, keyword),
                            images: article.images,
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

                    let copyContent = article.content;
                    article.content = convertToTable(article.content);
                    article.content = convertToLinksNewTab(article.content);
                    article.content = convertToLinks(article.content);
                    article.content = convertToImages(article.content);
                    article.content = convertToHeadings(article.content);
                    article.content = convertToStrong(article.content);
                    article.content = convertToSpanWithSize(article.content);
                    article.content = convertToParagraphWithSize(article.content);
                    article.content = convertToCodeBlocks(article.content);
                    article.content = convertToIframes(article.content);

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
                    article.content = copyContent;
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
                        showArticle(articleNoneHighlight, article.category, article.index);
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