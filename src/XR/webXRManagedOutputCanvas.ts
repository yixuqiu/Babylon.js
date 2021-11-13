import { Nullable } from "../types";
import { ThinEngine } from "../Engines/thinEngine";
import { WebXRLayerWrapper, WebXRRenderTarget } from "./webXRTypes";
import { WebXRSessionManager } from "./webXRSessionManager";
import { Observable } from "../Misc/observable";
import { Tools } from "../Misc/tools";

/**
 * Configuration object for WebXR output canvas
 */
export class WebXRManagedOutputCanvasOptions {
    /**
     * An optional canvas in case you wish to create it yourself and provide it here.
     * If not provided, a new canvas will be created
     */
    public canvasElement?: HTMLCanvasElement;
    /**
     * Options for this XR Layer output
     */
    public canvasOptions?: XRWebGLLayerInit;
    /**
     * CSS styling for a newly created canvas (if not provided)
     */
    public newCanvasCssStyle?: string;

    /**
     * Get the default values of the configuration object
     * @param engine defines the engine to use (can be null)
     * @returns default values of this configuration object
     */
    public static GetDefaults(engine?: ThinEngine): WebXRManagedOutputCanvasOptions {
        const defaults = new WebXRManagedOutputCanvasOptions();
        defaults.canvasOptions = {
            antialias: true,
            depth: true,
            stencil: engine ? engine.isStencilEnable : true,
            alpha: true,
            multiview: false,
            framebufferScaleFactor: 1,
        };

        defaults.newCanvasCssStyle = "position:absolute; bottom:0px;right:0px;z-index:10;width:90%;height:100%;background-color: #000000;";

        return defaults;
    }
}
/**
 * Creates a canvas that is added/removed from the webpage when entering/exiting XR
 */
export class WebXRManagedOutputCanvas implements WebXRRenderTarget {
    private _canvas: Nullable<HTMLCanvasElement> = null;
    private _engine: Nullable<ThinEngine> = null;
    private _originalCanvasSize: {
        width: number;
        height: number;
    };

    /**
     * Rendering context of the canvas which can be used to display/mirror xr content
     */
    public canvasContext: WebGLRenderingContext;
    /**
     * xr layer for the canvas
     */
    public xrLayer: Nullable<WebXRLayerWrapper> = null;

    /**
     * Observers registered here will be triggered when the xr layer was initialized
     */
    public onXRLayerInitObservable: Observable<WebXRLayerWrapper> = new Observable();

    /**
     * Initializes the canvas to be added/removed upon entering/exiting xr
     * @param _xrSessionManager The XR Session manager
     * @param _options optional configuration for this canvas output. defaults will be used if not provided
     */
    constructor(_xrSessionManager: WebXRSessionManager, private _options: WebXRManagedOutputCanvasOptions = WebXRManagedOutputCanvasOptions.GetDefaults()) {
        this._engine = _xrSessionManager.scene.getEngine();
        this._engine.onDisposeObservable.addOnce(() => {
            this._engine = null;
        });

        if (!_options.canvasElement) {
            const canvas = document.createElement("canvas");
            canvas.style.cssText = this._options.newCanvasCssStyle || "position:absolute; bottom:0px;right:0px;";
            this._setManagedOutputCanvas(canvas);
        } else {
            this._setManagedOutputCanvas(_options.canvasElement);
        }

        _xrSessionManager.onXRSessionInit.add(() => {
            this._addCanvas();
        });

        _xrSessionManager.onXRSessionEnded.add(() => {
            this._removeCanvas();
        });
    }

    /**
     * Disposes of the object
     */
    public dispose() {
        this._removeCanvas();
        this._setManagedOutputCanvas(null);
    }

