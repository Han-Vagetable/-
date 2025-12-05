
export enum VectorMode {
  None = 'none',
  Cartesian = 'cartesian', // x, y
  Incline = 'incline'      // parallel, perpendicular
}

export enum StartPosition {
  Bottom = 'bottom',
  Top = 'top'
}

// Global Environment Settings
export interface EnvironmentConfig {
  angleIncline: number; // Angle of the incline (degrees)
  gravity: number;      // Gravity (m/s^2)
  scaleVelocity: number; // Visual scale for velocity vectors
  scaleDisplacement: number; // Visual scale for displacement vectors
  timeScale: number;    // Simulation speed multiplier (0.1 - 10)
  showPrediction: boolean; // Toggle trajectory prediction
}

// Per-Projectile Configuration
export interface ProjectileConfig {
  id: string;
  name: string;
  color: string;
  v0: number;           // Initial velocity magnitude (m/s)
  angleLaunch: number;  // Launch angle relative to the incline (degrees)
  startPos: StartPosition;
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface SimulationState {
  t: number;           // Current time for this projectile
  isPlaying: boolean;  // Is this specific projectile moving?
  isFinished: boolean; // Has it stopped (collision or out of bounds)?
  position: Vector2;   // Current position (global coords)
  startPosition: Vector2; // Store initial position for displacement calc
  velocity: Vector2;   // Current velocity (global coords)
  path: Vector2[];     // History of positions for trajectory
}

// Combined Object Entity
export interface ProjectileEntity {
  id: string;
  config: ProjectileConfig;
  state: SimulationState;
}
