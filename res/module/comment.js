const comment = (() => {
    function render(parent, callback, repliesCallback) {
        document.querySelector('.comment-module')?.remove();

        const container = document.createElement('commentModule');
        container.className = 'comment-module';
        parent.appendChild(container);

        const section = document.createElement('div');
        section.className = 'comment-section';

        section.innerHTML = `
    <h3>💬 留言區</h3>
    <form class="comment-form" id="commentForm">
      <label for="name">您的名字：</label>
      <input type="text" id="name" name="name" required>

      <label for="message">留言內容：</label>
      <textarea id="message" name="message" rows="4" required></textarea>

      <button type="submit">送出留言</button>
    </form>
    <div id="commentList"></div>
  `;

        container.appendChild(section);

        document.getElementById('commentForm').addEventListener('submit', (e) => {
            handleCommentSubmit(e, (name, message, commentElement) => callback(name, message, commentElement), repliesCallback);
        });
    }

    function createComment(name, message, replies, repliesCallback) {
        const comment = document.createElement('div');
        comment.classList.add('comment');

        const header = document.createElement('strong');
        header.textContent = name;

        const content = document.createElement('p');
        content.textContent = message;

        const replyButton = document.createElement('button');
        replyButton.textContent = '回覆';
        replyButton.className = 'reply-btn';

        const replyForm = document.createElement('form');
        replyForm.className = 'reply-form';
        replyForm.style.display = 'none';
        replyForm.innerHTML = `
      <input type="text" name="replyName" placeholder="你的名字" required>
      <textarea name="replyMessage" rows="2" placeholder="輸入回覆內容..." required></textarea>
      <button type="submit">送出回覆</button>
    `;

        const replyList = document.createElement('div');
        replyList.className = 'reply-list';
        if (replies) {
            Object.entries(replies).forEach(([id, { name, message }]) => {
                const reply = document.createElement('div');
                reply.className = 'reply-card';
                reply.innerHTML = `<strong>${name}</strong><p>${message}</p>`;
                replyList.appendChild(reply);
            });
        }

        replyButton.addEventListener('click', () => {
            replyForm.style.display = replyForm.style.display === 'none' ? 'block' : 'none';
        });

        replyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const replyName = replyForm.replyName.value.trim();
            const replyMessage = replyForm.replyMessage.value.trim();
            if (!replyName || !replyMessage) return;
            const reply = document.createElement('div');
            reply.className = 'reply-card';
            reply.innerHTML = `<strong>${replyName}</strong><p>${replyMessage}</p>`;
            replyList.appendChild(reply);

            const success = await repliesCallback(replyName, replyMessage, comment, reply);
            if (!success) return;

            replyForm.reset();
            replyForm.style.display = 'none';
        });

        comment.appendChild(header);
        comment.appendChild(content);
        comment.appendChild(replyButton);
        comment.appendChild(replyForm);
        comment.appendChild(replyList);

        return comment;
    }

    async function handleCommentSubmit(event, callback, repliesCallback) {
        event.preventDefault();

        const name = document.getElementById('name').value.trim();
        const message = document.getElementById('message').value.trim();
        const commentList = document.getElementById('commentList');

        if (!name || !message) return;

        try {
            const newComment = createComment(name, message, null, repliesCallback);
            const success = await callback(name, message, newComment);
            if (!success) return;

            commentList.appendChild(newComment);
            event.target.reset();
        } catch (err) {
            console.error("留言儲存失敗：", err);
        }
    }
    return {
        render: render,
        createComment: (name, message, replies, repliesCallback) => {
            const commentElement = createComment(name, message, replies, repliesCallback);
            document.getElementById('commentList').appendChild(commentElement);
            return commentElement;
        },
        remove: () => {
            document.querySelector('.comment-module')?.remove();
        }
    }
})();

export default comment;