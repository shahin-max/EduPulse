"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const PALETTE = {
  light: { point: 0x3f8c3d, line: 0x276b36, ring: 0x52a14b, lineOpacity: 0.16, pointOpacity: 0.55 },
  dark: { point: 0x91c77f, line: 0x8bc77a, ring: 0x6fae62, lineOpacity: 0.14, pointOpacity: 0.7 },
};

const COUNT = 120;
const LINK_DISTANCE = 2.1;
const BOUNDS = { x: 9, y: 5, z: 3 };

/**
 * Ambient "knowledge network" behind the hero: drifting nodes linked by faint lines,
 * plus two wireframe rings. Parallaxes with the pointer and swings on every slide change.
 */
export default function HeroScene3D({ slide }: { slide: number }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const slideRef = useRef(slide);
  useEffect(() => { slideRef.current = slide; }, [slide]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      return; // No WebGL: the CSS gradient background still looks finished.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.z = 9;
    const group = new THREE.Group();
    scene.add(group);

    // Nodes
    const positions = new Float32Array(COUNT * 3);
    const velocities = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() * 2 - 1) * BOUNDS.x;
      positions[i * 3 + 1] = (Math.random() * 2 - 1) * BOUNDS.y;
      positions[i * 3 + 2] = (Math.random() * 2 - 1) * BOUNDS.z;
      velocities[i * 3] = (Math.random() - 0.5) * 0.006;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.006;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.004;
    }
    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const pointMaterial = new THREE.PointsMaterial({ size: 0.075, transparent: true, depthWrite: false, sizeAttenuation: true });
    group.add(new THREE.Points(pointGeometry, pointMaterial));

    // Links (rebuilt each frame from nearby node pairs)
    const maxLinks = COUNT * 8;
    const linkPositions = new Float32Array(maxLinks * 6);
    const linkGeometry = new THREE.BufferGeometry();
    linkGeometry.setAttribute("position", new THREE.BufferAttribute(linkPositions, 3));
    const lineMaterial = new THREE.LineBasicMaterial({ transparent: true, depthWrite: false });
    group.add(new THREE.LineSegments(linkGeometry, lineMaterial));

    // Rings
    const ringMaterial = new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0.12 });
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.012, 6, 120), ringMaterial);
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.01, 6, 100), ringMaterial);
    ringA.position.set(3.6, 0.2, -1);
    ringB.position.set(3.6, 0.2, -1);
    ringA.rotation.x = 1.15;
    ringB.rotation.y = 1.1;
    scene.add(ringA, ringB);

    function applyTheme() {
      const p = document.documentElement.classList.contains("dark") ? PALETTE.dark : PALETTE.light;
      pointMaterial.color.setHex(p.point);
      pointMaterial.opacity = p.pointOpacity;
      lineMaterial.color.setHex(p.line);
      lineMaterial.opacity = p.lineOpacity;
      ringMaterial.color.setHex(p.ring);
    }
    applyTheme();
    const themeObserver = new MutationObserver(applyTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    function resize() {
      const { clientWidth: w, clientHeight: h } = mount!;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    const pointer = { x: 0, y: 0 };
    function onPointer(e: PointerEvent) {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    }
    window.addEventListener("pointermove", onPointer, { passive: true });

    let visible = true;
    const visibilityObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    visibilityObserver.observe(mount);

    let swing = 0;
    let lastSlide = slideRef.current;
    let frame = 0;
    const link2 = LINK_DISTANCE * LINK_DISTANCE;

    function step() {
      for (let i = 0; i < COUNT * 3; i += 3) {
        for (let a = 0; a < 3; a++) {
          positions[i + a] += velocities[i + a];
          const limit = a === 0 ? BOUNDS.x : a === 1 ? BOUNDS.y : BOUNDS.z;
          if (Math.abs(positions[i + a]) > limit) velocities[i + a] *= -1;
        }
      }
      pointGeometry.attributes.position.needsUpdate = true;

      let n = 0;
      for (let i = 0; i < COUNT && n < maxLinks; i++) {
        for (let j = i + 1; j < COUNT && n < maxLinks; j++) {
          const dx = positions[i * 3] - positions[j * 3];
          const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
          const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
          if (dx * dx + dy * dy + dz * dz < link2) {
            linkPositions.set([positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2], positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]], n * 6);
            n++;
          }
        }
      }
      linkGeometry.setDrawRange(0, n * 2);
      linkGeometry.attributes.position.needsUpdate = true;
    }

    function render(time: number) {
      if (slideRef.current !== lastSlide) { swing += 0.55; lastSlide = slideRef.current; }
      group.rotation.y += (swing + pointer.x * 0.18 - group.rotation.y) * 0.035;
      group.rotation.x += (pointer.y * 0.1 - group.rotation.x) * 0.035;
      ringA.rotation.z = time * 0.00012;
      ringB.rotation.z = -time * 0.00009;
      ringA.position.y = 0.2 + Math.sin(time * 0.0006) * 0.15;
      renderer.render(scene, camera);
    }

    function loop(time: number) {
      frame = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      step();
      render(time);
    }

    if (reduced) { step(); render(0); } else frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointer);
      themeObserver.disconnect();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      pointGeometry.dispose(); linkGeometry.dispose();
      ringA.geometry.dispose(); ringB.geometry.dispose();
      pointMaterial.dispose(); lineMaterial.dispose(); ringMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="hero-3d" aria-hidden="true" />;
}
