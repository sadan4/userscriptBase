class Style {
    private el: HTMLStyleElement;
    constructor(css: string, private baseEl: HTMLElement) {
        const el = document.createElement("style");
        el.innerHTML = css;
        this.el = el;
    }
    private _enabled = false;

    public get enabled() {
        return this._enabled;
    }

    private set enabled(_) {
        throw new Error("please use .enable instead");
    }


    public disable() {
        if(!this.enabled) throw new Error("You cant disable a stylesheet that isnt enabled");
        this.el.remove();
        this._enabled = false
    }

    public enable() {
        if(this.enabled) throw new Error("this stylesheet is already enabled");
        this.baseEl.appendChild(this.el);
        this._enabled = true;
    }
}
export default class CssManager {
    private static styles: Style[] = [];
    private static _hasInit = false;
    private static baseElement: HTMLElement = document.documentElement;
    public static get hasInit() {
        return this._hasInit
    }
    
    private static set hasInit(v) {
        this._hasInit = v;
    }

    public static init() {
        if(this.hasInit) throw new Error("the css manager is already initialized");
        this.hasInit = true;
        this.update();
    }

    public static update() {
        if(!this.hasInit) throw new Error("the css manager isnt initialized yet, please use init() first");
        this.styles.filter(s => !s.enabled).map(x => x.enable());
    }
    
    public static disableAll() {
        this.styles.filter(s => s.enabled).map(x => x.disable());
    }

    public static addStyleSheet(code: string) {
        this.styles.push(new Style(code, this.baseElement));
        this.hasInit && this.update();
    }
}