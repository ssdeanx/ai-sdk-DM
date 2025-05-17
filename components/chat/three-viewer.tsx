'use client';

import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// Import Three.js dynamically to avoid SSR issues
let THREE: any;
let OrbitControls: any;

interface ThreeViewerProps {
  modelUrl: string;
  format: string;
  backgroundColor?: string;
  autoRotate?: boolean;
  className?: string;
}

export function ThreeViewer({
  modelUrl,
  format,
  backgroundColor = '#f5f5f5',
  autoRotate = true,
  className,
}: ThreeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const animationMixerRef = useRef<any>(null);
  const clockRef = useRef<any>(null);
  const animationFrameRef = useRef<number>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Three.js
  useEffect(() => {
    const initThree = async () => {
      if (typeof window === 'undefined') return;

      try {
        // Dynamically import Three.js modules
        const threeModule = await import('three');
        THREE = threeModule;

        const { OrbitControls: OrbitControlsImport } = await import(
          'three/examples/jsm/controls/OrbitControls'
        );
        OrbitControls = OrbitControlsImport;

        // Import loaders based on format
        let loader;

        if (format === 'gltf' || format === 'glb') {
          const { GLTFLoader } = await import(
            'three/examples/jsm/loaders/GLTFLoader'
          );
          loader = new GLTFLoader();
        } else if (format === 'obj') {
          const { OBJLoader } = await import(
            'three/examples/jsm/loaders/OBJLoader'
          );
          loader = new OBJLoader();
        } else if (format === 'stl') {
          const { STLLoader } = await import(
            'three/examples/jsm/loaders/STLLoader'
          );
          loader = new STLLoader();
        } else {
          throw new Error(`Unsupported format: ${format}`);
        }

        // Initialize scene, camera, renderer
        setupScene();

        // Load model
        loadModel(loader);

        // Set up event listeners
        setupEventListeners();

        // Start animation loop
        animate();
      } catch (err) {
        console.error('Failed to initialize Three.js:', err);
        setError('Failed to initialize 3D viewer');
        setIsLoading(false);
      }
    };

    initThree();

    return () => {
      // Clean up
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (rendererRef.current) {
        rendererRef.current.dispose();
      }

      if (sceneRef.current) {
        disposeScene(sceneRef.current);
      }
    };
  }, [format, modelUrl]);

  // Set up scene, camera, renderer
  const setupScene = () => {
    if (!containerRef.current) return;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.0;
    controlsRef.current = controls;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Create clock for animations
    clockRef.current = new THREE.Clock();
  };

  // Load 3D model
  const loadModel = (loader: any) => {
    if (!sceneRef.current) return;

    setIsLoading(true);

    // Handle different formats
    if (format === 'gltf' || format === 'glb') {
      loader.load(
        modelUrl,
        (gltf: any) => {
          const model = gltf.scene;

          // Center model
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 2 / maxDim;

          model.position.sub(center);
          model.scale.multiplyScalar(scale);

          // Add model to scene
          sceneRef.current.add(model);
          modelRef.current = model;

          // Set up animations if available
          if (gltf.animations && gltf.animations.length > 0) {
            animationMixerRef.current = new THREE.AnimationMixer(model);
            const action = animationMixerRef.current.clipAction(
              gltf.animations[0]
            );
            action.play();
          }

          setIsLoading(false);
        },
        (progress: any) => {
          // Handle progress
        },
        (error: any) => {
          console.error('Error loading GLTF/GLB model:', error);
          setError('Failed to load 3D model');
          setIsLoading(false);
        }
      );
    } else if (format === 'obj') {
      loader.load(
        modelUrl,
        (obj: any) => {
          // Center model
          const box = new THREE.Box3().setFromObject(obj);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 2 / maxDim;

          obj.position.sub(center);
          obj.scale.multiplyScalar(scale);

          // Add model to scene
          sceneRef.current.add(obj);
          modelRef.current = obj;

          setIsLoading(false);
        },
        (progress: any) => {
          // Handle progress
        },
        (error: any) => {
          console.error('Error loading OBJ model:', error);
          setError('Failed to load 3D model');
          setIsLoading(false);
        }
      );
    } else if (format === 'stl') {
      loader.load(
        modelUrl,
        (geometry: any) => {
          const material = new THREE.MeshStandardMaterial({
            color: 0x7c7c7c,
            metalness: 0.2,
            roughness: 0.8,
          });

          const mesh = new THREE.Mesh(geometry, material);

          // Center model
          geometry.computeBoundingBox();
          const box = geometry.boundingBox;
          const center = new THREE.Vector3();
          box.getCenter(center);
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 2 / maxDim;

          mesh.position.sub(center);
          mesh.scale.multiplyScalar(scale);

          // Add model to scene
          sceneRef.current.add(mesh);
          modelRef.current = mesh;

          setIsLoading(false);
        },
        (progress: any) => {
          // Handle progress
        },
        (error: any) => {
          console.error('Error loading STL model:', error);
          setError('Failed to load 3D model');
          setIsLoading(false);
        }
      );
    }
  };

  // Set up event listeners
  const setupEventListeners = () => {
    if (!containerRef.current) return;

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current)
        return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();

      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Handle reset view
    const handleResetView = () => {
      if (!cameraRef.current || !controlsRef.current) return;

      cameraRef.current.position.set(0, 0, 5);
      cameraRef.current.lookAt(0, 0, 0);
      controlsRef.current.reset();
    };

    containerRef.current.addEventListener('reset-view', handleResetView);

    // Handle zoom
    const handleZoom = (event: any) => {
      if (!cameraRef.current) return;

      const zoom = event.detail.zoom;
      cameraRef.current.zoom = zoom;
      cameraRef.current.updateProjectionMatrix();
    };

    containerRef.current.addEventListener('set-zoom', handleZoom);

    // Clean up event listeners
    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        containerRef.current.removeEventListener('reset-view', handleResetView);
        containerRef.current.removeEventListener('set-zoom', handleZoom);
      }
    };
  };

  // Animation loop
  const animate = () => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    animationFrameRef.current = requestAnimationFrame(animate);

    // Update controls
    if (controlsRef.current) {
      controlsRef.current.update();
    }

    // Update animations
    if (animationMixerRef.current && clockRef.current) {
      const delta = clockRef.current.getDelta();
      animationMixerRef.current.update(delta);
    }

    // Render scene
    rendererRef.current.render(sceneRef.current, cameraRef.current);
  };

  // Dispose of Three.js objects
  const disposeScene = (scene: any) => {
    scene.traverse((object: any) => {
      if (object.geometry) {
        object.geometry.dispose();
      }

      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((material: any) => disposeMaterial(material));
        } else {
          disposeMaterial(object.material);
        }
      }
    });
  };

  // Dispose of material and its textures
  const disposeMaterial = (material: any) => {
    if (material.map) material.map.dispose();
    if (material.lightMap) material.lightMap.dispose();
    if (material.bumpMap) material.bumpMap.dispose();
    if (material.normalMap) material.normalMap.dispose();
    if (material.specularMap) material.specularMap.dispose();
    if (material.envMap) material.envMap.dispose();

    material.dispose();
  };

  return (
    <div ref={containerRef} className={cn('w-full h-full relative', className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
          <div className="flex flex-col items-center">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
            <span className="text-sm text-muted-foreground">
              Loading 3D model...
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-md max-w-xs text-center">
            <p className="font-medium mb-1">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
