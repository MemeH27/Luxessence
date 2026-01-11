// GradualBlur component adapted for vanilla JavaScript
class GradualBlur {
  constructor(options = {}) {
    this.config = this.mergeConfigs(GradualBlur.DEFAULT_CONFIG, options);
    this.containerRef = null;
    this.isHovered = false;
    this.isVisible = !this.config.animated || this.config.animated !== 'scroll';
    this.blurDivs = [];
    this.observer = null;
    this.resizeTimeout = null;
  }

  static get DEFAULT_CONFIG() {
    return {
      position: 'bottom',
      strength: 2,
      height: '6rem',
      divCount: 5,
      exponential: false,
      zIndex: 1000,
      animated: false,
      duration: '0.3s',
      easing: 'ease-out',
      opacity: 1,
      curve: 'linear',
      responsive: false,
      target: 'parent',
      className: '',
      style: {}
    };
  }

  static get PRESETS() {
    return {
      top: { position: 'top', height: '6rem' },
      bottom: { position: 'bottom', height: '6rem' },
      left: { position: 'left', height: '6rem' },
      right: { position: 'right', height: '6rem' },
      subtle: { height: '4rem', strength: 1, opacity: 0.8, divCount: 3 },
      intense: { height: '10rem', strength: 4, divCount: 8, exponential: true },
      smooth: { height: '8rem', curve: 'bezier', divCount: 10 },
      sharp: { height: '5rem', curve: 'linear', divCount: 4 },
      header: { position: 'top', height: '8rem', curve: 'ease-out' },
      footer: { position: 'bottom', height: '8rem', curve: 'ease-out' },
      sidebar: { position: 'left', height: '6rem', strength: 2.5 },
      'page-header': { position: 'top', height: '10rem', target: 'page', strength: 3 },
      'page-footer': { position: 'bottom', height: '10rem', target: 'page', strength: 3 }
    };
  }

