import { EntityComponentTypes, InputMode, system, world } from "@minecraft/server";
function getMovementInput(rider) {
    const inputMode = rider.inputInfo.lastInputModeUsed;
    if (inputMode === InputMode.KeyboardAndMouse) {
        const { x: valueX, y: valueY } = rider.inputInfo.getMovementVector();
        return {
            throttle: Math.sign(valueY),
            steering: Math.sign(valueX)
        };
    }
}
export class MobsKart {
    entity;
    acceleration;
    turnSpeed;
    maxSpeed;
    get currentSpeed() {
        const velocity = this.entity.getVelocity();
        return {
            ...velocity,
            hypotSpeed: Math.hypot(velocity.x, velocity.z)
        };
    }
    get isOnGround() {
        const hit = this.entity.dimension.getBlockFromRay(this.entity.location, { x: 0, y: -1, z: 0 }, { maxDistance: 1 });
        return hit !== undefined;
    }
    get id() {
        return this.entity.id;
    }
    get isValid() {
        return this.entity.isValid;
    }
    constructor(arg0) {
        this.entity = arg0.entity;
        this.maxSpeed = arg0.maxSpeed;
        this.turnSpeed = arg0.turnSpeed;
        this.acceleration = arg0.acceleration;
    }
    // colision(currentSpeed: number) {
    //   this.entity.dimension.getBlockFromRay()
    // }
    // physic(throttle: number, steering: number, currentSpeed: CurrentSpeedType) {
    //   console.log(Math.sin(currentSpeed.x));
    //   // console.log(((currentSpeed.x / currentSpeed.hypotSpeed) ?? 0));
    //   if (currentSpeed.hypotSpeed > 0.5 && Math.abs(throttle) < 0.01) {
    //     // console.log(currentSpeed.x, currentSpeed.z);
    //     // console.log((Math.abs(currentSpeed.x) - 0.05) * Math.sign(currentSpeed.x));
    //     // return
    //     // const speed = currentSpeed.hypotSpeed
    //     // this.entity.applyImpulse({
    //     //   x: (speed > 0 ? currentSpeed.x / speed : 0) * 0.6,
    //     //   y: 0,
    //     //   z: (speed > 0 ? currentSpeed.z / speed : 0) * 0.6
    //     // })
    //   }
    // }
    accelerate(throttle, view, currentSpeed) {
        const modifiedMaxSpeed = throttle < 0 ? 0.5 : this.maxSpeed;
        if (currentSpeed.hypotSpeed > modifiedMaxSpeed || Math.abs(throttle) < 0.01)
            return;
        const impulse = (0.01 + currentSpeed.hypotSpeed) * this.acceleration * throttle;
        this.entity.applyImpulse({
            x: view.x * impulse, y: 0, z: view.z * impulse
        });
    }
    turn(steering, throttle, currentSpeed) {
        if (Math.abs(steering) < 0.01)
            return;
        const rot = this.entity.getRotation();
        const turnFactor = Math.min(1, currentSpeed.hypotSpeed / this.maxSpeed);
        this.entity.setRotation({
            x: rot.x,
            y: rot.y - steering * this.turnSpeed * turnFactor * Math.sign(throttle)
        });
    }
    getRider() {
        const rideable = this.entity.getComponent(EntityComponentTypes.Rideable);
        const rider = rideable.getRiders()[0];
        return rider;
    }
    update() {
        if (!this.entity.isValid)
            return;
        // if (!this.isOnGround) { }
        const rider = this.getRider();
        if (!rider)
            return;
        const view = this.entity.getViewDirection();
        const currentSpeed = this.currentSpeed;
        const { steering, throttle } = getMovementInput(rider);
        this.accelerate(throttle, view, currentSpeed);
        this.turn(steering, throttle, currentSpeed);
    }
}
export class MobsKartManager {
    static karts = new Map();
    static register(definition) {
        const existing = this.karts.get(definition.entity.id);
        if (existing)
            return existing;
        const kart = new MobsKart(definition);
        this.karts.set(definition.entity.id, kart);
        return kart;
    }
    static getKart(entityId) {
        return this.karts.get(entityId);
    }
    static removeKart(entityId) {
        this.karts.delete(entityId);
    }
    static update() {
        for (const [id, kart] of this.karts) {
            if (!kart.isValid) {
                this.karts.delete(id);
                continue;
            }
            kart.update();
        }
    }
}
// import {
//   Entity,
//   Vector3,
//   system,
//   world
// } from "@minecraft/server";
const lastBounce = new Map();
function bounceKart(entity, elasticity = 0.6) {
    // return
    if (!entity.isValid)
        return;
    const velocity = entity.getVelocity();
    // Velocidade horizontal
    const speed = Math.hypot(velocity.x, velocity.z);
    if (speed < 0.05)
        return;
    // Evita múltiplos rebotes consecutivos
    const tick = system.currentTick;
    if (tick - (lastBounce.get(entity.id) ?? -100) < 4)
        return;
    // Direção do movimento
    const direction = {
        x: velocity.x / speed,
        y: 0,
        z: velocity.z / speed
    };
    // Detecta parede à frente
    const hit = entity.dimension.getBlockFromRay({
        x: entity.location.x,
        y: entity.location.y + 0.7,
        z: entity.location.z
    }, direction, {
        maxDistance: 1.6,
        includePassableBlocks: false,
        includeLiquidBlocks: false
    });
    if (!hit)
        return;
    // Normal da parede atingida
    const normals = {
        North: { x: 0, y: 0, z: -1 },
        South: { x: 0, y: 0, z: 1 },
        East: { x: 1, y: 0, z: 0 },
        West: { x: -1, y: 0, z: 0 }
    };
    const normal = normals[hit.face];
    // Ignora chão e teto
    if (!normal)
        return;
    // Produto escalar
    const dot = velocity.x * normal.x +
        velocity.z * normal.z;
    // Só rebate se estiver indo contra a parede
    if (dot >= 0)
        return;
    // Reflexão com elasticidade
    const reflected = {
        x: velocity.x - (1 + elasticity) * dot * normal.x,
        y: velocity.y,
        z: velocity.z - (1 + elasticity) * dot * normal.z
    };
    entity.clearVelocity();
    entity.applyImpulse(reflected);
    lastBounce.set(entity.id, tick);
}
// Atualiza os karts a cada tick
system.runInterval(() => {
    const dimension = world.getDimension("overworld");
    for (const kart of dimension.getEntities({
        type: "wgames:iron_golem_kart"
    })) {
        bounceKart(kart, 0.6);
    }
}, 1);
//# sourceMappingURL=karts_maneger.js.map