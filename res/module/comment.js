const comment = (() => {
    function render(parent, callback) {
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
            handleCommentSubmit(e, (name, message, commentElement) => callback(name, message, commentElement));
        });
    }

    function createComment(name, message) {
        const comment = document.createElement('div');
        comment.classList.add('comment');
        comment.innerHTML = `<strong>${name}</strong><p>${message}</p>`;
        return comment;
    }

    async function handleCommentSubmit(event, callback) {
        event.preventDefault();

        const name = document.getElementById('name').value.trim();
        const message = document.getElementById('message').value.trim();
        const commentList = document.getElementById('commentList');

        if (!name || !message) return;

        try {
            const newComment = createComment(name, message);
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
        createComment: (name, message) => {
            const commentElement = createComment(name, message);
            document.getElementById('commentList').appendChild(commentElement);
            return commentElement;
        },
        remove: () => {
            document.querySelector('.comment-module')?.remove();
        }
    }
})();

export default comment;