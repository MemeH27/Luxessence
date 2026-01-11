// Silk Animated Background - Vanilla JavaScript implementation
// Adapted from React component to use Luxessence website colors

class SilkBackground {
  constructor(options = {}) {
    this.config = {
      speed: 5,
      scale: 1,
      color: '#711116', // Luxessence main color
      noiseIntensity: 1.5,
      rotation: 0,
      container: null,
      ...options
    };

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.material = null;
    this.mesh = null;
    this.animationId = null;

    this.vertexShader = `
      varying vec2 vUv;
      varying vec3 vPosition;

      void main() {
        vPosition = position;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    this.fragmentShader = `
      varying vec2 vUv;
      varying vec3 vPosition;

      uniform float uTime;
      uniform vec3 uColor;
      uniform float uSpeed;
      uniform float uScale;
      uniform float uRotation;
      uniform float uNoiseIntensity;

      const float e = 2.71828182845904523536;

      float noise(vec2 texCoord) {
        float G = e;
        vec2 r = (G * sin(G * texCoord));
        return fract(r.x * r.y * (1.0 + texCoord.x));
      }

      vec2 rotateUvs(vec2 uv, float angle) {
        float c = cos(angle);
        float s = sin(angle);
        mat2 rot = mat2(c, -s, s, c);
        return rot * uv;
      }

      void main() {
        float rnd = noise(gl_FragCoord.xy);
        vec2 uv = rotateUvs(vUv * uScale, uRotation);
        vec2 tex = uv * uScale;
        float tOffset = uSpeed * uTime;

        tex.y += 0.03 * sin(8.0 * tex.x - tOffset);

        float pattern = 0.6 +
                        0.4 * sin(5.0 * (tex.x + tex.y +
                                         cos(3.0 * tex.x + 5.0 * tex.y) +
                                         0.02 * tOffset) +
                                 sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));

        vec4 col = vec4(uColor, 1.0) * vec4(pattern) - rnd / 15.0 * uNoiseIntensity;
        col.a = 1.0;
        gl_FragColor = col;
      }
    `;

    this.init();
  }

  hexToNormalizedRGB(hex) {
    hex = hex.replace('#', '');
    return [
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255
    ];
  }

  init() {
    // Check if Three.js is available
    if (typeof THREE === 'undefined') {
      console.error('Three.js is required for SilkBackground. Please include Three.js in your project.');
      return;
    }

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 1;

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Create geometry and material
    const geometry = new THREE.PlaneGeometry(2, 2);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Vector3(...this.hexToNormalizedRGB(this.config.color)) },
        uSpeed: { value: this.config.speed },
        uScale: { value: this.config.scale },
        uRotation: { value: this.config.rotation },
        uNoiseIntensity: { value: this.config.noiseIntensity }
      },
      vertexShader: this.vertexShader,
      fragmentShader: this.fragmentShader,
      transparent: true
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh);

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
  }

  onWindowResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.material.uniforms.uTime.value += 0.1;
    this.renderer.render(this.scene, this.camera);
  }

  mount(container) {
    if (!container) {
      console.error('Container element is required for SilkBackground');
      return;
    }

    this.config.container = container;
    container.appendChild(this.renderer.domElement);

    // Style the canvas
    this.renderer.domElement.style.position = 'fixed';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.zIndex = '-1';
    this.renderer.domElement.style.pointerEvents = 'none';

    this.animate();
  }

  unmount() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.renderer && this.renderer.domElement && this.config.container) {
      this.config.container.removeChild(this.renderer.domElement);
    }
  }

  updateOptions(newOptions) {
    this.config = { ...this.config, ...newOptions };

    if (this.material) {
      this.material.uniforms.uColor.value.set(...this.hexToNormalizedRGB(this.config.color));
      this.material.uniforms.uSpeed.value = this.config.speed;
      this.material.uniforms.uScale.value = this.config.scale;
      this.material.uniforms.uRotation.value = this.config.rotation;
      this.material.uniforms.uNoiseIntensity.value = this.config.noiseIntensity;
    }
  }
}

// Utility function to create and mount SilkBackground
function createSilkBackground(options = {}) {
  return new SilkBackground(options);
}

// Export for use in other scripts
window.SilkBackground = SilkBackground;
window.createSilkBackground = createSilkBackground;
