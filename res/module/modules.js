import fetcher from "./fetcher.js";
import dateutils from "./date.utils.js";
import themeutils from "./theme.utils.js";
import scrollUtils from "./scroll.utils.js";
import footer from "./footer.js";
import textSphere from "./text.sphere.js";
import comment from "./comment.js";
import dagreUtils from "./dagre.utils.js";

export {
    fetcher,
    dateutils,
    themeutils,
    scrollUtils,
    footer,
    textSphere,
    comment,
    dagreUtils
};
export const firebaseConfig = await fetcher.load('../res/config/firebaseConfig.json');