import {code} from "./style.module.css"
import CssManager from "./styles/CssManager";

// add styles
CssManager.addStyleSheet(code);

window.setTimeout(() => {
    CssManager.init();
    console.log("Hello world!");
}, 1000)