    /**
     * Initializes the xr layer for the session
     * @param xrSession xr session
     * @returns a promise that will resolve once the XR Layer has been created
     */
    public initializeXRLayerAsync(xrSession: XRSession): Promise<WebXRLayerWrapper> {
        const createLayer = () => {
            let wrapper: WebXRLayerWrapper;

            const useLayersAPI = typeof XRWebGLBinding !== 'undefined' && XRWebGLBinding.prototype.createProjectionLayer;
            if (useLayersAPI) {
                const xrFramebuffer = this.canvasContext.createFramebuffer();
                if (!xrFramebuffer) {
                    throw new Error("Unable to create framebuffer for XR projection layer.");
                }
                const xrGLBinding = new XRWebGLBinding(xrSession, this.canvasContext);
                let layer = xrGLBinding.createProjectionLayer({
                    textureType: "texture",
                    colorFormat: this.canvasContext.RGBA,
                    depthFormat: this.canvasContext.DEPTH_COMPONENT,
                    scaleFactor: 1.0,
                });
                wrapper = WebXRLayerWrapper.CreateFromXRProjectionLayer(layer, xrFramebuffer, xrGLBinding);
            } else {
                const layer = new XRWebGLLayer(xrSession, this.canvasContext, this._options.canvasOptions);
                wrapper = WebXRLayerWrapper.CreateFromXRWebGLLayer(layer);
                this.onXRLayerInitObservable.notifyObservers(wrapper);
            }

            return wrapper;
        };

        // support canvases without makeXRCompatible
        if (!(this.canvasContext as any).makeXRCompatible) {
            this.xrLayer = createLayer();
            return Promise.resolve(this.xrLayer);
        }

        return (this.canvasContext as any)
            .makeXRCompatible()
            .then(
                // catch any error and continue. When using the emulator is throws this error for no apparent reason.
                () => { },
                () => {
                    // log the error, continue nonetheless!
                    Tools.Warn("Error executing makeXRCompatible. This does not mean that the session will work incorrectly.");
                }
            )
            .then(() => {
                this.xrLayer = createLayer();
                return this.xrLayer;
            });
    }

    private _addCanvas() {
        if (this._canvas && this._engine && this._canvas !== this._engine.getRenderingCanvas()) {
            document.body.appendChild(this._canvas);
        }
        if (this.xrLayer) {
            this._setCanvasSize(true);
        } else {
            this.onXRLayerInitObservable.addOnce((layer) => {
                this._setCanvasSize(true, layer);
            });
        }
    }

    private _removeCanvas() {
        if (this._canvas && this._engine && document.body.contains(this._canvas) && this._canvas !== this._engine.getRenderingCanvas()) {
            document.body.removeChild(this._canvas);
        }
        this._setCanvasSize(false);
    }

    private _setCanvasSize(init: boolean = true, xrLayer = this.xrLayer) {
        if (!this._canvas || !this._engine) {
            return;
        }
        if (init) {
            if (xrLayer) {
                if (this._canvas !== this._engine.getRenderingCanvas()) {
                    this._canvas.style.width = xrLayer.getWidth() + "px";
                    this._canvas.style.height = xrLayer.getHeight() + "px";
                } else {
                    this._engine.setSize(xrLayer.getWidth(), xrLayer.getHeight());
                }
            }
        } else {
            if (this._originalCanvasSize) {
                if (this._canvas !== this._engine.getRenderingCanvas()) {
                    this._canvas.style.width = this._originalCanvasSize.width + "px";
                    this._canvas.style.height = this._originalCanvasSize.height + "px";
                } else {
                    this._engine.setSize(this._originalCanvasSize.width, this._originalCanvasSize.height);
                }
            }
        }
    }

    private _setManagedOutputCanvas(canvas: Nullable<HTMLCanvasElement>) {
        this._removeCanvas();
        if (!canvas) {
            this._canvas = null;
            (this.canvasContext as any) = null;
        } else {
            this._originalCanvasSize = {
                width: canvas.offsetWidth,
                height: canvas.offsetHeight,
            };
            this._canvas = canvas;
            this.canvasContext = <any>this._canvas.getContext("webgl2");
            if (!this.canvasContext) {
                this.canvasContext = <any>this._canvas.getContext("webgl");
            }
        }
    }
}
