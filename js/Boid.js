import * as THREE from 'three';

export class Boid {
    constructor(scene, aquariumSize, fishModel = null, scale = 0.3) {
        this.position = new THREE.Vector3(
            (Math.random() - 0.5) * (aquariumSize.x - 8),
            (Math.random() - 0.5) * (aquariumSize.y - 8) + 2,
            (Math.random() - 0.5) * (aquariumSize.z - 8)
        );

        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
        );
        this.acceleration = new THREE.Vector3(); 

        this.maxSpeed = 1; 
        this.maxForce = 0.1; 
        this.scale = scale;
        this.radius = scale * 2;

        this.aquariumSize = aquariumSize; 
        this.createMesh(scene, fishModel);
    }

    createMesh(scene, fishModel) {
        if (!fishModel) {
            console.warn('No se proporcionó un modelo GLB para el Boid.');
            return;
        }

        this.mesh = fishModel.clone();
        this.mesh.scale.set(this.scale, this.scale, this.scale);
        this.mesh.position.copy(this.position);
        scene.add(this.mesh);
    }

    applyForce(force) {
        this.acceleration.add(force);
    }

    separation(boids) {
        const desiredSeparation = 4 + this.radius;
        let steer = new THREE.Vector3();
        let count = 0;

        for (let other of boids) {
            let d = this.position.distanceTo(other.position);
            if (other !== this && d < desiredSeparation + other.radius) {
                let diff = new THREE.Vector3().subVectors(this.position, other.position);
                diff.normalize();
                diff.divideScalar(d);
                steer.add(diff);
                count++;
            }
        }

        if (count > 0) {
            steer.divideScalar(count);
        }

        if (steer.length() > 0) {
            steer.normalize();
            steer.multiplyScalar(this.maxSpeed);
            steer.sub(this.velocity);
            steer.clampLength(0, this.maxForce);
        }
        return steer;
    }

    alignment(boids) {
        const neighborDist = 50;
        let sum = new THREE.Vector3();
        let count = 0;

        for (let other of boids) {
            let d = this.position.distanceTo(other.position);
            if (other !== this && d < neighborDist) {
                sum.add(other.velocity);
                count++;
            }
        }

        if (count > 0) {
            sum.divideScalar(count);
            sum.normalize();
            sum.multiplyScalar(this.maxSpeed);
            let steer = new THREE.Vector3().subVectors(sum, this.velocity);
            steer.clampLength(0, this.maxForce);
            return steer;
        } else {
            return new THREE.Vector3();
        }
    }

    cohesion(boids) {
        const neighborDist = 50;
        let sum = new THREE.Vector3();
        let count = 0;

        for (let other of boids) {
            let d = this.position.distanceTo(other.position);
            if (other !== this && d < neighborDist) {
                sum.add(other.position);
                count++;
            }
        }

        if (count > 0) {
            sum.divideScalar(count);
            return this.seek(sum);
        } else {
            return new THREE.Vector3();
        }
    }

    seek(target) {
        let desired = new THREE.Vector3().subVectors(target, this.position);
        desired.normalize();
        desired.multiplyScalar(this.maxSpeed);
        let steer = new THREE.Vector3().subVectors(desired, this.velocity);
        steer.clampLength(0, this.maxForce);
        return steer;
    }

    flock(boids) {
        let sep = this.separation(boids);
        let ali = this.alignment(boids);
        let coh = this.cohesion(boids);

        sep.multiplyScalar(1.5);
        ali.multiplyScalar(1.0);
        coh.multiplyScalar(1.0);

        this.applyForce(sep);
        this.applyForce(ali);
        this.applyForce(coh);
    }

    borders() {
        const margin = 3 + this.radius;
        const boundaryForce = 0.2;

        if (this.position.x < -this.aquariumSize.x / 2 + margin) {
            this.velocity.x = Math.max(this.velocity.x + boundaryForce, 0);
        } else if (this.position.x > this.aquariumSize.x / 2 - margin) {
            this.velocity.x = Math.min(this.velocity.x - boundaryForce, 0);
        }

        if (this.position.y < -this.aquariumSize.y / 2 + margin + 3) {
            this.velocity.y = Math.max(this.velocity.y + boundaryForce, 0);
        } else if (this.position.y > this.aquariumSize.y / 2 - margin) {
            this.velocity.y = Math.min(this.velocity.y - boundaryForce, 0);
        }

        if (this.position.z < -this.aquariumSize.z / 2 + margin) {
            this.velocity.z = Math.max(this.velocity.z + boundaryForce, 0);
        } else if (this.position.z > this.aquariumSize.z / 2 - margin) {
            this.velocity.z = Math.min(this.velocity.z - boundaryForce, 0);
        }

        this.position.x = Math.max(-this.aquariumSize.x / 2 + margin, 
                           Math.min(this.aquariumSize.x / 2 - margin, this.position.x));
        this.position.y = Math.max(-this.aquariumSize.y / 2 + margin + 3, 
                           Math.min(this.aquariumSize.y / 2 - margin, this.position.y));
        this.position.z = Math.max(-this.aquariumSize.z / 2 + margin, 
                           Math.min(this.aquariumSize.z / 2 - margin, this.position.z));
    }

    update() {
        this.velocity.add(this.acceleration);
        this.velocity.clampLength(0, this.maxSpeed);
        this.position.add(this.velocity);
        this.acceleration.multiplyScalar(0);

        this.borders();

        this.mesh.position.copy(this.position);

        if (this.velocity.length() > 0.01) {
            const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 0, 1),
                this.velocity.clone().normalize()
            );
            this.mesh.quaternion.slerp(targetQuaternion, 0.1);
        }
    }
}