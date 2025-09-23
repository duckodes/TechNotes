const scrollUtils = (() => {
    function margin(element, margin) {
        const top = element.getBoundingClientRect().top + window.scrollY + margin;
        window.scrollTo({ top, behavior: 'smooth' });
    }
    return {
        margin: margin
    };
})();

export default scrollUtils;