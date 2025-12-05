
import { Vector2, EnvironmentConfig, ProjectileConfig, StartPosition, SimulationState } from '../types';

export const INCLINE_LENGTH = 100; // Meters (visual scale)

export const toRad = (deg: number) => (deg * Math.PI) / 180;
export const toDeg = (rad: number) => (rad * 180) / Math.PI;

export const getInitialState = (pConfig: ProjectileConfig, envConfig: EnvironmentConfig): { pos: Vector2, vel: Vector2 } => {
  const theta = toRad(envConfig.angleIncline);
  const phi = toRad(pConfig.angleLaunch); // Angle relative to incline
  
  // Global launch angle
  const totalAngle = theta + phi;

  // Start Position
  let startX = 0;
  let startY = 0;

  if (pConfig.startPos === StartPosition.Top) {
    startX = INCLINE_LENGTH * Math.cos(theta);
    startY = INCLINE_LENGTH * Math.sin(theta);
  }

  return {
    pos: { x: startX, y: startY },
    vel: {
      x: pConfig.v0 * Math.cos(totalAngle),
      y: pConfig.v0 * Math.sin(totalAngle)
    }
  };
};

export const calculatePhysics = (t: number, env: EnvironmentConfig, initialPos: Vector2, initialVel: Vector2) => {
  const x = initialPos.x + initialVel.x * t;
  const y = initialPos.y + initialVel.y * t - 0.5 * env.gravity * t * t;

  const vx = initialVel.x;
  const vy = initialVel.y - env.gravity * t;

  return {
    position: { x, y },
    velocity: { x: vx, y: vy }
  };
};

// Check collision with the incline plane
export const checkCollision = (pos: Vector2, inclineAngleDeg: number) => {
  const theta = toRad(inclineAngleDeg);
  
  // Perpendicular distance to slope line
  const perpDist = -pos.x * Math.sin(theta) + pos.y * Math.cos(theta);
  
  // Parallel distance along slope
  const paraDist = pos.x * Math.cos(theta) + pos.y * Math.sin(theta);

  // Collision tolerance
  const isBelow = perpDist <= 0.05; 
  const isOnRamp = paraDist >= -5 && paraDist <= INCLINE_LENGTH + 20;

  return isBelow && isOnRamp;
};

// Generate prediction points
export const predictTrajectory = (pConfig: ProjectileConfig, env: EnvironmentConfig): Vector2[] => {
  const { pos, vel } = getInitialState(pConfig, env);
  const points: Vector2[] = [];
  const dt = 0.1; 
  const maxTime = 10; // lookahead seconds

  for (let t = 0; t <= maxTime; t += dt) {
    const res = calculatePhysics(t, env, pos, vel);
    points.push(res.position);
    
    // Simple stop condition for prediction
    if (checkCollision(res.position, env.angleIncline) && t > 0.1) break;
    if (res.position.y < -10) break;
  }
  return points;
};

export const projectToIncline = (vec: Vector2, inclineAngleDeg: number) => {
  const theta = toRad(inclineAngleDeg);
  
  // Unit vectors for incline frame
  const uPara = { x: Math.cos(theta), y: Math.sin(theta) };
  const uPerp = { x: -Math.sin(theta), y: Math.cos(theta) };

  const vParaMag = vec.x * uPara.x + vec.y * uPara.y;
  const vPerpMag = vec.x * uPerp.x + vec.y * uPerp.y;

  return {
    parallel: { x: uPara.x * vParaMag, y: uPara.y * vParaMag, mag: vParaMag },
    perpendicular: { x: uPerp.x * vPerpMag, y: uPerp.y * vPerpMag, mag: vPerpMag }
  };
};
