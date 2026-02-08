// debrisEngine.js

export class DebrisEngine {
  constructor() {
    this.debris = [];
    this.explosions = [];
    this.maxDebris = 1400;
    this.active = false;
  }

  init(active) {
    this.active = active;
    if (!active) {
      this.debris = [];
      this.explosions = [];
      return;
    }

    // Initial burst
    this.debris = Array.from({ length: 900 }).map((_, i) =>
      this.createDebrisParticle(i)
    );
  }

  createDebrisParticle(id, parentDebris = null) {
    const isFragment = !!parentDebris;

    // Orbit parameters
    const velocityBase = isFragment ? 0.2 : 0.08;
    const velocityVar = isFragment ? 0.4 : 0.22;

    return {
      id: id || Math.random(),
      // Position
      lon: isFragment ? parentDebris.lon : Math.random() * 360,
      lat: isFragment ? parentDebris.lat : (Math.random() - 0.5) * 160,
      alt: 350 + Math.random() * 2000,

      // Physics
      velocity: velocityBase + Math.random() * velocityVar,
      inc: (Math.random() - 0.5) * 160,
      phase: Math.random() * Math.PI * 2,

      // Visuals
      spin: Math.random() * 360,
      spinSpeed: (Math.random() - 0.5) * 10,
      size: isFragment
        ? 0.2
        : Math.random() > 0.97
        ? 1
        : Math.random() > 0.88
        ? 0.6
        : 0.35,
      heat: Math.random() > 0.985,
      type: isFragment ? "fragment" : "debris",
    };
  }

  step(dt, targets = []) {
    if (!this.active) return { collisionOccurred: false };

    let collisionOccurred = false;
    let newExplosion = null;

    // 1. Update Debris Positions
    const count = this.debris.length;
    for (let i = 0; i < count; i++) {
      const d = this.debris[i];

      d.lon += d.velocity;
      d.lat = Math.sin((d.lon * Math.PI) / 180 + d.phase) * d.inc;
      d.spin += d.spinSpeed;

      // Wrap
      if (d.lon > 180) d.lon -= 360;
      if (d.lon < -180) d.lon += 360;
    }

    // 2. Collision Detection
    if (targets.length > 0) {
      // Just check the first valid satellite for performance in this demo
      const t = targets[0];
      // Normalize lat/lon/lng
      const tLon = t.lon ?? t.lng ?? 0;
      const tLat = t.lat ?? 0;

      // Check every 3rd debris
      for (let i = 0; i < count; i += 3) {
        const d = this.debris[i];
        const dx = d.lon - tLon;
        const dy = d.lat - tLat;

        // Simple squared distance check
        if (dx * dx + dy * dy < 5) {
          collisionOccurred = true;
          d.velocity *= -1;
          d.heat = true;

          newExplosion = {
            id: Math.random(),
            lon: tLon,
            lat: tLat,
            age: 0,
            maxAge: 45,
            type: Math.random() > 0.6 ? "kinetic" : "thermal",
          };
          this.explosions.push(newExplosion);

          // Kessler Cascade
          if (this.debris.length < this.maxDebris) {
            for (let k = 0; k < 3; k++) {
              this.debris.push(this.createDebrisParticle(null, d));
            }
          }
          break; // Limit to one collision per frame to prevent freezing
        }
      }
    }

    // 3. Update Explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const ex = this.explosions[i];
      ex.age += 1;
      if (ex.age > ex.maxAge) {
        this.explosions.splice(i, 1);
      }
    }

    return { collisionOccurred, newExplosion };
  }

  getDebris() {
    return this.debris;
  }

  getExplosions() {
    return this.explosions;
  }
}