import { ViewComponent } from "@wonderlandengine/api";
import { EasingFunction, FSM, Globals, MathUtils, Timer, TimerState, vec3_create } from "../../pp";
import { AnalyticsUtils } from "../analytics_utils";
import { GameGlobals } from "../game_globals";

export class WinState {

    constructor(trackedHandTeleportUpdate, sirBody, sirExtras) {
        this._myTrackedHandTeleportUpdate = trackedHandTeleportUpdate;
        this._mySirBody = sirBody;
        this._mySirExtras = sirExtras;

        this._myFSM = new FSM();
        //this._myFSM.setLogEnabled(true, "  Win");

        this._myFSM.addState("init");
        this._myFSM.addState("idle");
        this._myFSM.addState("wait_dialog_hidden", this._waitDialogHiddenUpdate.bind(this));
        this._myFSM.addState("first_wait", new TimerState(1.5, "end"));
        this._myFSM.addState("fly", this._flyUpdate.bind(this));

        this._myFSM.addTransition("init", "idle", "start");
        this._myFSM.addTransition("idle", "wait_dialog_hidden", "start", this._startWin.bind(this));
        this._myFSM.addTransition("wait_dialog_hidden", "first_wait", "end");
        this._myFSM.addTransition("first_wait", "fly", "end");

        this._myFSM.addTransition("idle", "idle", "stop");
        this._myFSM.addTransition("wait_dialog_hidden", "idle", "stop", this._stopWin.bind(this));
        this._myFSM.addTransition("first_wait", "idle", "stop", this._stopWin.bind(this));
        this._myFSM.addTransition("fly", "idle", "stop", this._stopWin.bind(this));

        this._myFSM.init("init");
        this._myFSM.perform("start");

        this._mySpawnParticlesTimer = new Timer(0);
        this._myAccelerationTimer = new Timer(10);
        this._mySecondAccelerationTimer = new Timer(2);
        this._myMaxParticleTimer = new Timer(9);

        this._myToMaxPulseTimer = new Timer(10);
        this._myKeepMaxPulseTimer = new Timer(1);
        this._myFadePulseTimer = new Timer(2);
        this._myFirstParticleSpawned = false;

        this._myCurrentAcceleration = 0;

        this._myCurrentSpeed = 0;
        this._myTakeOffSpeed = 0.075;

        this._myMaxAudioTimer = new Timer(0);
        this._mySyncAudioWithParticlesTimer = new Timer(4.5);
        this._myAccelerateAudioPlayer = Globals.getAudioManager().createAudioPlayer("accelerate");

        let sounds = [];
        for (let i = 0; i < this._myAccelerateAudioPlayer._myAudio._pool; i++) {
            let sound = this._myAccelerateAudioPlayer._myAudio._inactiveSound();
            sound._ended = false;
            sounds.push(sound);
        }

        for (let sound of sounds) {
            sound._ended = true;
        }

        this._myViewComponents = [Globals.getPlayerObjects().myEyeLeft.pp_getComponent(ViewComponent), Globals.getPlayerObjects().myEyeRight.pp_getComponent(ViewComponent), Globals.getPlayerObjects().myCameraNonXR.pp_getComponent(ViewComponent)];
        this._myFarUpdated = false;

        this._myFlySeen = false;
    }

    start(fsm) {
        this._myFSM.perform("start");
    }

    end(fsm) {
        this._myFSM.perform("stop");
    }

    update(dt, fsm) {
        this._myTrackedHandTeleportUpdate();

        this._myFSM.update(dt);
    }

    _startWin() {
        GameGlobals.myButtonHand.stopButtonHand();

        this._mySpawnParticlesTimer.start(0);
        this._myMaxAudioTimer.start(0);
        this._mySyncAudioWithParticlesTimer.start();
        this._myAccelerationTimer.start();
        this._mySecondAccelerationTimer.start();
        this._myMaxParticleTimer.start();
        this._myCurrentSpeed = 0;
        this._myCurrentAcceleration = 0;

        this._myToMaxPulseTimer.reset();
        this._myKeepMaxPulseTimer.reset();
        this._myFadePulseTimer.reset();
        this._myFirstParticleSpawned = false;

        this._myFarUpdated = false;
        this._myFlySeen = false;
    }

    _stopWin() {
        this._myAccelerateAudioPlayer.stop();

        for (let viewComponent of this._myViewComponents) {
            viewComponent.far = 100;
        }
    }

