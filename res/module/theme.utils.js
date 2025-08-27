const themeutils = (() => {
    function set(theme) {
        document.querySelector('.theme-root').href = `res/css/${theme}/root.css`;
        document.querySelector('.theme-style').href = `res/css/${theme}/style.css`;
    }
    return {
        set: set
    }
})();

export default themeutils;