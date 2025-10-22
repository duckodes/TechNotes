const textSphere = (() => {
    function init(canvas, {
        texts = ['text1', 'text2', 'text3', 'text4', 'text5', 'text6', 'text7', 'text8', 'text9', 'text10',
            'text11', 'text12', 'text13', 'text14', 'text15', 'text16', 'text17', 'text18', 'text19', 'text20'
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

export default textSphere;