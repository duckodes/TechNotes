const footer = (() => {
    function render(text) {
        const footer = document.querySelector('footer');
        footer.textContent = text;
    }
    return {
        render: render
    }
})();

export default footer;