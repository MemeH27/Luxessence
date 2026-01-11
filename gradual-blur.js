// GradualBlur - Vanilla JavaScript implementation
// Adapted from React component by Ansh Dhanani (github.com/ansh-dhanani)

class GradualBlur {
  constructor(options = {}) {
    this.config = {
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
      style: {},
      ...options
    };

    this.container = null;
    this.isVisible = true;
    this.isHovered = false;
    this.blurDivs = [];

    this.curveFunctions = {
      linear: p => p,
      bezier: p => p * p * (3 - 2 * p),
      'ease-in': p => p * p,
      'ease-out': p => 1 - Math.pow(1 - p, 2),
      'ease-in-out': p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)
    };

    this.init();
  }

  init() {
    this.createContainer();
    this.createBlurDivs();
    this.applyStyles();
    this.setupEventListeners();
  }

  createContainer() {
    this.container = document.createElement('div');
    this.container.className = `gradual-blur gradual-blur-${this.config.target} ${this.config.className}`;

    const isVertical = ['top', 'bottom'].includes(this.config.position);
    const isHorizontal = ['left', 'right'].includes(this.config.position);
    const isPageTarget = this.config.target === 'page';

    const baseStyle = {
      position: isPageTarget ? 'fixed' : 'absolute',
      pointerEvents: this.config.hoverIntensity ? 'auto' : 'none',
      opacity: this.isVisible ? 1 : 0,
      transition: this.config.animated ? `opacity ${this.config.duration} ${this.config.easing}` : undefined,
      zIndex: isPageTarget ? this.config.zIndex + 100 : this.config.zIndex
    };

    if (isVertical) {
      baseStyle.height = this.config.height;
      baseStyle.width = this.config.width || '100%';
      baseStyle[this.config.position] = 0;
      baseStyle.left = 0;
      baseStyle.right = 0;
    } else if (isHorizontal) {
      baseStyle.width = this.config.width || this.config.height;
      baseStyle.height = '100%';
      baseStyle[this.config.position] = 0;
      baseStyle.top = 0;
      baseStyle.bottom = 0;
    }

    Object.assign(this.container.style, baseStyle, this.config.style);

    const innerDiv = document.createElement('div');
    innerDiv.className = 'gradual-blur-inner';
    innerDiv.style.cssText = 'position: relative; width: 100%; height: 100%;';
    this.container.appendChild(innerDiv);
  }

  createBlurDivs() {
    const innerDiv = this.container.querySelector('.gradual-blur-inner');
    innerDiv.innerHTML = '';

    const increment = 100 / this.config.divCount;
    const currentStrength = this.isHovered && this.config.hoverIntensity
      ? this.config.strength * this.config.hoverIntensity
      : this.config.strength;

    const curveFunc = this.curveFunctions[this.config.curve] || this.curveFunctions.linear;

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

      const direction = this.getGradientDirection();

      const div = document.createElement('div');
      div.style.cssText = `
        position: absolute;
        inset: 0;
        mask-image: linear-gradient(${direction}, ${gradient});
        -webkit-mask-image: linear-gradient(${direction}, ${gradient});
        backdrop-filter: blur(${blurValue.toFixed(3)}rem);
        -webkit-backdrop-filter: blur(${blurValue.toFixed(3)}rem);
        opacity: ${this.config.opacity};
        transition: ${this.config.animated && this.config.animated !== 'scroll'
          ? `backdrop-filter ${this.config.duration} ${this.config.easing}`
          : 'none'};
      `;

      innerDiv.appendChild(div);
      this.blurDivs.push(div);
    }
  }

  getGradientDirection() {
    const directions = {
      top: 'to top',
      bottom: 'to bottom',
      left: 'to left',
      right: 'to right'
    };
    return directions[this.config.position] || 'to bottom';
  }

  applyStyles() {
    // Inject CSS if not already present
    if (!document.getElementById('gradual-blur-styles')) {
      const style = document.createElement('style');
      style.id = 'gradual-blur-styles';
      style.textContent = `
        .gradual-blur { pointer-events: none; transition: opacity 0.3s ease-out; }
        .gradual-blur-parent { overflow: hidden; }
        .gradual-blur-inner { pointer-events: none; }
      `;
      document.head.appendChild(style);
    }
  }

  setupEventListeners() {
    if (this.config.hoverIntensity) {
      this.container.addEventListener('mouseenter', () => {
        this.isHovered = true;
        this.updateBlurDivs();
      });
      this.container.addEventListener('mouseleave', () => {
        this.isHovered = false;
        this.updateBlurDivs();
      });
    }
  }

  updateBlurDivs() {
    const innerDiv = this.container.querySelector('.gradual-blur-inner');
    innerDiv.innerHTML = '';
    this.blurDivs = [];
    this.createBlurDivs();
  }

  mount(targetElement) {
    if (this.config.target === 'page') {
      document.body.appendChild(this.container);
      // For page-level blur, ensure it's visible
      this.container.style.position = 'fixed';
      this.container.style.bottom = '0';
      this.container.style.left = '0';
      this.container.style.right = '0';
      this.container.style.width = '100%';
      this.container.style.height = this.config.height;
      this.container.style.pointerEvents = 'none';
      this.container.style.zIndex = this.config.zIndex;

      // Add scroll detection for page-level blur
      this.setupScrollDetection();
    } else {
      targetElement.style.position = 'relative';
      targetElement.appendChild(this.container);
    }
  }

  setupScrollDetection() {
    let scrollTimeout;

    const handleScroll = () => {
      clearTimeout(scrollTimeout);

      // Show blur when scrolling down and near bottom, but hide at very bottom
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Calculate how close we are to the bottom
      const distanceFromBottom = documentHeight - scrollTop - windowHeight;
      const hasScrolled = scrollTop > 100;

      // Show blur when scrolled down and within 200px of bottom, but hide when within 10px of bottom
      if (hasScrolled && distanceFromBottom <= 200 && distanceFromBottom > 10) {
        this.container.style.opacity = '1';
      } else {
        this.container.style.opacity = '0';
      }

      // Hide blur after scrolling stops (unless at the very bottom)
      scrollTimeout = setTimeout(() => {
        if (distanceFromBottom > 10) {
          this.container.style.opacity = '0';
        }
      }, 150);
    };

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
  }

  unmount() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  updateOptions(newOptions) {
    this.config = { ...this.config, ...newOptions };
    this.updateBlurDivs();
    this.applyStyles();
  }
}

// Utility function to create and mount GradualBlur
function createGradualBlur(options = {}) {
  return new GradualBlur(options);
}

// Export for use in other scripts
window.GradualBlur = GradualBlur;
window.createGradualBlur = createGradualBlur;
