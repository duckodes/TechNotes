const remove = (() => {
    function child(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
    return {
        child: child
    }
})();

export default remove;