import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GrantOpportunity } from '../data/grantData';

interface GaiaGlobeProps {
  opportunities: GrantOpportunity[];
  onOpenMapTab: () => void;
}

export const GaiaGlobe: React.FC<GaiaGlobeProps> = ({ opportunities, onOpenMapTab }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showBeacons, setShowBeacons] = useState(true);
  const autoRotateRef = useRef(true);
  const showBeaconsRef = useRef(true);
  const resetTriggerRef = useRef(false);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    showBeaconsRef.current = showBeacons;
  }, [showBeacons]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 360;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(0, 0.15, 2.85);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio warm key + cool hemisphere lighting
    const hemiLight = new THREE.HemisphereLight(0x5eead4, 0x0f172a, 1.2);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfef08a, 1.6);
    keyLight.position.set(3, 4, 3);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x818cf8, 1.1);
    rimLight.position.set(-3, -2, -2);
    scene.add(rimLight);

    // Composite 5-part Gaia Globe Group
    const gaiaRoot = new THREE.Group();
    scene.add(gaiaRoot);

    // Part 1: Inner Dark Abyssal Core Sphere
    const coreGeo = new THREE.SphereGeometry(0.96, 36, 36);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x041322,
      roughness: 0.75,
      metalness: 0.25,
      transparent: true,
      opacity: 0.92,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    gaiaRoot.add(coreMesh);

    // Part 2: Digitized Globe Sphere Wireframe Grid (Teal)
    const globeGeo = new THREE.SphereGeometry(1.0, 36, 36);
    const globeMat = new THREE.MeshBasicMaterial({
      color: 0x0d9488,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    });
    const gaiaGlobe = new THREE.Mesh(globeGeo, globeMat);
    gaiaRoot.add(gaiaGlobe);

    // Part 3: Point Cloud Particles for Digitized Earth Surface Nodes (100% Vibrant Yellow)
    const particlesGeo = new THREE.BufferGeometry();
    const particleCount = 1250;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Fibonacci sphere distribution + subtle jitter for authentic continental density feel
      const u = (i + 0.5) / particleCount;
      const theta = i * 2.399963229728653 + (Math.random() - 0.5) * 0.08;
      const phi = Math.acos(1 - 2 * u);
      const radius = 1.022;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }

    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particlesMat = new THREE.PointsMaterial({
      color: 0xffea00,
      size: 0.025,
      transparent: true,
      opacity: 0.92,
    });
    const gaiaPoints = new THREE.Points(particlesGeo, particlesMat);
    gaiaRoot.add(gaiaPoints);

    // Part 4: InstancedMesh Verified Grant Hub Beacons
    const beaconGeo = new THREE.CylinderGeometry(0.012, 0.004, 0.11, 8);
    beaconGeo.translate(0, 0.055, 0);
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0x2dd4bf,
      emissive: 0x14b8a6,
      emissiveIntensity: 0.7,
      roughness: 0.3,
      metalness: 0.6,
    });

    const hubCoords = [
      { lat: 6.5244, lng: 3.3792 }, // Lagos
      { lat: 4.711, lng: -74.0721 }, // Bogota
      { lat: -1.2921, lng: 36.8219 }, // Nairobi
      { lat: 50.8503, lng: 4.3517 }, // Brussels
      { lat: 14.7167, lng: -17.4677 }, // Dakar
      { lat: 31.9539, lng: 35.9106 }, // Amman
      { lat: 5.36, lng: -4.0083 }, // Abidjan
      { lat: 23.8103, lng: 90.4125 }, // Dhaka
      { lat: 30.0444, lng: 31.2357 }, // Cairo
      { lat: -23.5505, lng: -46.6333 }, // Sao Paulo
      { lat: 38.9072, lng: -77.0369 }, // Washington DC
      { lat: -33.9249, lng: 18.4241 }, // Cape Town
    ];

    const beaconMesh = new THREE.InstancedMesh(beaconGeo, beaconMat, hubCoords.length);
    const dummy = new THREE.Object3D();
    const upVec = new THREE.Vector3(0, 1, 0);
    const dirVec = new THREE.Vector3();

    hubCoords.forEach((coord, idx) => {
      const phi = (90 - coord.lat) * (Math.PI / 180);
      const theta = (coord.lng + 180) * (Math.PI / 180);
      const r = 1.01;
      const x = -(r * Math.sin(phi) * Math.cos(theta));
      const z = r * Math.sin(phi) * Math.sin(theta);
      const y = r * Math.cos(phi);

      dummy.position.set(x, y, z);
      dirVec.set(x, y, z).normalize();
      dummy.quaternion.setFromUnitVectors(upVec, dirVec);
      dummy.updateMatrix();
      beaconMesh.setMatrixAt(idx, dummy.matrix);
    });
    beaconMesh.instanceMatrix.needsUpdate = true;
    beaconMesh.computeBoundingSphere();
    gaiaRoot.add(beaconMesh);

    // Part 5: Outer Digital Radar Rings (Indigo & Teal)
    const ringGeo1 = new THREE.RingGeometry(1.2, 1.225, 64);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    });
    const ringMesh1 = new THREE.Mesh(ringGeo1, ringMat1);
    ringMesh1.rotation.x = Math.PI / 2.3;
    scene.add(ringMesh1);

    const ringGeo2 = new THREE.RingGeometry(1.31, 1.325, 64);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x14b8a6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.28,
    });
    const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
    ringMesh2.rotation.x = -Math.PI / 3.1;
    ringMesh2.rotation.y = Math.PI / 6;
    scene.add(ringMesh2);

    // Drag interaction with smooth exponential damping
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let targetRotY = 0.4;
    let targetRotX = 0.15;

    const domEl = renderer.domElement;
    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      targetRotY += dx * 0.0065;
      targetRotX = THREE.MathUtils.clamp(targetRotX + dy * 0.0065, -1.1, 1.1);
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 340;
      const newH = container.clientHeight || 340;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let frameId = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || !gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const delta = Math.min(clock.getDelta(), 0.1);

      if (resetTriggerRef.current) {
        targetRotX = 0.12;
        targetRotY = 0.4;
        resetTriggerRef.current = false;
      }

      if (!isDragging && autoRotateRef.current) {
        targetRotY += delta * 0.22;
      }

      gaiaRoot.rotation.y = THREE.MathUtils.damp(gaiaRoot.rotation.y, targetRotY, 7, delta);
      gaiaRoot.rotation.x = THREE.MathUtils.damp(gaiaRoot.rotation.x, targetRotX, 7, delta);

      beaconMesh.visible = showBeaconsRef.current;
      ringMesh1.rotation.z += delta * 0.12;
      ringMesh2.rotation.z -= delta * 0.08;

      renderer.render(scene, camera);
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    tick();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
      coreGeo.dispose();
      coreMat.dispose();
      globeGeo.dispose();
      globeMat.dispose();
      particlesGeo.dispose();
      particlesMat.dispose();
      beaconGeo.dispose();
      beaconMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      renderer.dispose();
    };
  }, [opportunities.length]);

  return (
    <div className="w-full flex flex-col items-center justify-center relative min-h-[340px] sm:min-h-[390px]">
      <div
        ref={mountRef}
        className="w-full h-[330px] sm:h-[360px] rounded-2xl relative cursor-grab active:cursor-grabbing"
        title="Drag to rotate Digitized Gaia Sphere"
      />

      {/* Unified Bottom Control Dock */}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300">
        <span className="text-slate-400">Gaia Sphere:</span>
        <button
          type="button"
          onClick={() => setAutoRotate((prev) => !prev)}
          className={`px-2 py-0.5 rounded transition whitespace-nowrap shrink-0 ${
            autoRotate
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          {autoRotate ? 'Orbit: Auto' : 'Orbit: Paused'}
        </button>
        <button
          type="button"
          onClick={() => setShowBeacons((prev) => !prev)}
          className={`px-2 py-0.5 rounded transition whitespace-nowrap shrink-0 ${
            showBeacons
              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          {showBeacons ? 'Hub Pins: On' : 'Hub Pins: Off'}
        </button>
        <button
          type="button"
          onClick={() => {
            resetTriggerRef.current = true;
          }}
          className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition whitespace-nowrap shrink-0"
        >
          Reset Axis
        </button>
        <button
          type="button"
          onClick={onOpenMapTab}
          className="px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition whitespace-nowrap shrink-0"
        >
          2D Atlas
        </button>
      </div>
    </div>
  );
};
