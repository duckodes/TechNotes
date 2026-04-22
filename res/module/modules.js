async function load(path) {
  return (await fetch(path)).json();
}
export const fetcher = {
  load,
  firebaseConfig: await load('../res/config/firebaseConfig.json')
};

export const dateutils = (() => {
    function ToDate(timestamp = Date.now()) {
        const date = new Date(timestamp);
        return date;
    }
    function ToDateTime(timestamp = Date.now()) {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    function dateTimeToTimestamp(year = 0, month = 0, day = 0, hours = 0, minutes = 0, seconds = 0) {
        const timestamp = new Date(year, month - 1, day, hours, minutes, seconds).getTime();
        return timestamp;
    }
    function _dateTimeToTimestamp(dateTimeString = "1970-1-1_08:00:00") {
        const [datePart, timePart] = dateTimeString.split('_');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes, seconds] = timePart.split(':').map(Number);

        const timestamp = new Date(year, month - 1, day, hours, minutes, seconds).getTime();
        return timestamp;
    }
    function encrypt(timestamp = Date.now()) {
        const now = new Date(timestamp);
        const uniqueCode = `${now.getFullYear()}${now.getMonth()}${now.getDate()}${now.getHours()}${now.getMinutes()}${now.getSeconds()}${now.getMilliseconds()}${Math.random() * 10000}`;
        const hashedCode = btoa(uniqueCode).replace(/=/g, '');
        return hashedCode;
    }
    return {
        ToDate: ToDate,
        ToDateTime: ToDateTime,
        ToTimestamp: dateTimeToTimestamp,
        _ToTimestamp: _dateTimeToTimestamp,
        ToHash: encrypt
    }
})();
export const themeutils = (() => {
    function set(theme) {
        document.querySelector('.theme-root').href = `res/css/${theme}/root.css`;
        document.querySelector('.theme-style').href = `res/css/${theme}/style.css`;
    }
    return {
        set: set
    }
})();
export const scrollUtils = (() => {
    function margin(element, margin) {
        const top = element.getBoundingClientRect().top + window.scrollY + margin;
        window.scrollTo({ top, behavior: 'smooth' });
    }
    return {
        margin: margin
    };
})();
export const footer = (() => {
    function render(text) {
        const footer = document.querySelector('footer');
        footer.textContent = text;
    }
    return {
        render: render
    }
})();
export const textSphere = (() => {
    function init(canvas, {
        texts = [
            "還沒想好", "之後再說", "懶得標", "空空如也", "標籤失蹤",
            "標籤跑路", "標籤在度假", "標籤未定", "標籤迷路中", "標籤施工中",
            "標籤暫停中", "標籤待補", "標籤未命名", "標籤在排隊", "標籤在喝咖啡",
            "標籤放空中", "標籤未上線", "標籤還在想", "標籤正在生成", "標籤還沒醒"
        ],
        textsHexOnlyRGB = '#000000',
        step = 4,
        clicked = () => { },
        width = 600,
        height = 600,
        radius = 180,
        container,
        fontSize = 22,
        tilt = Math.PI / 9,
        velocityX = 0.1,
        velocityY = 0.1,
        velocityThreshold = 0.005,
        rotationX = Math.PI * 0.14,
        rotationZ = 0,
        visibilityThreshold = 0.1
    }) {
        const ctx = canvas.getContext('2d');
        canvas.style.touchAction = 'none';

        function calcSymmetricProgression(total, step) {
            const base = [];
            let current = 1, increment = step, sum = 0;

            while (true) {
                base.push(current);
                sum += current * 2;
                if (sum - current === total) {
                    return [...base, ...base.slice(0, -1).reverse()];
                }
                if (sum > total) break;
                current += increment;
                increment += step;
            }

            sum -= base.at(-1) * 2;
            base.pop();
            const remaining = total - sum;
            return [...base, ...(remaining > 0 ? [remaining] : []), ...base.slice().reverse()];
        }

        const counts = calcSymmetricProgression(texts.length, step);

        const config = {
            width: width,
            height: height,
            radius: radius,
            fontSize: fontSize,
            tilt: tilt,
            velocityX: velocityX,
            velocityY: velocityY,
            velocityThreshold: velocityThreshold,
            rotationX: rotationX,
            rotationZ: rotationZ,
            visibilityThreshold: visibilityThreshold
        };

        function resizeCanvas() {
            const width = container.clientWidth;
            const height = container.clientHeight;

            canvas.width = width * window.devicePixelRatio;
            canvas.height = height * window.devicePixelRatio;
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';

            ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);

            // 更新球體半徑與中心點
            config.width = width;
            config.height = height;
            config.radius = Math.min(width, height) / 3;
        }
        resizeCanvas();
        canvas.width = config.width * 2;
        canvas.height = config.height * 2;
        canvas.style.width = `${config.width}px`;
        canvas.style.height = `${config.height}px`;
        ctx.scale(2, 2);
        ctx.textAlign = 'center';

        let rx = config.rotationX;
        let rz = config.rotationZ;
        let vx = config.velocityX;
        let vy = config.velocityY;
        let isDragging = false;
        let lastX = 0, lastY = 0;
        let mouseX = -1, mouseY = -1;
        let textPositions = [];

        canvas.addEventListener('pointerdown', e => {
            isDragging = true;
            [lastX, lastY] = [e.offsetX, e.offsetY];
        });

        canvas.addEventListener('pointermove', e => {
            [mouseX, mouseY] = [e.offsetX, e.offsetY];
            if (!isDragging) return;
            const dx = e.offsetX - lastX;
            const dy = e.offsetY - lastY;
            [lastX, lastY] = [e.offsetX, e.offsetY];
            rz -= dy * 0.01;
            rx += dx * 0.01;
            vx = dx * 0.1;
            vy = dy * 0.1;
        });

        canvas.addEventListener('pointerup', () => isDragging = false);
        canvas.addEventListener('pointerleave', () => {
            isDragging = false;
            mouseX = -1;
            mouseY = -1;
            canvas.style.cursor = 'default';
        });

        canvas.addEventListener('click', (e) => {
            for (const item of textPositions) {
                if (item.alpha < config.visibilityThreshold) continue;
                ctx.font = `${item.size}px sans-serif`;

                const textWidth = ctx.measureText(item.text).width;
                const textHeight = item.size;

                const left = item.x - textWidth / 2;
                const right = item.x + textWidth / 2;
                const top = item.y - textHeight / 2;
                const bottom = item.y + textHeight / 2;

                if (e.offsetX >= left && e.offsetX <= right && e.offsetY >= top && e.offsetY <= bottom) {
                    clicked(item.text);
                    break;
                }
            }
        });

        function rotate(x, y, angle) {
            return [
                x * Math.cos(angle) - y * Math.sin(angle),
                x * Math.sin(angle) + y * Math.cos(angle)
            ];
        }

        function render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            textPositions = [];
            let ix = 0, iz = 0;
            let cursorOverText = false;

            for (let i = 0; i < texts.length; i++) {
                const text = texts[i];
                const degZ = Math.PI / (counts.length - 1) * iz;
                const degX = 2 * Math.PI / counts[iz] * ix;

                let x = config.radius * Math.sin(degZ) * Math.cos(degX);
                let y = config.radius * Math.sin(degZ) * Math.sin(degX);
                let z = config.radius * Math.cos(degZ) + 8 * (ix % 2);

                [y, z] = rotate(y, z, config.tilt);
                [x, z] = rotate(x, z, rz);
                [x, y] = rotate(x, y, rx);

                const alpha = 0.1 + 0.9 * (x / config.radius);
                const baseSize = config.fontSize + 5 * (x / config.radius);
                const drawX = y + config.width / 2;
                const drawY = -z + config.height / 2;

                let isHovered = false;
                let displaySize = baseSize;
                let displayAlpha = alpha;

                if (alpha >= config.visibilityThreshold && mouseX >= 0 && mouseY >= 0) {
                    const textWidth = ctx.measureText(text).width;
                    const textHeight = baseSize;

                    const left = drawX - textWidth / 2;
                    const right = drawX + textWidth / 2;
                    const top = drawY - textHeight / 2;
                    const bottom = drawY + textHeight / 2;

                    isHovered = mouseX >= left && mouseX <= right && mouseY >= top && mouseY <= bottom;

                    if (isHovered) {
                        displaySize = baseSize * 1.2;
                        displayAlpha = 1;
                        cursorOverText = true;
                    }
                }

                ctx.fillStyle = hexToRGBA(textsHexOnlyRGB, displayAlpha);
                function hexToRGBA(hex, alpha = 1) {
                    hex = hex.replace('#', '');
                    if (hex.length === 3) {
                        hex = hex.split('').map(c => c + c).join('');
                    }
                    const r = parseInt(hex.substring(0, 2), 16);
                    const g = parseInt(hex.substring(2, 4), 16);
                    const b = parseInt(hex.substring(4, 6), 16);
                    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                }
                ctx.font = `${displaySize}px "Arial", sans-serif`;
                ctx.fillText(text, drawX, drawY);

                textPositions.push({ text, x: drawX, y: drawY, size: displaySize, alpha });

                ix--;
                if (ix < 0) {
                    iz++;
                    ix = counts[iz] - 1;
                }
            }

            canvas.style.cursor = cursorOverText ? 'pointer' : 'default';
        }

        function animate() {
            requestAnimationFrame(animate);
            render();

            if (isDragging) {
                rz += vy * 0.01;
                rx += vx * 0.01;
                vx *= 0.55;
                vy *= 0.55;
            } else {
                // 平滑地將 vx, vy 漸漸趨近 config.velocityX/Y
                vx += (config.velocityX - vx) * config.velocityThreshold;
                vy += (config.velocityY - vy) * config.velocityThreshold;

                rz += vy * 0.01;
                rx += vx * 0.01;
            }
        }

        animate();
    }
    return {
        init: init
    }
})();
export const comment = (() => {
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
            Object.entries(replies).forEach(([id, { name, message, nameColor }]) => {
                const reply = document.createElement('div');
                reply.className = 'reply-card';
                if (nameColor) {
                    reply.innerHTML = `<strong style="color: ${nameColor};">🖈 ${name}</strong><p>${message}</p>`;
                } else {
                    reply.innerHTML = `<strong>${name}</strong><p>${message}</p>`;
                }
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
export const dagreUtils = (() => {
    /** @type {[{ from: string, to: string }]} */
    const transitions = [
        { from: '', to: '' } // ← 這裡會跳出提示
    ];

    /**
     * 根據狀態轉換渲染流程圖
     * 
     * @param {transitions} transitions 狀態轉換的陣列，每個物件代表一個節點連接
     * @param {Object} options 渲染選項
     * @param {HTMLElement} [options.parent=document.body] 要插入圖形的父元素
     * 
     * @param {'LR'|'TB'} [options.dir='LR'] 排列方向：'LR' 從左到右，'TB' 從上到下
     * 
     * @param {number} [options.nodePadding=20] 節點內部間距
     * @param {string} [options.nodeBackground='none'] 節點背景色
     * @param {string} [options.nodeStroke='#aaa'] 節點邊框顏色
     * @param {number} [options.nodeStrokeWidth=1] 節點邊框寬度
     * @param {number} [options.nodeRadius=5] 節點圓角半徑
     * @param {string} [options.nodeTextColor='#aaa'] 節點文字顏色
     * @param {number} [options.nodefontSize=14] 節點文字大小
     * 
     * @param {string} [options.arrowColor='#ddd'] 箭頭顏色
     * @param {number} [options.arrowWidth=2] 箭頭線寬
     * @param {number} [options.arrowSize=10] 箭頭大小
     * @param {number} [options.arrowStartOffset=0] 箭頭起始偏移
     * @param {number} [options.arrowEndOffset=0] 箭頭結束偏移
     * 
     * @param {number} [options.marginX=50] 圖形左右邊距
     * @param {number} [options.marginY=50] 圖形上下邊距
     */
    function render(transitions, {
        appendParent = false,
        parent = document.body,

        size = '',
        dir = 'LR',

        nodePadding = 20,
        nodefontSize = 14,
        nodeBackground = 'none',
        nodeStroke = '#aaa',
        nodeStrokeWidth = 1,
        nodeRadius = 5,
        nodeTextColor = '#aaa',

        arrowColor = '#ddd',
        arrowWidth = 2,
        arrowSize = 10,
        arrowStartOffset = 0,
        arrowEndOffset = 0,

        marginX = 50,
        marginY = 50
    }) {
        const diagramContainer = document.createElement('div');
        diagramContainer.className = 'diagram-container';
        diagramContainer.style.maxWidth = size;

        const diagramSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        diagramSvg.setAttribute('class', 'diagram');
        diagramSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        diagramSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        diagramContainer.appendChild(diagramSvg);

        if (appendParent) parent.appendChild(diagramContainer);

        const g = new dagre.graphlib.Graph();
        g.setGraph({ rankdir: dir, marginX, marginY });
        g.setDefaultEdgeLabel(() => ({}));

        const allNodes = [...new Set(transitions.flatMap(t => [t.from, t.to]))];
        const nodeTypes = {};
        transitions.forEach(({ from, to, type }) => {
            if (type) {
                nodeTypes[from] = type;
                nodeTypes[to] = type;
            }
        });

        allNodes.forEach(label => {
            const width = label.length * nodefontSize * 0.6 + nodePadding * 2;
            const height = nodefontSize + nodePadding;
            g.setNode(label, { label, width, height });
        });

        transitions.forEach(({ from, to }) => {
            g.setEdge(from, to);
        });

        dagre.layout(g);

        while (diagramSvg.firstChild) diagramSvg.removeChild(diagramSvg.firstChild);

        const padding = 50;
        const maxX = Math.max(...allNodes.map(n => g.node(n).x + g.node(n).width / 2)) + padding;
        const maxY = Math.max(...allNodes.map(n => g.node(n).y + g.node(n).height / 2)) + padding;
        diagramSvg.setAttribute('viewBox', `0 0 ${maxX} ${maxY}`);

        // Arrow marker
        const markerId = `arrow-${Date.now()}`;
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `
<marker id="${markerId}" markerWidth="${arrowSize}" markerHeight="${arrowSize}" refX="${arrowSize / 2}" refY="${arrowSize / 2}" orient="auto">
<path d="M0,0 L${arrowSize},${arrowSize / 2} L0,${arrowSize} Z" fill="${arrowColor}" />
</marker>`;
        diagramSvg.appendChild(defs);

        // Draw edges
        g.edges().forEach(e => {
            const edge = g.edge(e);
            const points = edge.points;
            const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            polyline.setAttribute('points', points.map(p => `${p.x},${p.y}`).join(' '));
            polyline.setAttribute('fill', 'none');
            polyline.setAttribute('stroke', arrowColor);
            polyline.setAttribute('stroke-width', arrowWidth);
            polyline.setAttribute('marker-end', `url(#${markerId})`);

            const first = points[0], second = points[1];
            const dxStart = second.x - first.x, dyStart = second.y - first.y;
            const lenStart = Math.sqrt(dxStart * dxStart + dyStart * dyStart);
            const newFirst = {
                x: first.x + (dxStart / lenStart) * arrowStartOffset,
                y: first.y + (dyStart / lenStart) * arrowStartOffset
            };

            const last = points[points.length - 1], secondLast = points[points.length - 2];
            const dx = last.x - secondLast.x, dy = last.y - secondLast.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const newLast = {
                x: last.x - (dx / len) * (arrowEndOffset + 10),
                y: last.y - (dy / len) * (arrowEndOffset + 10)
            };

            const adjustedPoints = [newFirst, ...points.slice(1, -1), newLast];
            polyline.setAttribute('points', adjustedPoints.map(p => `${p.x},${p.y}`).join(' '));
            diagramSvg.appendChild(polyline);
        });

        // Draw nodes
        allNodes.forEach(label => {
            const node = g.node(label);
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            const type = nodeTypes[label] || 'process';

            let shapeElement;

            switch (type) {
                case 'start':
                case 'end':
                    shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                    shapeElement.setAttribute('cx', node.x);
                    shapeElement.setAttribute('cy', node.y);
                    shapeElement.setAttribute('rx', node.width / 2);
                    shapeElement.setAttribute('ry', node.height / 2);
                    break;

                case 'decision':
                    shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                    shapeElement.setAttribute('points', [
                        `${node.x},${node.y - node.height / 2}`,
                        `${node.x + node.width / 2},${node.y}`,
                        `${node.x},${node.y + node.height / 2}`,
                        `${node.x - node.width / 2},${node.y}`
                    ].join(' '));
                    break;

                case 'input':
                case 'output':
                    shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                    shapeElement.setAttribute('points', [
                        `${node.x - node.width / 2 + 10},${node.y - node.height / 2}`,
                        `${node.x + node.width / 2},${node.y - node.height / 2}`,
                        `${node.x + node.width / 2 - 10},${node.y + node.height / 2}`,
                        `${node.x - node.width / 2},${node.y + node.height / 2}`
                    ].join(' '));
                    break;

                case 'data':
                    shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    shapeElement.setAttribute('d', `
            M ${node.x - node.width / 2} ${node.y - node.height / 2}
            a ${node.width / 2} ${node.height / 4} 0 0 1 ${node.width} 0
            v ${node.height / 2}
            a ${node.width / 2} ${node.height / 4} 0 0 1 -${node.width} 0
            Z
          `);
                    break;

                default:
                    shapeElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    shapeElement.setAttribute('x', node.x - node.width / 2);
                    shapeElement.setAttribute('y', node.y - node.height / 2);
                    shapeElement.setAttribute('width', node.width);
                    shapeElement.setAttribute('height', node.height);
                    shapeElement.setAttribute('rx', nodeRadius);
            }

            shapeElement.setAttribute('fill', nodeBackground);
            shapeElement.setAttribute('stroke', nodeStroke);
            shapeElement.setAttribute('stroke-width', nodeStrokeWidth);
            group.appendChild(shapeElement);

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', node.x);
            text.setAttribute('y', node.y + nodefontSize / 3);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', nodefontSize);
            text.setAttribute('fill', nodeTextColor);
            text.textContent = label;
            group.appendChild(text);

            diagramSvg.appendChild(group);
        });

        return diagramContainer.outerHTML;
    }
    return {
        render: render
    }
})();