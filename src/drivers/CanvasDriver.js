/* @echo EXPORT */
class CanvasDriver extends VideoNullDriver {
  /**
   * @param  {HTMLElement} containerElement The DOM element to draw into.
   * @param  {number} width                 The width of the viewport.
   * @param  {number} height                The height of the viewport.
   */
  constructor(containerElement, width, height) {
    super(containerElement, width, height);

    /**
     * @private
     * @type {CanvasRenderingContext2D|null}
     */
    this.mCtx = null;

    // cache
    this.mGlobalAlpha = 1;
    this.mGlobalBlendMode = BlendMode.NORMAL;
    this.mIdentityMatrix = new Matrix();

    this.mLetterSpacing = 0;
    this.mRenderers = [];
    this.mSkipChildren = false;
    this.mEndPassStack = [];
    this.mEndPassRenderer = null;
    this.__createCanvas();

    this.mRendererMap = {
      DisplayObject: DisplayObjectRendererCanvas,
      Sprite: SpriteRendererCanvas,
      Emitter: EmitterRendererCanvas,
      Text: TextRendererCanvas
    };
  }

  getRenderer(type) {
    return new this.mRendererMap[type]();
  }

  registerRenderer(renderer) {
    if (renderer.isRenderable === false) {
      this.mSkipChildren = true;
      return;
    }

    // renderer.endPassRequired = false;
    // renderer.endPassRequiredAt = -1;

    this.mSkipChildren = false;
    this.mRenderers.push(renderer);

    return renderer;
  }

  render(driver) {
    //debugger
    for (let i = 0, len = this.mRenderers.length; i !== len; i++) {
      let renderer = this.mRenderers[i];

      if (renderer.endPassRequired === true) {
        this.mEndPassStack.push(renderer);
        this.mEndPassRenderer = renderer;
      }

      renderer.render(driver);
      renderer.dirty = 0;

      if (this.mEndPassRenderer !== null && this.mEndPassRenderer.endPassRequiredAt === i) {
        this.mEndPassRenderer.childrenRendered(driver);

        this.mEndPassStack.pop();
        //this.mEndPassRenderer.endPassRequired = false;
        //this.mEndPassRenderer.endPassRequiredAt = -1;
        this.mEndPassRenderer = null;
      }
    }
  }

  drawTexture(texture) {
    const w = texture.width;
    const h = texture.height;
    const ox = texture.untrimmedRect.x;
    const oy = texture.untrimmedRect.y;

    this.mCtx.drawImage(texture.native, texture.region.x, texture.region.y, w, h, ox, oy, w, h);
  }

  beginClip(clipRect) {
    this.mCtx.save();
    this.mCtx.beginPath();
    this.mCtx.rect(clipRect.x, clipRect.y, clipRect.width, clipRect.height);
    this.mCtx.clip();
  }

  endClip() {
    this.mCtx.restore();
  }

  /**
   * @private
   * @return {void}
   */
  __createCanvas() {
    let cvs = /** @type {HTMLCanvasElement} */ (document.createElement('canvas'));
    cvs.style.position = 'absolute';
    cvs.id = 'canvas';
    cvs.width = this.mClientWidth;
    cvs.height = this.mClientHeight;
    this.mContainerElement.appendChild(cvs);

    this.mCtx = /** @type {CanvasRenderingContext2D} */ (cvs.getContext('2d'));
  }


  /**
   * @private
   * @param {Message} msg
   * @param {Rectangle} rect
   *
   * @returns {void}
   */
  __onResize(msg, rect) {
    super.__onResize(msg, rect);

    this.mCtx.canvas.width = this.mClientWidth;
    this.mCtx.canvas.height = this.mClientHeight;
  }

  /**
   * @ignore
   * @param {Matrix} m
   *
   * @return {void}
   */
  setTransform(m) {
    //TODO: does not work as expected
    // if (this.mTransform.exactEquals(m) === true)
    //   return;

    super.setTransform(m);

    const v = m.value;
    this.mCtx.setTransform(v[0], v[1], v[2], v[3], v[4], v[5]);
  }

  /**
   * @param {number} value
   *
   * @return {void}
   */
  set globalAlpha(value) {
    if (value == this.mGlobalAlpha)
      return;

    this.mGlobalAlpha = value;
    this.mCtx.globalAlpha = value;
  }

  /**
   * @inheritDoc
   * @override
   *
   * @param {string} blendMode
   *
   * @return {void}
   */
  set globalBlendMode(blendMode) {
    if (this.mGlobalBlendMode === blendMode)
      return;

    this.mGlobalBlendMode = blendMode;
    this.mCtx.globalCompositeOperation = blendMode;
  }

  /**
   * clear
   * @inheritDoc
   * @override
   *
   * @return {void}
   */
  clear() {
    // this.mTransform.identity();
    // this.setTransform(this.mIdentityMatrix);
    this.mCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.mCtx.clearRect(0, 0, this.mCtx.canvas.width, this.mCtx.canvas.height);
  }

  /**
   * @inheritDoc
   * @override
   *
   * @return {void}
   */
  beginFrame() {
    this.clear();
    this.mSkipChildren = false;

    this.mRenderers.splice(0, this.mRenderers.length);
    this.mEndPassStack.splice(0, this.mEndPassStack.length);
    this.mEndPassRenderer = null;
  }

  /**
   * @inheritDoc
   * @override
   *
   * @return {void}
   */
  endFrame() {
  }

  /**
   * @ignore
   * @param {HTMLElement} canvas
   *
   * @return {Texture|null}
   */
  getTextureFromCanvas(canvas) {
    return new Texture(canvas);
  }
}