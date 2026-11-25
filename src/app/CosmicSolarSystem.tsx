"use client";

import { useState } from "react";

const PLANETS = [
  { id: "mercury", name: "Mercury", size: 7, orbit: 70, duration: 7, description: "A small rocky planet with the shortest orbit in the solar system." },
  { id: "venus", name: "Venus", size: 11, orbit: 96, duration: 11, description: "A golden-clouded planet shown here with a warm atmosphere." },
  { id: "earth", name: "Earth", size: 13, orbit: 122, duration: 15, description: "Our ocean-bearing planet, with the Moon in its own local orbit." },
  { id: "mars", name: "Mars", size: 9, orbit: 148, duration: 20, description: "The reddish rocky planet of the inner solar system." },
  { id: "jupiter", name: "Jupiter", size: 25, orbit: 178, duration: 29, description: "A large gas giant with broad atmospheric bands." },
  { id: "saturn", name: "Saturn", size: 21, orbit: 212, duration: 38, description: "A pale gas giant distinguished by its elegant ring system." },
  { id: "uranus", name: "Uranus", size: 16, orbit: 244, duration: 50, description: "A pale blue ice giant with an extreme axial tilt." },
  { id: "neptune", name: "Neptune", size: 15, orbit: 276, duration: 62, description: "A deep-blue outer planet with a smooth, distant orbit." },
] as const;

export type CosmicPlanetId = typeof PLANETS[number]["id"];

export default function CosmicSolarSystem() {
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState<CosmicPlanetId | null>(null);
  const [resetKey, setResetKey] = useState(0);

  function resetAnimation() {
    setPaused(false);
    setSelected(null);
    setResetKey((value) => value + 1);
  }

  const selectedPlanet = PLANETS.find((planet) => planet.id === selected);

  return (
    <div className="cosmic-system" data-paused={paused} key={resetKey}>
      <div className="cosmic-stars" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => <span key={index} style={{ "--star-index": index } as React.CSSProperties} />)}
      </div>

      <div className="cosmic-sun" aria-label="Sun">
        <span className="cosmic-sun-core" aria-hidden="true" />
        <span className="cosmic-sun-rays" aria-hidden="true" />
      </div>

      {PLANETS.map((planet) => (
        <div
          className={`cosmic-orbit${selected === planet.id ? " is-selected" : ""}`}
          style={{ "--orbit": `${planet.orbit}px`, "--duration": `${planet.duration}s` } as React.CSSProperties}
          key={planet.id}
        >
          <button
            type="button"
            className={`cosmic-planet cosmic-planet-${planet.id}`}
            style={{ "--planet-size": `${planet.size}px` } as React.CSSProperties}
            aria-label={`Select ${planet.name}`}
            aria-pressed={selected === planet.id}
            onClick={() => setSelected((current) => current === planet.id ? null : planet.id)}
          >
            {planet.id === "earth" && (
              <span className="cosmic-moon-system" aria-label="Moon orbiting Earth">
                <span className="cosmic-moon-orbit" aria-hidden="true" />
                <span className="cosmic-moon" aria-hidden="true" />
              </span>
            )}
            {planet.id === "saturn" && <span className="cosmic-saturn-ring" aria-hidden="true" />}
          </button>
        </div>
      ))}

      <div className="cosmic-controls" aria-label="Solar system animation controls">
        <button type="button" onClick={() => setPaused((current) => !current)} aria-pressed={paused}>
          {paused ? "Resume" : "Pause"}
        </button>
        <button type="button" onClick={resetAnimation}>Reset</button>
      </div>

      {selectedPlanet ? (
        <article className="cosmic-planet-card" aria-live="polite">
          <button type="button" aria-label={`Deselect ${selectedPlanet.name}`} onClick={() => setSelected(null)}>×</button>
          <b>{selectedPlanet.name}</b>
          <p>{selectedPlanet.description}</p>
        </article>
      ) : (
        <p className="cosmic-selection-hint">Select a planet</p>
      )}

      <div className="hero-art-caption"><span>CELESTIAL · MOTION</span><span>360°</span></div>
    </div>
  );
}
