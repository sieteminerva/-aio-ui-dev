export interface Particle {
    id: string;
    element: HTMLElement;
    offsetX: number;
    offsetY: number;
    vx: number;
    vy: number;
    restingTilt: number;
    currentTilt: number;
    width: number;
    height: number;
    windSpeedMod: number;
    windMagMod: number;
    seedX: number;
    seedY: number;
    _mouseDownHandler?: (e: MouseEvent) => void;
}
export interface GravitySimulationConfig {
    gravityForce?: number;
    springStiffness?: number;
    airResistance?: number;
    repulsionForce?: number;
    repulsionRadius?: number;
    mouseForce?: number;
    mousePadding?: number;
    windSpeed?: number;
    windMagnitude?: number;
    tiltSensitivity?: number;
    tiltMax?: number;
    tiltReturnSpeed?: number;
    tiltRandomRange?: number;
    boundaryPadding?: number;
    randomize?: boolean;
    selectors: {
        "@container": {
            className: string;
        };
        "@item": {
            className: string;
        };
        "@item:active": {
            className: string;
        };
        "@excludes": [string];
    };
}
export declare class GravitySimulation {
    container: HTMLElement | null;
    config: Required<GravitySimulationConfig>;
    isRunning: boolean;
    animationFrameId: number | null;
    particles: Particle[];
    mouse: {
        x: number;
        y: number;
    };
    draggedParticle: Particle | null;
    readyToDragParticle: null | Particle;
    dragOffset: {
        x: number;
        y: number;
    };
    shockFrames: number;
    _boundOnMouseMove: (e: MouseEvent) => void;
    _boundOnMouseLeave: (e: MouseEvent) => void;
    _boundOnMouseUp: (e: MouseEvent) => void;
    constructor(container: HTMLElement, customConfig?: Partial<GravitySimulationConfig>);
    protected init(): void;
    private _onMouseMove;
    private _onMouseLeave;
    private _onMouseUp;
    run(): void;
    stop(): void;
    destroy(): void;
    protected loop(): void;
}
export declare function runSimulation(): void;
//# sourceMappingURL=gravity-simulation.d.ts.map