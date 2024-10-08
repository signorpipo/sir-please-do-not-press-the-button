import { AudioSetup, Globals } from "../pp";

export class AudioLoader {
    load() {
        let manager = Globals.getAudioManager();

        {
            let audioSetup = new AudioSetup("assets/audio/music/pp/playground_ambient.mp3");
            audioSetup.myLoop = true;
            audioSetup.mySpatial = false;
            audioSetup.myVolume = 0.6;
            manager.addAudioSetup("background_music", audioSetup);
        }

        {
            let audioSetup = new AudioSetup("assets/audio/sfx/pp/collision.mp3");
            audioSetup.myRate = 1;
            audioSetup.myVolume = 0.9;
            audioSetup.myReferenceDistance = 1000;
            manager.addAudioSetup("click", audioSetup);
        }

        {
            let audioSetup = new AudioSetup("assets/audio/sfx/pp/collision.mp3");
            audioSetup.myRate = 1;
            audioSetup.myVolume = 1;
            audioSetup.myReferenceDistance = 1000;
            manager.addAudioSetup("clickEarth", audioSetup);
        }

        {
            let audioSetup = new AudioSetup("assets/audio/sfx/pp/grab.mp3");
            audioSetup.myRate = 1;
            audioSetup.myVolume = 1;
            audioSetup.myReferenceDistance = 1000;
            manager.addAudioSetup("explode", audioSetup);
        }

        {
            let audioSetup = new AudioSetup("assets/audio/sfx/alert.mp3");
            audioSetup.myRate = 1;
            audioSetup.myVolume = 1;
            audioSetup.myReferenceDistance = 1000;
            manager.addAudioSetup("alert", audioSetup);
        }

        {
            let audioSetup = new AudioSetup("assets/audio/sfx/blip.wav");
            audioSetup.myRate = 1;
            audioSetup.myVolume = 0.1;
            audioSetup.myReferenceDistance = 1000;
            audioSetup.myPool = 20;
            manager.addAudioSetup("blip", audioSetup);
        }

        {
            let audioSetup = new AudioSetup("assets/audio/sfx/accelerate.mp3");
            audioSetup.myRate = 0.75;
            audioSetup.myVolume = 1;
            audioSetup.myReferenceDistance = 5;
            audioSetup.myPool = 60;
            manager.addAudioSetup("accelerate", audioSetup);
        }
    }
}