  static get CURVE_FUNCTIONS() {
    return {
      linear: p => p,
      bezier: p => p * p * (3 - 2 * p),
      'ease-in': p => p * p,
      'ease-out': p => 1 - Math.pow(1 - p, 2),
      'ease-in-out': p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)
    };
  }

  mergeConfigs(...configs) {
    return configs.reduce((acc, c) => ({ ...acc, ...c }), {});
  }

  getGradientDirection(position) {
    return ({
      top: 'to top',
      bottom: 'to bottom',
      left: 'to left',
      right: 'to right'
    })[position] || 'to bottom';
  }

  debounce(fn, wait) {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), wait);
    };
  }

  useResponsiveDimension(key) {
    if (!this.config.responsive) return this.config[key];
    // For simplicity, return the value; in full implementation, handle resize
    return this.config[key];
  }

  setupIntersectionObserver() {
    if (!this.config.animated || this.config.animated !== 'scroll' || !this.containerRef) return;

    this.observer = new IntersectionObserver(([entry]) => {
      this.isVisible = entry.isIntersecting;
      this.updateContainerStyle();
      if (this.isVisible && this.config.onAnimationComplete) {
        const ms = parseFloat(this.config.duration) * 1000;
        setTimeout(() => this.config.onAnimationComplete(), ms);
      }
    }, { threshold: 0.1 });

    this.observer.observe(this.containerRef);
  }

  generateBlurDivs() {
    this.blurDivs = [];
    const increment = 100 / this.config.divCount;
    const currentStrength = this.isHovered && this.config.hoverIntensity ? this.config.strength * this.config.hoverIntensity : this.config.strength;

    const curveFunc = GradualBlur.CURVE_FUNCTIONS[this.config.curve] || GradualBlur.CURVE_FUNCTIONS.linear;

    for (let i = 1; i <= this.config.divCount; i++) {
      let progress = i / this.config.divCount;
      progress = curveFunc(progress);

      let blurValue;
      if (this.config.exponential) {
        blurValue = Math.pow(2, progress * 4) * 0.0625 * currentStrength;
      } else {
        blurValue = 0.0625 * (progress * this.config.divCount + 1) * currentStrength;
      }

      const p1 = Math.round((increment * i - increment) * 10) / 10;
      const p2 = Math.round(increment * i * 10) / 10;
      const p3 = Math.round((increment * i + increment) * 10) / 10;
      const p4 = Math.round((increment * i + increment * 2) * 10) / 10;

      let gradient = `transparent ${p1}%, black ${p2}%`;
      if (p3 <= 100) gradient += `, black ${p3}%`;
      if (p4 <= 100) gradient += `, transparent ${p4}%`;

      const direction = this.getGradientDirection(this.config.position);

      const divStyle = {
        position: 'absolute',
        inset: '0',
        maskImage: `linear-gradient(${direction}, ${gradient})`,
        WebkitMaskImage: `linear-gradient(${direction}, ${gradient})`,
        backdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
        WebkitBackdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
        opacity: this.config.opacity,
        transition: this.config.animated && this.config.animated !== 'scroll' ? `backdrop-filter ${this.config.duration} ${this.config.easing}` : undefined
      };

      const div = document.createElement('div');
      Object.assign(div.style, divStyle);
      this.blurDivs.push(div);
    }
  }

  updateContainerStyle() {
    if (!this.containerRef) return;

    const isVertical = ['top', 'bottom'].includes(this.config.position);
    const isHorizontal = ['left', 'right'].includes(this.config.position);
    const isPageTarget = this.config.target === 'page';

    const baseStyle = {
      position: isPageTarget ? 'fixed' : 'absolute',
      pointerEvents: this.config.hoverIntensity ? 'auto' : 'none',
      opacity: this.isVisible ? 1 : 0,
      transition: this.config.animated ? `opacity ${this.config.duration} ${this.config.easing}` : undefined,
      zIndex: isPageTarget ? this.config.zIndex + 100 : this.config.zIndex,
      ...this.config.style
    };

    const responsiveHeight = this.useResponsiveDimension('height');
    const responsiveWidth = this.useResponsiveDimension('width');

    if (isVertical) {
      baseStyle.height = responsiveHeight;
      baseStyle.width = responsiveWidth || '100%';
      baseStyle[this.config.position] = 0;
      baseStyle.left = 0;
      baseStyle.right = 0;
    } else if (isHorizontal) {
      baseStyle.width = responsiveWidth || responsiveHeight;
      baseStyle.height = '100%';
      baseStyle[this.config.position] = 0;
      baseStyle.top = 0;
      baseStyle.bottom = 0;
    }

    Object.assign(this.containerRef.style, baseStyle);
  }

  render(targetElement) {
    // If preset, merge
    if (this.config.preset && GradualBlur.PRESETS[this.config.preset]) {
      this.config = this.mergeConfigs(GradualBlur.DEFAULT_CONFIG, GradualBlur.PRESETS[this.config.preset], this.config);
    }

    // Create container
    this.containerRef = document.createElement('div');
    this.containerRef.className = `gradual-blur ${this.config.target === 'page' ? 'gradual-blur-page' : 'gradual-blur-parent'} ${this.config.className}`;

    // Create inner
    const inner = document.createElement('div');
    inner.className = 'gradual-blur-inner';
    inner.style.position = 'relative';
    inner.style.width = '100%';
    inner.style.height = '100%';

    // Generate blur divs
    this.generateBlurDivs();
    this.blurDivs.forEach(div => inner.appendChild(div));

    this.containerRef.appendChild(inner);

    // Update styles
    this.updateContainerStyle();

    // Setup observer
    this.setupIntersectionObserver();

    // Hover events
    if (this.config.hoverIntensity) {
      this.containerRef.addEventListener('mouseenter', () => {
        this.isHovered = true;
        this.generateBlurDivs();
        this.updateBlurDivs();
      });
      this.containerRef.addEventListener('mouseleave', () => {
        this.isHovered = false;
        this.generateBlurDivs();
        this.updateBlurDivs();
      });
    }

    // Append to target
    if (this.config.target === 'page') {
      document.body.appendChild(this.containerRef);
    } else {
      targetElement.appendChild(this.containerRef);
    }

    return this.containerRef;
  }

  updateBlurDivs() {
    const inner = this.containerRef.querySelector('.gradual-blur-inner');
    inner.innerHTML = '';
    this.blurDivs.forEach(div => inner.appendChild(div));
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.containerRef && this.containerRef.parentNode) {
      this.containerRef.parentNode.removeChild(this.containerRef);
    }
  }
}

// Inject styles
function injectGradualBlurStyles() {
  if (typeof document === 'undefined') return;

  const styleId = 'gradual-blur-styles';
  if (document.getElementById(styleId)) return;

  const styleElement = document.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = `
    .gradual-blur { pointer-events: none; transition: opacity 0.3s ease-out; }
    .gradual-blur-parent { overflow: hidden; }
    .gradual-blur-inner { pointer-events: none; }
    .gradual-blur-inner > div { -webkit-backdrop-filter: inherit; backdrop-filter: inherit; }
    .gradual-blur { isolation: isolate; }
    @supports not (backdrop-filter: blur(1px)) {
      .gradual-blur-inner > div { background: rgba(0, 0, 0, 0.3); opacity: 0.5; }
    }
    .gradual-blur-fixed { position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 1000; }
  `;

  document.head.appendChild(styleElement);
}

if (typeof document !== 'undefined') {
  injectGradualBlurStyles();
}

// Export for use
window.GradualBlur = GradualBlur;