    _flyUpdate(dt, fsm) {
        if (!this._myFarUpdated) {
            if (this._mySirBody.pp_getPosition()[1] > 10) {
                this._myFarUpdated = true;

                for (let viewComponent of this._myViewComponents) {
                    viewComponent.far = 800;
                }
            }
        }

        if (!this._myFlySeen) {
            if (this._mySirBody.pp_getPosition()[1] > 100) {
                this._myFlySeen = true;

                AnalyticsUtils.sendEventOnce("win_fly_seen", false);
            }
        }

        if (this._mySirBody.pp_getPosition()[1] < 2000) {
            if (this._myAccelerationTimer.getPercentage() < 1) {
                this._myCurrentAcceleration = MathUtils.interpolate(0.001, 2, this._myAccelerationTimer.getPercentage(), easeInExpo);
            }

            this._myAccelerationTimer.update(dt);
            this._myMaxParticleTimer.update(dt);

            if (this._myAccelerationTimer.isDone()) {
                this._mySecondAccelerationTimer.update(dt);
                this._myCurrentAcceleration += MathUtils.interpolate(2, 10, this._mySecondAccelerationTimer.getPercentage(), EasingFunction.linear) * dt;
            }

            this._myCurrentSpeed += this._myCurrentAcceleration * dt;
            this._myCurrentSpeed = Math.min(this._myCurrentSpeed, 500);

            GameGlobals.myButtonHand.object.pp_translate(vec3_create(0, this._myCurrentSpeed * dt, 0));
            this._mySirBody.pp_translate(vec3_create(0, this._myCurrentSpeed * dt, 0));
            this._mySirExtras.pp_translate(vec3_create(0, this._myCurrentSpeed * dt, 0));

            this._myMaxAudioTimer.update(dt);
            this._mySyncAudioWithParticlesTimer.update(dt);
            this._mySpawnParticlesTimer.update(dt);

            let particlesSpawned = false;
            if (this._mySpawnParticlesTimer.isDone()) {
                GameGlobals.myHandParticlesSpawner._myScaleMultiplier = 0.010 * Math.pp_mapToRange(this._myMaxParticleTimer.getPercentage(), 0, 1, 0.75, 1.5);
                GameGlobals.myHandParticlesSpawner._myVerticalSpeedMultiplier = -1 * Math.pp_mapToRange(this._myMaxParticleTimer.getPercentage(), 0, 1, 0.5, 1.25);
                GameGlobals.myHandParticlesSpawner.spawn(GameGlobals.myButtonHand.object.pp_getPosition());

                this._mySpawnParticlesTimer.start(MathUtils.interpolate(1, 0.01, this._myMaxParticleTimer.getPercentage(), easeTimer));
                particlesSpawned = true;
            }

            if (particlesSpawned || this._mySyncAudioWithParticlesTimer.isDone()) {
                if (this._mySirBody.pp_getPosition()[1] < 200) {
                    if (this._myMaxAudioTimer.isDone()) {
                        this._myMaxAudioTimer.start(MathUtils.interpolate(0.6, 0.075, this._myMaxParticleTimer.getPercentage(), easeSound));

                        this._myAccelerateAudioPlayer.setPosition(GameGlobals.myButtonHand.object.pp_getPosition());
                        this._myAccelerateAudioPlayer.play();
                    }
                }
            }

            let maxIntensity = 0.8;
            if (!this._myFirstParticleSpawned && particlesSpawned) {
                this._myFirstParticleSpawned = true;
                this._myToMaxPulseTimer.start();
            } else if (this._myToMaxPulseTimer.isRunning()) {
                this._myToMaxPulseTimer.update(dt);
                let pulseIntensity = MathUtils.interpolate(0.02, maxIntensity, this._myToMaxPulseTimer.getPercentage(), EasingFunction.easeIn);
                Globals.getLeftGamepad().pulse(pulseIntensity, 0);
                Globals.getRightGamepad().pulse(pulseIntensity, 0);

                if (this._myToMaxPulseTimer.isDone()) {
                    this._myKeepMaxPulseTimer.start();
                }
            } else if (this._myKeepMaxPulseTimer.isRunning()) {
                this._myKeepMaxPulseTimer.update(dt);
                Globals.getLeftGamepad().pulse(maxIntensity, 0);
                Globals.getRightGamepad().pulse(maxIntensity, 0);

                if (this._myKeepMaxPulseTimer.isDone()) {
                    this._myFadePulseTimer.start();
                }
            } else if (this._myFadePulseTimer.isRunning()) {
                this._myFadePulseTimer.update(dt);
                let pulseIntensity = MathUtils.interpolate(maxIntensity, 0, this._myFadePulseTimer.getPercentage(), EasingFunction.easeOut);
                Globals.getLeftGamepad().pulse(pulseIntensity, 0);
                Globals.getRightGamepad().pulse(pulseIntensity, 0);
            }
        }
    }

    _waitDialogHiddenUpdate(dt, fsm) {
        if (GameGlobals.mySirDialog.isHidden()) {
            this._myFSM.perform("end");
        }
    }
}

function easeInExpo(x) {
    return x === 0 ? 0 : Math.pow(3.5, 10 * x - 10);
}

function easeTimer(x) {
    return 1 - (1 - x) * (1 - x);
}

function easeSound(x) {
    return Math.sin((x * Math.PI) / 2);

}