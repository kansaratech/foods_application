"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useGoogleMap } from "@react-google-maps/api";

// Each overlay owns its outer DOM node; React owns only the portal contents.
// remove() is idempotent, including StrictMode replay and map teardown.
export function createPlaceOverlay(container: HTMLElement, position: { current: google.maps.LatLngLiteral }) {
  class PlaceOverlay extends google.maps.OverlayView {
    onAdd() {
      this.getPanes()?.overlayMouseTarget.appendChild(container);
      google.maps.OverlayView.preventMapHitsAndGesturesFrom(container);
    }
    draw() {
      const projection = this.getProjection();
      if (!projection) return;
      const pixel = projection.fromLatLngToDivPixel(new google.maps.LatLng(position.current));
      if (!pixel) return;
      container.style.left = `${pixel.x}px`;
      container.style.top = `${pixel.y}px`;
    }
    onRemove() { container.remove(); }
  }
  return new PlaceOverlay();
}

export default function PlaceOverlay({ position, zIndex, children }: { position: google.maps.LatLngLiteral; zIndex: number; children: ReactNode }) {
  const map = useGoogleMap();
  const positionRef = useRef(position);
  const overlayRef = useRef<google.maps.OverlayView | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!map) return;
    const node = document.createElement("div");
    node.style.position = "absolute";
    const overlay = createPlaceOverlay(node, positionRef);
    overlayRef.current = overlay;
    overlay.setMap(map);
    setContainer(node);
    return () => {
      overlayRef.current = null;
      overlay.setMap(null);
      node.remove();
    };
  }, [map]);

  useEffect(() => {
    positionRef.current = position;
    overlayRef.current?.draw();
  }, [position]);

  useEffect(() => { if (container) container.style.zIndex = String(zIndex); }, [container, zIndex]);
  return container ? createPortal(children, container) : null;
}
